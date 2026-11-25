from __future__ import annotations

from pathlib import Path
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.database import DatabaseContext
from app.deps import get_db_context, get_session
from app.models import AttachmentModel
from app.schemas import AttachmentsResponse, DeleteResponse, utc_now_iso
from app.services.note_service import map_attachment, remove_attachment_files

router = APIRouter(prefix="/api/uploads", tags=["uploads"])

ALLOWED_MIME_TO_EXT: dict[str, str] = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "image/avif": ".avif",
}

MAX_FILES = 9
MAX_FILE_SIZE = 15 * 1024 * 1024  # 15MB


@router.post("", response_model=AttachmentsResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=AttachmentsResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
async def upload_images(
    files: list[UploadFile] | None = File(default=None),
    session: Session = Depends(get_session),
    db_ctx: DatabaseContext = Depends(get_db_context),
) -> AttachmentsResponse:
    if not files:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="请选择至少一张图片")
    if len(files) > MAX_FILES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"单次最多上传 {MAX_FILES} 张图片",
        )

    now = utc_now_iso()
    written_files: list[str] = []
    created_models: list[AttachmentModel] = []

    try:
        db_ctx.paths.uploads_dir.mkdir(parents=True, exist_ok=True)
        for upload in files:
            mime_type = (upload.content_type or "").lower()
            if mime_type not in ALLOWED_MIME_TO_EXT:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="仅支持 PNG、JPEG、GIF、WebP、AVIF 格式图片",
                )

            data = await upload.read(MAX_FILE_SIZE + 1)
            if len(data) > MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="单张图片大小不能超过 15MB",
                )

            ext = ALLOWED_MIME_TO_EXT[mime_type]
            stored_name = f"{uuid.uuid4()}{ext}"
            target_path = db_ctx.paths.uploads_dir / stored_name
            target_path.write_bytes(data)
            written_files.append(stored_name)

            original_name = Path(upload.filename or stored_name).name or stored_name
            model = AttachmentModel(
                id=str(uuid.uuid4()),
                note_id=None,
                filename=stored_name,
                original_name=original_name,
                mime_type=mime_type,
                size=len(data),
                created_at=now,
            )
            session.add(model)
            created_models.append(model)

        session.commit()
    except Exception:
        session.rollback()
        remove_attachment_files(db_ctx.paths.uploads_dir, written_files)
        raise

    return AttachmentsResponse(attachments=[map_attachment(m) for m in created_models])


@router.delete("/{attachment_id}", response_model=DeleteResponse)
def delete_attachment(
    attachment_id: str,
    session: Session = Depends(get_session),
    db_ctx: DatabaseContext = Depends(get_db_context),
) -> DeleteResponse:
    model = session.get(AttachmentModel, attachment_id)
    if model is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="附件不存在")

    filename = model.filename
    session.execute(delete(AttachmentModel).where(AttachmentModel.id == attachment_id))
    session.commit()

    remove_attachment_files(db_ctx.paths.uploads_dir, [filename])
    return DeleteResponse(deleted=True, id=attachment_id)
