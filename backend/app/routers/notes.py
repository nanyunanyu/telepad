from __future__ import annotations

from pathlib import Path
import shutil
from urllib.parse import quote
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import delete, func, select, update
from sqlalchemy.orm import Session

from app.database import DatabaseContext
from app.deps import get_db_context, get_session
from app.models import AttachmentModel, NotebookModel, NoteModel, NoteTagModel
from app.schemas import (
    DeleteResponse,
    ForwardNoteResponse,
    NoteCheckboxRequest,
    NoteCreateRequest,
    NoteForwardRequest,
    NotePinRequest,
    NoteResponse,
    NotesResponse,
    NoteUpdateRequest,
    SearchResponse,
    SearchResultOut,
    TagsResponse,
    TagSummaryOut,
    utc_now_iso,
)
from app.services.markdown_sync import format_single_note_markdown, sync_notebook_markdown
from app.services.note_service import (
    get_note_by_id,
    get_notebook_by_id,
    get_notes_for_notebook,
    remove_attachment_files,
    sync_note_tags,
)
from app.utils.tags import build_search_snippet, toggle_checkbox_at_index

router = APIRouter(prefix="/api/notes", tags=["notes"])


@router.get("/search", response_model=SearchResponse)
def search_notes(
    q: str = Query(default=""),
    notebook_id: str | None = Query(default=None, alias="notebookId"),
    session: Session = Depends(get_session),
) -> SearchResponse:
    query_text = q.strip()
    if not query_text:
        return SearchResponse(results=[])

    pattern = f"%{query_text.lower()}%"
    att_count_sq = (
        select(func.count(AttachmentModel.id))
        .where(AttachmentModel.note_id == NoteModel.id)
        .correlate(NoteModel)
        .scalar_subquery()
        .label("att_count")
    )

    stmt = (
        select(
            NoteModel.id,
            NoteModel.notebook_id,
            NoteModel.content,
            NoteModel.created_at,
            NoteModel.is_pinned,
            NotebookModel.name.label("notebook_name"),
            NotebookModel.icon.label("notebook_icon"),
            NotebookModel.avatar_color.label("notebook_avatar_color"),
            att_count_sq,
        )
        .join(NotebookModel, NotebookModel.id == NoteModel.notebook_id)
        .where(func.lower(NoteModel.content).like(pattern))
    )
    if notebook_id:
        stmt = stmt.where(NoteModel.notebook_id == notebook_id)
    stmt = stmt.order_by(NoteModel.created_at.desc()).limit(100)

    rows = session.execute(stmt).all()
    note_ids = [r.id for r in rows]
    tag_map: dict[str, list[str]] = {}
    if note_ids:
        tag_rows = session.execute(
            select(NoteTagModel.note_id, NoteTagModel.tag).where(NoteTagModel.note_id.in_(note_ids))
        ).all()
        for n_id, tag in tag_rows:
            tag_map.setdefault(n_id, []).append(tag)

    results = [
        SearchResultOut(
            id=r.id,
            notebook_id=r.notebook_id,
            notebook_name=r.notebook_name,
            notebook_icon=r.notebook_icon,
            notebook_avatar_color=r.notebook_avatar_color,
            content=r.content,
            snippet=build_search_snippet(r.content, query_text),
            created_at=r.created_at,
            is_pinned=r.is_pinned == 1,
            has_images=int(r.att_count or 0) > 0,
            tags=tag_map.get(r.id, []),
        )
        for r in rows
    ]
    return SearchResponse(results=results)


@router.get("/tags", response_model=TagsResponse)
def list_tags(
    notebook_id: str | None = Query(default=None, alias="notebookId"),
    session: Session = Depends(get_session),
) -> TagsResponse:
    tag_col = func.min(NoteTagModel.tag).label("tag")
    count_col = func.count().label("count")

    if notebook_id:
        stmt = (
            select(tag_col, count_col)
            .join(NoteModel, NoteModel.id == NoteTagModel.note_id)
            .where(NoteModel.notebook_id == notebook_id)
            .group_by(NoteTagModel.tag_lower)
            .order_by(count_col.desc(), tag_col.asc())
        )
    else:
        stmt = (
            select(tag_col, count_col)
            .group_by(NoteTagModel.tag_lower)
            .order_by(count_col.desc(), tag_col.asc())
        )

    rows = session.execute(stmt).all()
    return TagsResponse(tags=[TagSummaryOut(tag=r.tag, count=int(r.count)) for r in rows])


@router.get("", response_model=NotesResponse)
@router.get("/", response_model=NotesResponse, include_in_schema=False)
def list_notes(
    notebook_id: str | None = Query(default=None, alias="notebookId"),
    tag: str | None = Query(default=None),
    pinned_only: bool = Query(default=False, alias="pinnedOnly"),
    session: Session = Depends(get_session),
) -> NotesResponse:
    if not notebook_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="缺少 notebookId 参数")
    cleaned_tag = tag.strip() if tag and tag.strip() else None
    notes = get_notes_for_notebook(session, notebook_id, tag=cleaned_tag, pinned_only=pinned_only)
    return NotesResponse(notes=notes)


@router.post("", response_model=NoteResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=NoteResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create_note(
    body: NoteCreateRequest,
    session: Session = Depends(get_session),
    db_ctx: DatabaseContext = Depends(get_db_context),
) -> NoteResponse:
    if not body.content.strip() and len(body.attachment_ids) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="笔记内容和图片不能同时为空",
        )

    notebook = session.get(NotebookModel, body.notebook_id)
    if notebook is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="目标笔记本不存在")

    valid_reply_to: str | None = None
    if body.reply_to_id:
        target = session.get(NoteModel, body.reply_to_id)
        if target is not None and target.notebook_id == body.notebook_id:
            valid_reply_to = body.reply_to_id

    note_id = str(uuid.uuid4())
    now = utc_now_iso()

    try:
        model = NoteModel(
            id=note_id,
            notebook_id=body.notebook_id,
            content=body.content,
            reply_to_id=valid_reply_to,
            is_pinned=0,
            pinned_at=None,
            created_at=now,
            updated_at=now,
            edited_at=None,
        )
        session.add(model)
        session.flush()
        sync_note_tags(session, note_id, body.content)

        if body.attachment_ids:
            session.execute(
                update(AttachmentModel)
                .where(
                    AttachmentModel.id.in_(body.attachment_ids),
                    AttachmentModel.note_id.is_(None),
                )
                .values(note_id=note_id)
            )

        notebook.updated_at = now
        session.commit()
    except Exception:
        session.rollback()
        raise

    sync_notebook_markdown(session, db_ctx.paths.markdown_dir, body.notebook_id)
    note = get_note_by_id(session, note_id)
    assert note is not None
    return NoteResponse(note=note)


@router.patch("/{note_id}", response_model=NoteResponse)
def update_note(
    note_id: str,
    body: NoteUpdateRequest,
    session: Session = Depends(get_session),
    db_ctx: DatabaseContext = Depends(get_db_context),
) -> NoteResponse:
    existing = get_note_by_id(session, note_id)
    if existing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="笔记不存在")

    next_content = body.content if body.content is not None else existing.content
    keep_att_ids = body.attachment_ids
    remaining_att_count = (
        len(keep_att_ids) if keep_att_ids is not None else len(existing.attachments)
    )

    if not next_content.strip() and remaining_att_count == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="笔记内容和图片不能同时为空",
        )

    now = utc_now_iso()
    removed_filenames: list[str] = []

    try:
        model = session.get(NoteModel, note_id)
        assert model is not None
        model.content = next_content
        model.updated_at = now
        model.edited_at = now
        sync_note_tags(session, note_id, next_content)

        if keep_att_ids is not None:
            keep_set = set(keep_att_ids)
            for old_att in existing.attachments:
                if old_att.id not in keep_set:
                    session.execute(delete(AttachmentModel).where(AttachmentModel.id == old_att.id))
                    removed_filenames.append(old_att.filename)
            if keep_att_ids:
                session.execute(
                    update(AttachmentModel)
                    .where(
                        AttachmentModel.id.in_(keep_att_ids),
                        AttachmentModel.note_id.is_(None),
                    )
                    .values(note_id=note_id)
                )

        session.execute(
            update(NotebookModel)
            .where(NotebookModel.id == existing.notebook_id)
            .values(updated_at=now)
        )
        session.commit()
    except Exception:
        session.rollback()
        raise

    if removed_filenames:
        remove_attachment_files(db_ctx.paths.uploads_dir, removed_filenames)

    sync_notebook_markdown(session, db_ctx.paths.markdown_dir, existing.notebook_id)
    updated = get_note_by_id(session, note_id)
    assert updated is not None
    return NoteResponse(note=updated)


@router.patch("/{note_id}/pin", response_model=NoteResponse)
def toggle_pin_note(
    note_id: str,
    body: NotePinRequest,
    session: Session = Depends(get_session),
    db_ctx: DatabaseContext = Depends(get_db_context),
) -> NoteResponse:
    model = session.get(NoteModel, note_id)
    if model is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="笔记不存在")

    now = utc_now_iso()
    model.is_pinned = 1 if body.is_pinned else 0
    model.pinned_at = now if body.is_pinned else None
    model.updated_at = now
    session.commit()

    sync_notebook_markdown(session, db_ctx.paths.markdown_dir, model.notebook_id)
    updated = get_note_by_id(session, note_id)
    assert updated is not None
    return NoteResponse(note=updated)


@router.patch("/{note_id}/checkbox", response_model=NoteResponse)
def toggle_note_checkbox(
    note_id: str,
    body: NoteCheckboxRequest,
    session: Session = Depends(get_session),
    db_ctx: DatabaseContext = Depends(get_db_context),
) -> NoteResponse:
    model = session.get(NoteModel, note_id)
    if model is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="笔记不存在")

    next_content, toggled = toggle_checkbox_at_index(model.content, body.task_index)
    if not toggled:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="未找到对应的待办项")

    model.content = next_content
    model.updated_at = utc_now_iso()
    session.commit()

    sync_notebook_markdown(session, db_ctx.paths.markdown_dir, model.notebook_id)
    updated = get_note_by_id(session, note_id)
    assert updated is not None
    return NoteResponse(note=updated)


@router.post("/{note_id}/forward", response_model=ForwardNoteResponse)
def forward_note(
    note_id: str,
    body: NoteForwardRequest,
    response: Response,
    session: Session = Depends(get_session),
    db_ctx: DatabaseContext = Depends(get_db_context),
) -> ForwardNoteResponse:
    existing = get_note_by_id(session, note_id)
    if existing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="笔记不存在")

    target_nb = session.get(NotebookModel, body.target_notebook_id)
    if target_nb is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="目标笔记本不存在")

    now = utc_now_iso()

    if body.mode == "move":
        if body.target_notebook_id == existing.notebook_id:
            return ForwardNoteResponse(note=existing, mode="move")

        try:
            session.execute(
                update(NoteModel)
                .where(NoteModel.id == note_id)
                .values(
                    notebook_id=body.target_notebook_id,
                    reply_to_id=None,
                    is_pinned=0,
                    pinned_at=None,
                    updated_at=now,
                )
            )
            target_nb.updated_at = now
            session.commit()
        except Exception:
            session.rollback()
            raise

        sync_notebook_markdown(session, db_ctx.paths.markdown_dir, existing.notebook_id)
        sync_notebook_markdown(session, db_ctx.paths.markdown_dir, body.target_notebook_id)
        moved = get_note_by_id(session, note_id)
        assert moved is not None
        return ForwardNoteResponse(note=moved, mode="move")

    # Copy mode: duplicate note & attachment files on disk so deletions stay independent
    new_note_id = str(uuid.uuid4())
    copied_files: list[str] = []

    try:
        copied_model = NoteModel(
            id=new_note_id,
            notebook_id=body.target_notebook_id,
            content=existing.content,
            reply_to_id=None,
            is_pinned=0,
            pinned_at=None,
            created_at=now,
            updated_at=now,
            edited_at=None,
        )
        session.add(copied_model)
        session.flush()
        sync_note_tags(session, new_note_id, existing.content)

        for att in existing.attachments:
            src_path = db_ctx.paths.uploads_dir / Path(att.filename).name
            if not src_path.exists():
                continue
            ext = Path(att.filename).suffix
            new_filename = f"{uuid.uuid4()}{ext}"
            dst_path = db_ctx.paths.uploads_dir / new_filename
            shutil.copy2(src_path, dst_path)
            copied_files.append(new_filename)
            session.add(
                AttachmentModel(
                    id=str(uuid.uuid4()),
                    note_id=new_note_id,
                    filename=new_filename,
                    original_name=att.original_name,
                    mime_type=att.mime_type,
                    size=att.size,
                    created_at=now,
                )
            )

        target_nb.updated_at = now
        session.commit()
    except Exception:
        session.rollback()
        remove_attachment_files(db_ctx.paths.uploads_dir, copied_files)
        raise

    sync_notebook_markdown(session, db_ctx.paths.markdown_dir, body.target_notebook_id)
    copied = get_note_by_id(session, new_note_id)
    assert copied is not None
    response.status_code = status.HTTP_201_CREATED
    return ForwardNoteResponse(note=copied, mode="copy")


@router.delete("/{note_id}", response_model=DeleteResponse)
def delete_note(
    note_id: str,
    session: Session = Depends(get_session),
    db_ctx: DatabaseContext = Depends(get_db_context),
) -> DeleteResponse:
    existing = get_note_by_id(session, note_id)
    if existing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="笔记不存在")

    filenames = [a.filename for a in existing.attachments]
    session.execute(delete(NoteModel).where(NoteModel.id == note_id))
    session.commit()

    remove_attachment_files(db_ctx.paths.uploads_dir, filenames)
    sync_notebook_markdown(session, db_ctx.paths.markdown_dir, existing.notebook_id)
    return DeleteResponse(deleted=True, id=note_id)


@router.get("/{note_id}/export")
def export_single_note(
    note_id: str,
    session: Session = Depends(get_session),
) -> Response:
    note = get_note_by_id(session, note_id)
    if note is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="笔记不存在")

    notebook = get_notebook_by_id(session, note.notebook_id)
    md = format_single_note_markdown(note, notebook.name if notebook else None)
    date_stamp = note.created_at[:10]
    filename = f"telepad-note-{date_stamp}-{note.id[:6]}.md"
    encoded = quote(filename, safe="")
    return Response(
        content=md,
        media_type="text/markdown; charset=utf-8",
        headers={
            "Content-Disposition": f"attachment; filename=\"note.md\"; filename*=UTF-8''{encoded}"
        },
    )
