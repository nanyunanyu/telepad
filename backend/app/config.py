from __future__ import annotations

from dataclasses import dataclass
import os
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BACKEND_ROOT.parent


@dataclass(frozen=True)
class AppPaths:
    data_dir: Path
    db_path: Path
    uploads_dir: Path
    markdown_dir: Path
    static_dir: Path

    @classmethod
    def from_data_dir(cls, data_dir: str | Path | None = None) -> AppPaths:
        env_dir = os.environ.get("TELEPAD_DATA_DIR")
        resolved_data = Path(data_dir) if data_dir is not None else (
            Path(env_dir) if env_dir else PROJECT_ROOT / "data"
        )
        resolved_data = resolved_data.resolve()
        return cls(
            data_dir=resolved_data,
            db_path=resolved_data / "telepad.db",
            uploads_dir=resolved_data / "uploads",
            markdown_dir=resolved_data / "markdown",
            static_dir=PROJECT_ROOT / "frontend" / "dist",
        )

    def ensure_dirs(self) -> None:
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.uploads_dir.mkdir(parents=True, exist_ok=True)
        self.markdown_dir.mkdir(parents=True, exist_ok=True)
