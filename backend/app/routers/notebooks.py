from __future__ import annotations

from urllib.parse import quote
import uuid

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.database import DatabaseContext
from app.deps import get_db_context, get_session
from app.models import AttachmentModel, NotebookModel, NoteModel
from app.schemas import (
    DeleteResponse,
    NotebookCreateRequest,
    NotebookResponse,
    NotebooksResponse,
    NotebookUpdateRequest,
    utc_now_iso,
)
from app.services.markdown_sync import (
    format_notebook_markdown,
    remove_notebook_markdown,
    sync_notebook_markdown,
)
from app.services.note_service import (
    get_notebook_by_id,
    get_notebooks_with_stats,
    get_notes_for_notebook,
    remove_attachment_files,
)
from app.utils.tags import slugify_notebook

router = APIRouter(prefix="/api/notebooks", tags=["notebooks"])


@router.get("", response_model=NotebooksResponse)
@router.get("/", response_model=NotebooksResponse, include_in_schema=False)
def list_notebooks(session: Session = Depends(get_session)) -> NotebooksResponse:
    return NotebooksResponse(notebooks=get_notebooks_with_stats(session))


@router.post("", response_model=NotebookResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=NotebookResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create_notebook(
    body: NotebookCreateRequest,
    session: Session = Depends(get_session),
    db_ctx: DatabaseContext = Depends(get_db_context),
) -> NotebookResponse:
    existing_slugs = set(session.scalars(select(NotebookModel.slug)).all())
    slug = slugify_notebook(body.name, existing_slugs)
    nb_id = str(uuid.uuid4())
    now = utc_now_iso()

    model = NotebookModel(
        id=nb_id,
        name=body.name,
        slug=slug,
        description=body.description,
        icon=body.icon,
        avatar_color=body.avatar_color,
        is_system=0,
        is_pinned=1 if body.is_pinned else 0,
        created_at=now,
        updated_at=now,
    )
    session.add(model)
    session.commit()

    sync_notebook_markdown(session, db_ctx.paths.markdown_dir, nb_id)
    notebook = get_notebook_by_id(session, nb_id)
    assert notebook is not None
    return NotebookResponse(notebook=notebook)


@router.patch("/{notebook_id}", response_model=NotebookResponse)
def update_notebook(
    notebook_id: str,
    body: NotebookUpdateRequest,
    session: Session = Depends(get_session),
    db_ctx: DatabaseContext = Depends(get_db_context),
) -> NotebookResponse:
    model = session.get(NotebookModel, notebook_id)
    if model is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="笔记本不存在")

    is_system = model.is_system == 1
    old_slug = model.slug
    next_name = body.name if body.name is not None else model.name
    next_desc = body.description if body.description is not None else model.description
    next_icon = model.icon if is_system else (body.icon if body.icon is not None else model.icon)
    next_color = body.avatar_color if body.avatar_color is not None else model.avatar_color
    next_pinned = 1 if is_system else (1 if (body.is_pinned if body.is_pinned is not None else model.is_pinned == 1) else 0)

    next_slug = old_slug
    if not is_system and body.name is not None and body.name != model.name:
        other_slugs = set(
            session.scalars(select(NotebookModel.slug).where(NotebookModel.id != notebook_id)).all()
        )
        next_slug = slugify_notebook(next_name, other_slugs)

    model.name = next_name
    model.slug = next_slug
    model.description = next_desc
    model.icon = next_icon
    model.avatar_color = next_color
    model.is_pinned = next_pinned
    model.updated_at = utc_now_iso()
    session.commit()

    if next_slug != old_slug:
        remove_notebook_markdown(db_ctx.paths.markdown_dir, old_slug)
    sync_notebook_markdown(session, db_ctx.paths.markdown_dir, notebook_id)

    updated = get_notebook_by_id(session, notebook_id)
    assert updated is not None
    return NotebookResponse(notebook=updated)


@router.delete("/{notebook_id}", response_model=DeleteResponse)
def delete_notebook(
    notebook_id: str,
    session: Session = Depends(get_session),
    db_ctx: DatabaseContext = Depends(get_db_context),
) -> DeleteResponse:
    model = session.get(NotebookModel, notebook_id)
    if model is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="笔记本不存在")
    if model.is_system == 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="系统默认 Saved Messages 笔记本不可删除",
        )

    old_slug = model.slug
    att_filenames = list(
        session.scalars(
            select(AttachmentModel.filename)
            .join(NoteModel, NoteModel.id == AttachmentModel.note_id)
            .where(NoteModel.notebook_id == notebook_id)
        ).all()
    )

    session.execute(delete(NotebookModel).where(NotebookModel.id == notebook_id))
    session.commit()

    remove_attachment_files(db_ctx.paths.uploads_dir, att_filenames)
    remove_notebook_markdown(db_ctx.paths.markdown_dir, old_slug)
    return DeleteResponse(deleted=True, id=notebook_id)


@router.get("/{notebook_id}/export")
def export_notebook(
    notebook_id: str,
    session: Session = Depends(get_session),
) -> Response:
    notebook = get_notebook_by_id(session, notebook_id)
    if notebook is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="笔记本不存在")

    notes = get_notes_for_notebook(session, notebook_id)
    md = format_notebook_markdown(notebook, notes)
    filename = f"{notebook.slug}.md"
    encoded = quote(filename, safe="")
    return Response(
        content=md,
        media_type="text/markdown; charset=utf-8",
        headers={
            "Content-Disposition": f"attachment; filename=\"notebook.md\"; filename*=UTF-8''{encoded}"
        },
    )
