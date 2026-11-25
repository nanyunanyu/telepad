from __future__ import annotations

from pathlib import Path
from typing import Iterable
from urllib.parse import quote

from sqlalchemy import delete, func, literal_column, select
from sqlalchemy.orm import Session

from app.models import AttachmentModel, NotebookModel, NoteModel, NoteTagModel
from app.schemas import AttachmentOut, AvatarColor, NotebookOut, NoteOut, ReplyPreviewOut
from app.utils.tags import build_plain_preview, extract_tags

SAVED_MESSAGES_ID = "saved-messages"


def sync_note_tags(session: Session, note_id: str, content: str) -> list[str]:
    tags = extract_tags(content)
    session.execute(delete(NoteTagModel).where(NoteTagModel.note_id == note_id))
    for tag in tags:
        session.add(NoteTagModel(note_id=note_id, tag=tag, tag_lower=tag.lower()))
    return tags


def map_attachment(att: AttachmentModel) -> AttachmentOut:
    return AttachmentOut(
        id=att.id,
        note_id=att.note_id,
        filename=att.filename,
        original_name=att.original_name,
        mime_type=att.mime_type,
        size=att.size,
        url=f"/uploads/{quote(att.filename, safe='')}",
        created_at=att.created_at,
    )


def _notebook_stats_query():
    note_count_sq = (
        select(func.count(NoteModel.id))
        .where(NoteModel.notebook_id == NotebookModel.id)
        .correlate(NotebookModel)
        .scalar_subquery()
        .label("note_count")
    )
    pinned_count_sq = (
        select(func.count(NoteModel.id))
        .where(NoteModel.notebook_id == NotebookModel.id, NoteModel.is_pinned == 1)
        .correlate(NotebookModel)
        .scalar_subquery()
        .label("pinned_count")
    )
    last_note_content_sq = (
        select(NoteModel.content)
        .where(NoteModel.notebook_id == NotebookModel.id)
        .order_by(NoteModel.created_at.desc())
        .limit(1)
        .correlate(NotebookModel)
        .scalar_subquery()
        .label("last_note_content")
    )
    last_note_at_sq = (
        select(NoteModel.created_at)
        .where(NoteModel.notebook_id == NotebookModel.id)
        .order_by(NoteModel.created_at.desc())
        .limit(1)
        .correlate(NotebookModel)
        .scalar_subquery()
        .label("last_note_at")
    )
    last_note_id_sq = (
        select(NoteModel.id)
        .where(NoteModel.notebook_id == NotebookModel.id)
        .order_by(NoteModel.created_at.desc())
        .limit(1)
        .correlate(NotebookModel)
        .scalar_subquery()
    )
    last_note_att_count_sq = (
        select(func.count(AttachmentModel.id))
        .where(AttachmentModel.note_id == last_note_id_sq)
        .correlate(NotebookModel)
        .scalar_subquery()
        .label("last_note_attachment_count")
    )
    return (
        select(
            NotebookModel,
            note_count_sq,
            pinned_count_sq,
            last_note_content_sq,
            last_note_at_sq,
            last_note_att_count_sq,
        ),
        last_note_at_sq,
    )


def _map_notebook_tuple(
    nb: NotebookModel,
    note_count: int | None,
    pinned_count: int | None,
    last_note_content: str | None,
    last_note_at: str | None,
    last_note_att_count: int | None,
) -> NotebookOut:
    has_images = (last_note_att_count or 0) > 0
    preview: str | None = None
    if last_note_content is not None:
        cleaned = build_plain_preview(last_note_content, 72)
        if cleaned:
            preview = f"🖼️ {cleaned}" if has_images else cleaned
        elif has_images:
            preview = "🖼️ [图片]"

    return NotebookOut(
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
        note_count=int(note_count or 0),
        pinned_count=int(pinned_count or 0),
        last_note_preview=preview,
        last_note_at=last_note_at,
        last_note_has_images=has_images,
    )


def get_notebooks_with_stats(session: Session) -> list[NotebookOut]:
    stmt, last_note_at_sq = _notebook_stats_query()
    stmt = stmt.order_by(
        NotebookModel.is_system.desc(),
        NotebookModel.is_pinned.desc(),
        func.coalesce(last_note_at_sq, NotebookModel.updated_at).desc(),
    )
    rows = session.execute(stmt).all()
    return [_map_notebook_tuple(*row) for row in rows]


def get_notebook_by_id(session: Session, notebook_id: str) -> NotebookOut | None:
    stmt, _ = _notebook_stats_query()
    row = session.execute(stmt.where(NotebookModel.id == notebook_id)).first()
    if row is None:
        return None
    return _map_notebook_tuple(*row)


def hydrate_notes(session: Session, rows: list[NoteModel]) -> list[NoteOut]:
    if not rows:
        return []

    note_ids = [r.id for r in rows]

    # Tags (preserve insertion order via SQLite rowid)
    tag_rows = session.execute(
        select(NoteTagModel.note_id, NoteTagModel.tag)
        .where(NoteTagModel.note_id.in_(note_ids))
        .order_by(literal_column("rowid").asc())
    ).all()
    tags_map: dict[str, list[str]] = {}
    for note_id, tag in tag_rows:
        tags_map.setdefault(note_id, []).append(tag)

    # Attachments
    att_models = session.scalars(
        select(AttachmentModel)
        .where(AttachmentModel.note_id.in_(note_ids))
        .order_by(AttachmentModel.created_at.asc())
    ).all()
    att_map: dict[str, list[AttachmentOut]] = {}
    for att in att_models:
        if att.note_id:
            att_map.setdefault(att.note_id, []).append(map_attachment(att))

    # Reply previews
    reply_ids = list({r.reply_to_id for r in rows if r.reply_to_id})
    reply_map: dict[str, ReplyPreviewOut] = {}
    if reply_ids:
        att_count_sq = (
            select(func.count(AttachmentModel.id))
            .where(AttachmentModel.note_id == NoteModel.id)
            .correlate(NoteModel)
            .scalar_subquery()
        )
        reply_rows = session.execute(
            select(NoteModel.id, NoteModel.content, NoteModel.created_at, att_count_sq).where(
                NoteModel.id.in_(reply_ids)
            )
        ).all()
        for r_id, r_content, r_created_at, r_att_count in reply_rows:
            reply_map[r_id] = ReplyPreviewOut(
                id=r_id,
                content=build_plain_preview(r_content, 100),
                has_images=int(r_att_count or 0) > 0,
                created_at=r_created_at,
            )

    return [
        NoteOut(
            id=row.id,
            notebook_id=row.notebook_id,
            content=row.content,
            reply_to_id=row.reply_to_id,
            reply_to=reply_map.get(row.reply_to_id) if row.reply_to_id else None,
            is_pinned=row.is_pinned == 1,
            pinned_at=row.pinned_at,
            created_at=row.created_at,
            updated_at=row.updated_at,
            edited_at=row.edited_at,
            tags=tags_map.get(row.id, []),
            attachments=att_map.get(row.id, []),
        )
        for row in rows
    ]


def get_note_by_id(session: Session, note_id: str) -> NoteOut | None:
    model = session.get(NoteModel, note_id)
    if model is None:
        return None
    hydrated = hydrate_notes(session, [model])
    return hydrated[0] if hydrated else None


def get_notes_for_notebook(
    session: Session,
    notebook_id: str,
    *,
    tag: str | None = None,
    pinned_only: bool = False,
) -> list[NoteOut]:
    stmt = select(NoteModel).where(NoteModel.notebook_id == notebook_id)
    if pinned_only:
        stmt = stmt.where(NoteModel.is_pinned == 1)
    if tag:
        stmt = stmt.join(NoteTagModel, NoteTagModel.note_id == NoteModel.id).where(
            NoteTagModel.tag_lower == tag.lower()
        )
    stmt = stmt.order_by(NoteModel.created_at.asc())
    rows = list(session.scalars(stmt).all())
    return hydrate_notes(session, rows)


def remove_attachment_files(uploads_dir: Path, filenames: Iterable[str]) -> None:
    for filename in filenames:
        safe_name = Path(filename).name
        if not safe_name:
            continue
        full_path = uploads_dir / safe_name
        try:
            if full_path.exists():
                full_path.unlink()
        except OSError:
            pass
