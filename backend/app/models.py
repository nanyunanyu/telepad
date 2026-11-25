from __future__ import annotations

from sqlalchemy import ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class NotebookModel(Base):
    __tablename__ = "notebooks"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    slug: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="", server_default="")
    icon: Mapped[str] = mapped_column(String, nullable=False, default="📝", server_default="📝")
    avatar_color: Mapped[str] = mapped_column(
        String, nullable=False, default="blue", server_default="blue"
    )
    is_system: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    is_pinned: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    created_at: Mapped[str] = mapped_column(String, nullable=False)
    updated_at: Mapped[str] = mapped_column(String, nullable=False)


class NoteModel(Base):
    __tablename__ = "notes"
    __table_args__ = (
        Index("idx_notes_notebook_created", "notebook_id", "created_at"),
        Index("idx_notes_notebook_pinned", "notebook_id", "is_pinned", "pinned_at"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True)
    notebook_id: Mapped[str] = mapped_column(
        String, ForeignKey("notebooks.id", ondelete="CASCADE"), nullable=False
    )
    content: Mapped[str] = mapped_column(Text, nullable=False, default="", server_default="")
    reply_to_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("notes.id", ondelete="SET NULL"), nullable=True
    )
    is_pinned: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    pinned_at: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[str] = mapped_column(String, nullable=False)
    updated_at: Mapped[str] = mapped_column(String, nullable=False)
    edited_at: Mapped[str | None] = mapped_column(String, nullable=True)


class AttachmentModel(Base):
    __tablename__ = "attachments"
    __table_args__ = (Index("idx_attachments_note", "note_id"),)

    id: Mapped[str] = mapped_column(String, primary_key=True)
    note_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("notes.id", ondelete="CASCADE"), nullable=True
    )
    filename: Mapped[str] = mapped_column(String, nullable=False)
    original_name: Mapped[str] = mapped_column(String, nullable=False)
    mime_type: Mapped[str] = mapped_column(String, nullable=False)
    size: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[str] = mapped_column(String, nullable=False)


class NoteTagModel(Base):
    __tablename__ = "note_tags"
    __table_args__ = (Index("idx_note_tags_lower", "tag_lower"),)

    note_id: Mapped[str] = mapped_column(
        String, ForeignKey("notes.id", ondelete="CASCADE"), primary_key=True
    )
    tag: Mapped[str] = mapped_column(String, nullable=False)
    tag_lower: Mapped[str] = mapped_column(String, primary_key=True)
