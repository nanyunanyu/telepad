from __future__ import annotations

import base64
import json
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import delete, func, select, update
from sqlalchemy.orm import Session

from app.database import DatabaseContext
from app.deps import get_db_context, get_session
from app.models import AttachmentModel, NotebookModel, NoteModel, NoteTagModel
from app.schemas import (
    BackupAttachmentRecord,
    BackupImportRequest,
    BackupImportResponse,
    BackupNotebookRecord,
    BackupNoteRecord,
    BackupPayload,
    StorageInfoOut,
    utc_now_iso,
)
from app.services.markdown_sync import sync_all_notebooks_markdown
from app.services.note_service import (
    SAVED_MESSAGES_ID,
    remove_attachment_files,
    sync_note_tags,
)
from app.utils.tags import slugify_notebook

router = APIRouter(prefix="/api/backup", tags=["backup"])


@router.get("/info", response_model=StorageInfoOut)
def get_storage_info(
    session: Session = Depends(get_session),
    db_ctx: DatabaseContext = Depends(get_db_context),
) -> StorageInfoOut:
    nb_count = session.scalar(select(func.count(NotebookModel.id))) or 0
    note_count = session.scalar(select(func.count(NoteModel.id))) or 0
    att_count = (
        session.scalar(
            select(func.count(AttachmentModel.id)).where(AttachmentModel.note_id.is_not(None))
        )
        or 0
    )
    return StorageInfoOut(
        data_dir=str(db_ctx.paths.data_dir),
        db_path=str(db_ctx.paths.db_path),
        uploads_dir=str(db_ctx.paths.uploads_dir),
        markdown_dir=str(db_ctx.paths.markdown_dir),
        notebook_count=int(nb_count),
        note_count=int(note_count),
        attachment_count=int(att_count),
    )


@router.get("/export")
def export_backup(
    include_images: bool = Query(default=True, alias="includeImages"),
    session: Session = Depends(get_session),
    db_ctx: DatabaseContext = Depends(get_db_context),
) -> Response:
    notebooks = session.scalars(select(NotebookModel).order_by(NotebookModel.created_at.asc())).all()
    notes = session.scalars(select(NoteModel).order_by(NoteModel.created_at.asc())).all()
    att_models = session.scalars(
        select(AttachmentModel)
        .where(AttachmentModel.note_id.is_not(None))
        .order_by(AttachmentModel.created_at.asc())
    ).all()

    attachments: list[BackupAttachmentRecord] = []
    for att in att_models:
        safe_name = Path(att.filename).name
        data_b64: str | None = None
        if include_images:
            file_path = db_ctx.paths.uploads_dir / safe_name
            if file_path.exists():
                data_b64 = base64.b64encode(file_path.read_bytes()).decode("ascii")
        attachments.append(
            BackupAttachmentRecord(
                id=att.id,
                note_id=att.note_id,
                filename=safe_name,
                original_name=att.original_name,
                mime_type=att.mime_type,
                size=att.size,
                created_at=att.created_at,
                data_base64=data_b64,
            )
        )

    payload = BackupPayload(
        version=1,
        app="telepad",
        exported_at=utc_now_iso(),
        notebooks=[
            BackupNotebookRecord(
                id=nb.id,
                name=nb.name,
                slug=nb.slug,
                description=nb.description,
                icon=nb.icon,
                avatar_color=nb.avatar_color,  # type: ignore[arg-type]
                is_system=nb.is_system == 1,
                is_pinned=nb.is_pinned == 1,
                created_at=nb.created_at,
                updated_at=nb.updated_at,
            )
            for nb in notebooks
        ],
        notes=[
            BackupNoteRecord(
                id=n.id,
                notebook_id=n.notebook_id,
                content=n.content,
                reply_to_id=n.reply_to_id,
                is_pinned=n.is_pinned == 1,
                pinned_at=n.pinned_at,
                created_at=n.created_at,
                updated_at=n.updated_at,
                edited_at=n.edited_at,
            )
            for n in notes
        ],
        attachments=attachments,
    )

    stamp = utc_now_iso()[:10]
    filename = f"telepad-backup-{stamp}.json"
    body_json = json.dumps(
        payload.model_dump(by_alias=True, exclude_none=False),
        ensure_ascii=False,
        indent=2,
    )
    return Response(
        content=body_json,
        media_type="application/json; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/import", response_model=BackupImportResponse)
def import_backup(
    body: BackupImportRequest,
    session: Session = Depends(get_session),
    db_ctx: DatabaseContext = Depends(get_db_context),
) -> BackupImportResponse:
    mode = body.mode
    payload = body.payload
    old_files_to_remove: list[str] = []

    if mode == "replace":
        old_files_to_remove = list(session.scalars(select(AttachmentModel.filename)).all())

    imported_notebooks = 0
    imported_notes = 0
    imported_attachments = 0
    restored_files: set[str] = set()
    newly_written_files: list[str] = []

    try:
        if mode == "replace":
            session.execute(delete(AttachmentModel))
            session.execute(delete(NoteTagModel))
            session.execute(delete(NoteModel))
            session.execute(delete(NotebookModel))
            session.flush()

        existing_nb_rows = session.execute(select(NotebookModel.id, NotebookModel.slug)).all()
        existing_slugs = {row.slug for row in existing_nb_rows}
        existing_nb_ids = {row.id for row in existing_nb_rows}

        for nb in payload.notebooks:
            if nb.id in existing_nb_ids:
                continue
            safe_slug = (
                slugify_notebook(nb.name, existing_slugs)
                if nb.slug in existing_slugs
                else nb.slug
            )
            existing_slugs.add(safe_slug)
            existing_nb_ids.add(nb.id)
            session.add(
                NotebookModel(
                    id=nb.id,
                    name=nb.name,
                    slug=safe_slug,
                    description=nb.description,
                    icon=nb.icon,
                    avatar_color=nb.avatar_color,
                    is_system=1 if nb.is_system else 0,
                    is_pinned=1 if nb.is_pinned else 0,
                    created_at=nb.created_at,
                    updated_at=nb.updated_at,
                )
            )
            imported_notebooks += 1

        # Always ensure Saved Messages exists after replace
        if SAVED_MESSAGES_ID not in existing_nb_ids:
            now = utc_now_iso()
            saved_slug = slugify_notebook("saved-messages", existing_slugs)
            existing_slugs.add(saved_slug)
            existing_nb_ids.add(SAVED_MESSAGES_ID)
            session.add(
                NotebookModel(
                    id=SAVED_MESSAGES_ID,
                    name="Saved Messages",
                    slug=saved_slug,
                    description="随时随地发送灵感、待办与截图。",
                    icon="saved-messages",
                    avatar_color="blue",
                    is_system=1,
                    is_pinned=1,
                    created_at=now,
                    updated_at=now,
                )
            )

        session.flush()

        existing_note_ids = set(session.scalars(select(NoteModel.id)).all())
        pending_replies: list[tuple[str, str]] = []
        inserted_notes: list[tuple[str, str]] = []

        # Insert notes without reply_to_id first so foreign keys never fail on order
        for note in payload.notes:
            if note.id in existing_note_ids or note.notebook_id not in existing_nb_ids:
                continue
            session.add(
                NoteModel(
                    id=note.id,
                    notebook_id=note.notebook_id,
                    content=note.content,
                    reply_to_id=None,
                    is_pinned=1 if note.is_pinned else 0,
                    pinned_at=note.pinned_at,
                    created_at=note.created_at,
                    updated_at=note.updated_at,
                    edited_at=note.edited_at,
                )
            )
            existing_note_ids.add(note.id)
            inserted_notes.append((note.id, note.content))
            if note.reply_to_id:
                pending_replies.append((note.id, note.reply_to_id))
            imported_notes += 1

        session.flush()

        for note_id, note_content in inserted_notes:
            sync_note_tags(session, note_id, note_content)

        for note_id, reply_to_id in pending_replies:
            if reply_to_id in existing_note_ids:
                session.execute(
                    update(NoteModel).where(NoteModel.id == note_id).values(reply_to_id=reply_to_id)
                )

        existing_att_ids = set(session.scalars(select(AttachmentModel.id)).all())
        db_ctx.paths.uploads_dir.mkdir(parents=True, exist_ok=True)

        for att in payload.attachments:
            if not att.note_id or att.note_id not in existing_note_ids:
                continue
            safe_filename = Path(att.filename).name
            if not safe_filename:
                continue
            if att.data_base64:
                try:
                    raw_bytes = base64.b64decode(att.data_base64)
                except Exception as exc:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="备份文件中的图片 Base64 数据无效",
                    ) from exc
                target_path = db_ctx.paths.uploads_dir / safe_filename
                existed_before = target_path.exists()
                target_path.write_bytes(raw_bytes)
                restored_files.add(safe_filename)
                if not existed_before:
                    newly_written_files.append(safe_filename)

            if att.id in existing_att_ids:
                continue
            existing_att_ids.add(att.id)
            session.add(
                AttachmentModel(
                    id=att.id,
                    note_id=att.note_id,
                    filename=safe_filename,
                    original_name=att.original_name,
                    mime_type=att.mime_type,
                    size=att.size,
                    created_at=att.created_at,
                )
            )
            imported_attachments += 1

        session.commit()
    except Exception:
        session.rollback()
        remove_attachment_files(db_ctx.paths.uploads_dir, newly_written_files)
        raise

    if mode == "replace":
        to_delete = [f for f in old_files_to_remove if Path(f).name not in restored_files]
        remove_attachment_files(db_ctx.paths.uploads_dir, to_delete)

    sync_all_notebooks_markdown(session, db_ctx.paths.markdown_dir)
    return BackupImportResponse(
        success=True,
        mode=mode,
        imported_notebooks=imported_notebooks,
        imported_notes=imported_notes,
        imported_attachments=imported_attachments,
    )
