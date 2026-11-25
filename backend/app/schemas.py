from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic.alias_generators import to_camel

AvatarColor = Literal["blue", "cyan", "green", "orange", "red", "violet", "pink"]


def utc_now_iso(offset_ms: int = 0) -> str:
    dt = datetime.now(timezone.utc) + timedelta(milliseconds=offset_ms)
    return dt.isoformat(timespec="milliseconds").replace("+00:00", "Z")


class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )


class HealthResponse(CamelModel):
    status: str = "ok"
    app: str = "telepad"


class NotebookOut(CamelModel):
    id: str
    name: str
    slug: str
    description: str
    icon: str
    avatar_color: AvatarColor
    is_system: bool
    is_pinned: bool
    created_at: str
    updated_at: str
    note_count: int
    pinned_count: int
    last_note_preview: str | None
    last_note_at: str | None
    last_note_has_images: bool


class AttachmentOut(CamelModel):
    id: str
    note_id: str | None
    filename: str
    original_name: str
    mime_type: str
    size: int
    url: str
    created_at: str


class ReplyPreviewOut(CamelModel):
    id: str
    content: str
    has_images: bool
    created_at: str


class NoteOut(CamelModel):
    id: str
    notebook_id: str
    content: str
    reply_to_id: str | None
    reply_to: ReplyPreviewOut | None
    is_pinned: bool
    pinned_at: str | None
    created_at: str
    updated_at: str
    edited_at: str | None
    tags: list[str]
    attachments: list[AttachmentOut]


class TagSummaryOut(CamelModel):
    tag: str
    count: int


class SearchResultOut(CamelModel):
    id: str
    notebook_id: str
    notebook_name: str
    notebook_icon: str
    notebook_avatar_color: AvatarColor
    content: str
    snippet: str
    created_at: str
    is_pinned: bool
    has_images: bool
    tags: list[str]


class StorageInfoOut(CamelModel):
    data_dir: str
    db_path: str
    uploads_dir: str
    markdown_dir: str
    notebook_count: int
    note_count: int
    attachment_count: int


# --- Request payloads ---

class NotebookCreateRequest(CamelModel):
    name: str
    description: str = ""
    icon: str = "📝"
    avatar_color: AvatarColor = "blue"
    is_pinned: bool = False

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("笔记本名称不能为空")
        if len(trimmed) > 60:
            raise ValueError("笔记本名称不能超过 60 个字符")
        return trimmed

    @field_validator("description")
    @classmethod
    def validate_description(cls, v: str) -> str:
        trimmed = v.strip()
        if len(trimmed) > 240:
            raise ValueError("笔记本简介不能超过 240 个字符")
        return trimmed

    @field_validator("icon")
    @classmethod
    def validate_icon(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed or len(trimmed) > 32:
            raise ValueError("图标格式无效")
        return trimmed


class NotebookUpdateRequest(CamelModel):
    name: str | None = None
    description: str | None = None
    icon: str | None = None
    avatar_color: AvatarColor | None = None
    is_pinned: bool | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str | None) -> str | None:
        if v is None:
            return None
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("笔记本名称不能为空")
        if len(trimmed) > 60:
            raise ValueError("笔记本名称不能超过 60 个字符")
        return trimmed

    @field_validator("description")
    @classmethod
    def validate_description(cls, v: str | None) -> str | None:
        if v is None:
            return None
        trimmed = v.strip()
        if len(trimmed) > 240:
            raise ValueError("笔记本简介不能超过 240 个字符")
        return trimmed

    @field_validator("icon")
    @classmethod
    def validate_icon(cls, v: str | None) -> str | None:
        if v is None:
            return None
        trimmed = v.strip()
        if not trimmed or len(trimmed) > 32:
            raise ValueError("图标格式无效")
        return trimmed


class NoteCreateRequest(CamelModel):
    notebook_id: str = Field(min_length=1)
    content: str = ""
    reply_to_id: str | None = None
    attachment_ids: list[str] = Field(default_factory=list, max_length=9)


class NoteUpdateRequest(CamelModel):
    content: str | None = None
    attachment_ids: list[str] | None = Field(default=None, max_length=9)


class NotePinRequest(CamelModel):
    is_pinned: bool


class NoteCheckboxRequest(CamelModel):
    task_index: int = Field(ge=0)


class NoteForwardRequest(CamelModel):
    target_notebook_id: str = Field(min_length=1)
    mode: Literal["copy", "move"] = "copy"


# --- Backup schemas ---

class BackupNotebookRecord(CamelModel):
    id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    slug: str = Field(min_length=1)
    description: str = ""
    icon: str = "📝"
    avatar_color: AvatarColor = "blue"
    is_system: bool = False
    is_pinned: bool = False
    created_at: str
    updated_at: str


class BackupNoteRecord(CamelModel):
    id: str = Field(min_length=1)
    notebook_id: str = Field(min_length=1)
    content: str
    reply_to_id: str | None = None
    is_pinned: bool = False
    pinned_at: str | None = None
    created_at: str
    updated_at: str
    edited_at: str | None = None


class BackupAttachmentRecord(CamelModel):
    id: str = Field(min_length=1)
    note_id: str | None
    filename: str = Field(min_length=1)
    original_name: str = Field(min_length=1)
    mime_type: str = Field(min_length=1)
    size: int = Field(ge=0)
    created_at: str
    data_base64: str | None = None


class BackupPayload(CamelModel):
    version: Literal[1]
    app: Literal["telepad"]
    exported_at: str
    notebooks: list[BackupNotebookRecord]
    notes: list[BackupNoteRecord]
    attachments: list[BackupAttachmentRecord] = Field(default_factory=list)


class BackupImportRequest(CamelModel):
    mode: Literal["merge", "replace"] = "merge"
    payload: BackupPayload


# --- Wrapper response models ---

class NotebooksResponse(CamelModel):
    notebooks: list[NotebookOut]


class NotebookResponse(CamelModel):
    notebook: NotebookOut


class NotesResponse(CamelModel):
    notes: list[NoteOut]


class NoteResponse(CamelModel):
    note: NoteOut


class ForwardNoteResponse(CamelModel):
    note: NoteOut
    mode: Literal["copy", "move"]


class SearchResponse(CamelModel):
    results: list[SearchResultOut]


class TagsResponse(CamelModel):
    tags: list[TagSummaryOut]


class AttachmentsResponse(CamelModel):
    attachments: list[AttachmentOut]


class DeleteResponse(CamelModel):
    deleted: bool = True
    id: str


class BackupImportResponse(CamelModel):
    success: bool = True
    mode: Literal["merge", "replace"]
    imported_notebooks: int
    imported_notes: int
    imported_attachments: int
