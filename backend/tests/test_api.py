from __future__ import annotations

import base64
from pathlib import Path

from fastapi.testclient import TestClient
import pytest

from app.main import create_app
from app.services.note_service import SAVED_MESSAGES_ID
from app.utils.tags import extract_tags, toggle_checkbox_at_index

# Minimal valid 1x1 PNG binary
TINY_PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
)


def test_extract_tags_chinese_english_and_ignore_noise() -> None:
    md = "\n".join(
        [
            "# Markdown Heading",
            "普通文本 #工作 #react-hooks #读书/笔记 以及颜色 #3390EC #fff #17212B",
            "链接 https://example.com/page#anchor 不应提取",
            "行内代码 `#inlineTag` 不应提取",
            "```ts",
            'const color = "#codeTag";',
            "```",
            "重复大小写 #React-Hooks #工作",
        ]
    )
    assert extract_tags(md) == ["工作", "react-hooks", "读书/笔记"]


def test_toggle_checkbox_ignores_code_fences() -> None:
    md = "\n".join(
        [
            "- [ ] task 0",
            "```md",
            "- [ ] fake inside code",
            "```",
            "- [x] task 1",
            "  - [ ] task 2",
        ]
    )
    content1, toggled1 = toggle_checkbox_at_index(md, 1)
    assert toggled1 is True
    assert "- [ ] task 1" in content1
    assert "- [ ] fake inside code" in content1

    content2, toggled2 = toggle_checkbox_at_index(content1, 2)
    assert toggled2 is True
    assert "  - [x] task 2" in content2


@pytest.fixture()
def api_env(tmp_path: Path):
    app = create_app(data_dir=tmp_path, serve_static=False)
    with TestClient(app) as client:
        yield client, tmp_path


def test_seed_saved_messages_and_markdown_mirror(api_env) -> None:
    client, tmp_path = api_env

    health = client.get("/api/health")
    assert health.status_code == 200
    assert health.json() == {"status": "ok", "app": "telepad"}

    res = client.get("/api/notebooks")
    assert res.status_code == 200
    notebooks = res.json()["notebooks"]
    assert len(notebooks) >= 2

    saved = next((n for n in notebooks if n["id"] == SAVED_MESSAGES_ID), None)
    assert saved is not None
    assert saved["isSystem"] is True
    assert saved["isPinned"] is True
    assert saved["noteCount"] >= 3

    md_path = tmp_path / "markdown" / "saved-messages.md"
    assert md_path.exists()
    assert "# Saved Messages" in md_path.read_text(encoding="utf-8")

    # System notebook cannot be deleted
    del_res = client.delete(f"/api/notebooks/{SAVED_MESSAGES_ID}")
    assert del_res.status_code == 400
    assert "error" in del_res.json()


def test_full_lifecycle_and_backup_restore(api_env) -> None:
    client, tmp_path = api_env

    # 1. Create custom notebook
    create_nb = client.post(
        "/api/notebooks",
        json={
            "name": "前端研发日志",
            "description": "每日开发速记",
            "icon": "🚀",
            "avatarColor": "cyan",
            "isPinned": True,
        },
    )
    assert create_nb.status_code == 201
    dev_nb = create_nb.json()["notebook"]
    assert dev_nb["name"] == "前端研发日志"
    assert dev_nb["isPinned"] is True

    # 2. Upload image attachment & reject invalid mime
    bad_up = client.post(
        "/api/uploads",
        files=[("files", ("note.txt", b"hello", "text/plain"))],
    )
    assert bad_up.status_code == 400
    assert "error" in bad_up.json()

    up_res = client.post(
        "/api/uploads",
        files=[("files", ("demo-shot.png", TINY_PNG, "image/png"))],
    )
    assert up_res.status_code == 201
    attachments = up_res.json()["attachments"]
    assert len(attachments) == 1

    # Verify image served statically
    img_res = client.get(attachments[0]["url"])
    assert img_res.status_code == 200
    assert img_res.headers["content-type"] == "image/png"
    assert "max-age=604800" in img_res.headers.get("cache-control", "")

    # 3. Reject empty note, then create note with checklist, tags, and attachment
    empty_res = client.post("/api/notes", json={"notebookId": dev_nb["id"], "content": "   "})
    assert empty_res.status_code == 400
    assert "error" in empty_res.json()

    note_res = client.post(
        "/api/notes",
        json={
            "notebookId": dev_nb["id"],
            "content": "排查接口超时问题：\n- [ ] 检查连接池\n- [ ] 验证缓存命中\n\n#排障 #性能",
            "attachmentIds": [attachments[0]["id"]],
        },
    )
    assert note_res.status_code == 201
    note1 = note_res.json()["note"]
    assert len(note1["attachments"]) == 1
    assert note1["tags"] == ["排障", "性能"]

    # 4. Toggle checkbox 0
    cb_res = client.patch(f"/api/notes/{note1['id']}/checkbox", json={"taskIndex": 0})
    assert cb_res.status_code == 200
    assert "- [x] 检查连接池" in cb_res.json()["note"]["content"]

    # 5. Pin note & create reply note
    pin_res = client.patch(f"/api/notes/{note1['id']}/pin", json={"isPinned": True})
    assert pin_res.status_code == 200
    assert pin_res.json()["note"]["isPinned"] is True

    reply_res = client.post(
        "/api/notes",
        json={
            "notebookId": dev_nb["id"],
            "content": "已定位根因，连接池配置调大后恢复正常 #排障",
            "replyToId": note1["id"],
        },
    )
    assert reply_res.status_code == 201
    reply_note = reply_res.json()["note"]
    assert reply_note["replyToId"] == note1["id"]
    assert "排查接口超时问题" in reply_note["replyTo"]["content"]

    # 6. Verify auto markdown mirror contains updated checkbox, reply quote & attachment
    dev_md = (tmp_path / "markdown" / f"{dev_nb['slug']}.md").read_text(encoding="utf-8")
    assert "- [x] 检查连接池" in dev_md
    assert "↩ 回复" in dev_md
    assert f"../uploads/{attachments[0]['filename']}" in dev_md

    # 7. Global search in Chinese
    search_res = client.get("/api/notes/search", params={"q": "连接池"})
    assert search_res.status_code == 200
    assert len(search_res.json()["results"]) == 2

    # 8. Filter by #tag & tags summary
    tag_res = client.get("/api/notes", params={"notebookId": dev_nb["id"], "tag": "性能"})
    assert tag_res.status_code == 200
    assert len(tag_res.json()["notes"]) == 1
    assert tag_res.json()["notes"][0]["id"] == note1["id"]

    tags_summary = client.get("/api/notes/tags", params={"notebookId": dev_nb["id"]})
    assert tags_summary.status_code == 200
    tag_dict = {t["tag"]: t["count"] for t in tags_summary.json()["tags"]}
    assert tag_dict["排障"] == 2
    assert tag_dict["性能"] == 1

    # 9. Forward copy to Saved Messages & verify independent attachment file
    fwd_res = client.post(
        f"/api/notes/{note1['id']}/forward",
        json={"targetNotebookId": SAVED_MESSAGES_ID, "mode": "copy"},
    )
    assert fwd_res.status_code == 201
    copied_note = fwd_res.json()["note"]
    assert copied_note["notebookId"] == SAVED_MESSAGES_ID
    assert len(copied_note["attachments"]) == 1
    assert copied_note["attachments"][0]["filename"] != attachments[0]["filename"]

    # 10. Forward move reply_note to Saved Messages
    move_res = client.post(
        f"/api/notes/{reply_note['id']}/forward",
        json={"targetNotebookId": SAVED_MESSAGES_ID, "mode": "move"},
    )
    assert move_res.status_code == 200
    assert move_res.json()["mode"] == "move"
    assert move_res.json()["note"]["notebookId"] == SAVED_MESSAGES_ID
    assert move_res.json()["note"]["replyToId"] is None

    # 11. Single-note & notebook Markdown export endpoints
    single_md_res = client.get(f"/api/notes/{note1['id']}/export")
    assert single_md_res.status_code == 200
    assert "排查接口超时问题" in single_md_res.text

    nb_md_res = client.get(f"/api/notebooks/{dev_nb['id']}/export")
    assert nb_md_res.status_code == 200
    assert "# 前端研发日志" in nb_md_res.text

    # 12. Storage info & full JSON backup export (with embedded base64 images)
    info_res = client.get("/api/backup/info")
    assert info_res.status_code == 200
    assert info_res.json()["attachmentCount"] >= 2

    exp_res = client.get("/api/backup/export", params={"includeImages": "true"})
    assert exp_res.status_code == 200
    backup_payload = exp_res.json()
    assert backup_payload["app"] == "telepad"
    assert backup_payload["version"] == 1
    assert len(backup_payload["attachments"]) >= 2
    assert backup_payload["attachments"][0]["dataBase64"]

    # 13. Delete note1 and confirm original file removed while forwarded copy remains
    del_note_res = client.delete(f"/api/notes/{note1['id']}")
    assert del_note_res.status_code == 200
    assert not (tmp_path / "uploads" / attachments[0]["filename"]).exists()
    assert (tmp_path / "uploads" / copied_note["attachments"][0]["filename"]).exists()

    # 14. Restore backup in replace mode & confirm note1 + image come back
    imp_res = client.post(
        "/api/backup/import",
        json={"mode": "replace", "payload": backup_payload},
    )
    assert imp_res.status_code == 200
    imp_data = imp_res.json()
    assert imp_data["success"] is True
    assert imp_data["importedNotes"] >= 5
    assert (tmp_path / "uploads" / attachments[0]["filename"]).exists()

    # 15. Merge mode is idempotent when re-importing same backup
    merge_res = client.post(
        "/api/backup/import",
        json={"mode": "merge", "payload": backup_payload},
    )
    assert merge_res.status_code == 200
    assert merge_res.json()["importedNotes"] == 0
    assert merge_res.json()["importedNotebooks"] == 0
