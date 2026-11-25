from __future__ import annotations

from datetime import datetime
from pathlib import Path

from sqlalchemy.orm import Session

from app.schemas import NotebookOut, NoteOut, utc_now_iso
from app.services.note_service import (
    get_notebook_by_id,
    get_notebooks_with_stats,
    get_notes_for_notebook,
)


def format_iso_readable(iso: str) -> str:
    try:
        dt = datetime.fromisoformat(iso.replace("Z", "+00:00")).astimezone()
        return dt.strftime("%Y-%m-%d %H:%M")
    except ValueError:
        return iso


def format_single_note_markdown(note: NoteOut, notebook_name: str | None = None) -> str:
    lines: list[str] = []
    if notebook_name:
        lines.append(f"<!-- Notebook: {notebook_name} -->")

    meta_parts = [format_iso_readable(note.created_at)]
    if note.is_pinned:
        meta_parts.append("Pinned")
    if note.edited_at:
        meta_parts.append(f"Edited {format_iso_readable(note.edited_at)}")
    lines.append(f"### {' · '.join(meta_parts)}")
    lines.append("")

    if note.reply_to:
        reply_text = note.reply_to.content or ("[图片]" if note.reply_to.has_images else "")
        lines.append(f"> ↩ 回复 ({format_iso_readable(note.reply_to.created_at)}): {reply_text}")
        lines.append("")

    if note.content.strip():
        lines.append(note.content.strip())
        lines.append("")

    if note.attachments:
        for att in note.attachments:
            lines.append(f"![{att.original_name}](../uploads/{att.filename})")
        lines.append("")

    return "\n".join(lines).rstrip() + "\n"


def format_notebook_markdown(notebook: NotebookOut, notes: list[NoteOut]) -> str:
    lines: list[str] = [f"# {notebook.name}", ""]
    if notebook.description:
        lines.append(f"> {notebook.description}")
        lines.append("")

    lines.append(f"_共 {len(notes)} 条笔记 · 更新于 {format_iso_readable(utc_now_iso())}_")
    lines.append("")
    lines.append("---")
    lines.append("")

    if not notes:
        lines.append("_暂无笔记_")
        lines.append("")
        return "\n".join(lines)

    for idx, note in enumerate(notes):
        lines.append(format_single_note_markdown(note).rstrip())
        if idx < len(notes) - 1:
            lines.append("")
            lines.append("---")
            lines.append("")

    return "\n".join(lines) + "\n"


def sync_notebook_markdown(session: Session, markdown_dir: Path, notebook_id: str) -> None:
    notebook = get_notebook_by_id(session, notebook_id)
    if notebook is None:
        return
    notes = get_notes_for_notebook(session, notebook_id)
    content = format_notebook_markdown(notebook, notes)
    safe_slug = Path(notebook.slug).name
    markdown_dir.mkdir(parents=True, exist_ok=True)
    target_path = markdown_dir / f"{safe_slug}.md"
    target_path.write_text(content, encoding="utf-8")


def remove_notebook_markdown(markdown_dir: Path, slug: str) -> None:
    safe_slug = Path(slug).name
    target_path = markdown_dir / f"{safe_slug}.md"
    try:
        if target_path.exists():
            target_path.unlink()
    except OSError:
        pass


def sync_all_notebooks_markdown(session: Session, markdown_dir: Path) -> None:
    markdown_dir.mkdir(parents=True, exist_ok=True)
    notebooks = get_notebooks_with_stats(session)
    valid_files: set[str] = set()

    for nb in notebooks:
        safe_slug = Path(nb.slug).name
        valid_files.add(f"{safe_slug}.md")
        sync_notebook_markdown(session, markdown_dir, nb.id)

    try:
        for file_path in markdown_dir.iterdir():
            if file_path.is_file() and file_path.suffix == ".md" and file_path.name not in valid_files:
                file_path.unlink()
    except OSError:
        pass
