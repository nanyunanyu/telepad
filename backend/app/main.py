from __future__ import annotations

from contextlib import asynccontextmanager
import os
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from app.config import AppPaths
from app.database import init_database
from app.routers import backup, notebooks, notes, uploads
from app.schemas import HealthResponse


class CachedUploadsStaticFiles(StaticFiles):
    async def get_response(self, path: str, scope):
        response = await super().get_response(path, scope)
        if response.status_code == 200:
            response.headers["Cache-Control"] = "public, max-age=604800, immutable"
        return response


def create_app(
    *,
    data_dir: str | Path | None = None,
    serve_static: bool | None = None,
) -> FastAPI:
    paths = AppPaths.from_data_dir(data_dir)
    db_ctx = init_database(paths)

    @asynccontextmanager
    async def lifespan(_app: FastAPI):
        yield
        db_ctx.close()

    application = FastAPI(
        title="Telepad API",
        version="1.0.0",
        description="Telegram Saved Messages style local note-taking backend (FastAPI + SQLAlchemy 2.0)",
        lifespan=lifespan,
    )
    application.state.db_ctx = db_ctx

    application.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Uniform error contract matching original Telepad API: {"error": "..."}
    @application.exception_handler(HTTPException)
    async def http_exception_handler(_request: Request, exc: HTTPException) -> JSONResponse:
        message = exc.detail if isinstance(exc.detail, str) else "请求失败"
        return JSONResponse(status_code=exc.status_code, content={"error": message})

    @application.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        if request.url.path == "/api/backup/import":
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={"error": "备份文件格式无效，请检查是否为 Telepad 导出的 JSON 文件"},
            )
        first = exc.errors()[0] if exc.errors() else None
        msg = "参数无效"
        if first and isinstance(first.get("msg"), str):
            raw_msg = first["msg"]
            msg = raw_msg.removeprefix("Value error, ")
        return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST, content={"error": msg})

    @application.exception_handler(Exception)
    async def unhandled_exception_handler(_request: Request, exc: Exception) -> JSONResponse:
        message = str(exc) or "服务器内部错误"
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"error": message},
        )

    @application.get("/api/health", response_model=HealthResponse, tags=["health"])
    def health_check() -> HealthResponse:
        return HealthResponse(status="ok", app="telepad")

    application.include_router(notebooks.router)
    application.include_router(notes.router)
    application.include_router(uploads.router)
    application.include_router(backup.router)

    application.mount(
        "/uploads",
        CachedUploadsStaticFiles(directory=str(paths.uploads_dir)),
        name="uploads",
    )

    should_serve_static = (
        serve_static
        if serve_static is not None
        else os.environ.get("TELEPAD_SERVE_STATIC") in ("1", "true", "True")
        or os.environ.get("NODE_ENV") == "production"
    )
    if should_serve_static and paths.static_dir.exists():
        assets_dir = paths.static_dir / "assets"
        if assets_dir.exists():
            application.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

        index_html = paths.static_dir / "index.html"

        @application.get("/{full_path:path}", include_in_schema=False)
        def serve_spa(full_path: str):
            if full_path.startswith("api/") or full_path.startswith("uploads/"):
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not Found")
            candidate = (paths.static_dir / full_path).resolve()
            if (
                full_path
                and candidate.is_file()
                and paths.static_dir.resolve() in candidate.parents
            ):
                return FileResponse(candidate)
            return FileResponse(index_html)

    return application


app = create_app()

if __name__ == "__main__":
    import uvicorn

    host = os.environ.get("HOST", "127.0.0.1")
    port = int(os.environ.get("PORT", "8000"))
    uvicorn.run("app.main:app", host=host, port=port, reload=True)
