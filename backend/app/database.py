from __future__ import annotations

from dataclasses import dataclass
import uuid

from sqlalchemy import Engine, create_engine, event, func, select
from sqlalchemy.orm import Session, sessionmaker

from app.config import AppPaths
from app.models import Base, NotebookModel, NoteModel
from app.schemas import utc_now_iso
from app.services.markdown_sync import sync_all_notebooks_markdown
from app.services.note_service import SAVED_MESSAGES_ID, sync_note_tags


@dataclass
class DatabaseContext:
    paths: AppPaths
    engine: Engine
    session_factory: sessionmaker[Session]

    def close(self) -> None:
        self.engine.dispose()


def _configure_sqlite_pragmas(dbapi_connection, _connection_record) -> None:
    cursor = dbapi_connection.cursor()
    try:
        cursor.execute("PRAGMA journal_mode = WAL;")
        cursor.execute("PRAGMA foreign_keys = ON;")
    finally:
        cursor.close()


def init_database(paths: AppPaths) -> DatabaseContext:
    paths.ensure_dirs()
    engine = create_engine(
        f"sqlite:///{paths.db_path}",
        connect_args={"check_same_thread": False},
        future=True,
    )
    event.listen(engine, "connect", _configure_sqlite_pragmas)
    Base.metadata.create_all(engine)

    session_factory = sessionmaker(
        bind=engine,
        autoflush=False,
        autocommit=False,
        expire_on_commit=False,
    )

    with session_factory() as session:
        seed_initial_data(session)
        session.commit()
        sync_all_notebooks_markdown(session, paths.markdown_dir)

    return DatabaseContext(paths=paths, engine=engine, session_factory=session_factory)


def seed_initial_data(session: Session) -> None:
    count = session.scalar(select(func.count(NotebookModel.id))) or 0
    if count > 0:
        return

    saved_nb = NotebookModel(
        id=SAVED_MESSAGES_ID,
        name="Saved Messages",
        slug="saved-messages",
        description="随时随地发送灵感、待办、代码片段与截图，自动持久化到本地 SQLite 与 Markdown 文件。",
        icon="saved-messages",
        avatar_color="blue",
        is_system=1,
        is_pinned=1,
        created_at=utc_now_iso(-300_000),
        updated_at=utc_now_iso(-10_000),
    )

    ideas_id = str(uuid.uuid4())
    ideas_nb = NotebookModel(
        id=ideas_id,
        name="Ideas & Clips",
        slug="ideas-clips",
        description="收纳项目灵感、读书摘录与日常备忘，按频道分类管理。",
        icon="💡",
        avatar_color="violet",
        is_system=0,
        is_pinned=0,
        created_at=utc_now_iso(-240_000),
        updated_at=utc_now_iso(-5_000),
    )
    session.add_all([saved_nb, ideas_nb])
    session.flush()

    note1_id = str(uuid.uuid4())
    note1_content = "\n".join(
        [
            "### 欢迎来到 Telepad ✈️",
            "",
            "像使用 **Telegram Saved Messages** 一样记录你的想法：",
            "",
            "- [x] 日间（Day）/ 夜间（Night）经典 Telegram 配色一键切换",
            "- [ ] 直接点击气泡里的待办方框，状态会实时保存到本地 SQLite",
            "- [ ] 支持直接 `Cmd/Ctrl + V` 粘贴截图或拖拽图片到聊天区",
            "- [ ] 自动将每个笔记本同步为本地 `.md` 镜像文件",
            "",
            "#指南 #入门 #效率",
        ]
    )
    note1 = NoteModel(
        id=note1_id,
        notebook_id=SAVED_MESSAGES_ID,
        content=note1_content,
        reply_to_id=None,
        is_pinned=1,
        pinned_at=utc_now_iso(-120_000),
        created_at=utc_now_iso(-180_000),
        updated_at=utc_now_iso(-180_000),
        edited_at=None,
    )

    note2_id = str(uuid.uuid4())
    note2_content = "\n".join(
        [
            "代码块自带语法高亮与一键复制，支持多语言：",
            "",
            "```typescript",
            "interface QuickNote {",
            "  channel: string;",
            "  tags: string[];",
            "  pinned: boolean;",
            "}",
            "",
            'const note: QuickNote = { channel: "Saved Messages", tags: ["代码", "示例"], pinned: true };',
            "```",
            "",
            "#代码 #typescript",
        ]
    )
    note2 = NoteModel(
        id=note2_id,
        notebook_id=SAVED_MESSAGES_ID,
        content=note2_content,
        reply_to_id=None,
        is_pinned=0,
        pinned_at=None,
        created_at=utc_now_iso(-90_000),
        updated_at=utc_now_iso(-90_000),
        edited_at=None,
    )

    note3_id = str(uuid.uuid4())
    note3_content = "\n".join(
        [
            "点击上方**置顶横幅**或本条消息顶部的**引用块**，可以平滑跳转并高亮闪烁对应笔记 ✨",
            "",
            "试试 `Cmd/Ctrl + K` 全局搜索，或右键任意气泡进行引用、编辑、置顶、转发与导出 `.md`。",
            "",
            "#技巧 #指南",
        ]
    )
    note3 = NoteModel(
        id=note3_id,
        notebook_id=SAVED_MESSAGES_ID,
        content=note3_content,
        reply_to_id=note1_id,
        is_pinned=0,
        pinned_at=None,
        created_at=utc_now_iso(-30_000),
        updated_at=utc_now_iso(-30_000),
        edited_at=None,
    )

    idea_note_id = str(uuid.uuid4())
    idea_note_content = "\n".join(
        [
            "> 好的笔记工具应该像给自己发消息一样毫无摩擦。",
            "",
            "可以在左下角点击 `+` 新建更多主题频道（如工作日志、读书摘录、会议纪要）。",
            "",
            "#灵感 #摘录",
        ]
    )
    idea_note = NoteModel(
        id=idea_note_id,
        notebook_id=ideas_id,
        content=idea_note_content,
        reply_to_id=None,
        is_pinned=0,
        pinned_at=None,
        created_at=utc_now_iso(-20_000),
        updated_at=utc_now_iso(-20_000),
        edited_at=None,
    )

    session.add_all([note1, note2, note3, idea_note])
    session.flush()
    sync_note_tags(session, note1_id, note1_content)
    sync_note_tags(session, note2_id, note2_content)
    sync_note_tags(session, note3_id, note3_content)
    sync_note_tags(session, idea_note_id, idea_note_content)
