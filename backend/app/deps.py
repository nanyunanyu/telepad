from __future__ import annotations

from collections.abc import Iterator

from fastapi import Request
from sqlalchemy.orm import Session

from app.database import DatabaseContext


def get_db_context(request: Request) -> DatabaseContext:
    return request.app.state.db_ctx


def get_session(request: Request) -> Iterator[Session]:
    db_ctx: DatabaseContext = request.app.state.db_ctx
    session = db_ctx.session_factory()
    try:
        yield session
    finally:
        session.close()
