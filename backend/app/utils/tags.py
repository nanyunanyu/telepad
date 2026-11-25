from __future__ import annotations

import re

HEX_COLOR_6_OR_8 = re.compile(r"^[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$")
HEX_COLOR_3_COMMON = re.compile(
    r"^(000|111|222|333|444|555|666|777|888|999|aaa|bbb|ccc|ddd|eee|fff)$",
    re.IGNORECASE,
)

FENCED_CODE_RE = re.compile(
    r"(^|\n)[ \t]*(`{3,}|~{3,})[^\n]*\n[\s\S]*?(?:\n[ \t]*\2[ \t]*(?=\n|$)|$)"
)
INLINE_CODE_RE = re.compile(r"`[^`\n]+`")
URL_RE = re.compile(r"https?://[^\s)<>]+", re.IGNORECASE)
TAG_RE = re.compile(r"""(?:^|[\s(\[{"'（【，。、：；！？])#(\w[\w\-/]{0,47})""", re.UNICODE)
FENCE_LINE_RE = re.compile(r"^[ \t]*(`{3,}|~{3,})")
TASK_LINE_RE = re.compile(r"^(\s*(?:[-*+]|\d+[.)])\s+\[)([ xX])(\](?:\s.*|$))")


def _strip_non_tag_segments(markdown: str) -> str:
    """Strip fenced code blocks, inline code spans, and URLs to avoid false tag matches."""
    cleaned = FENCED_CODE_RE.sub(r"\1", markdown)
    cleaned = INLINE_CODE_RE.sub(" ", cleaned)
    cleaned = URL_RE.sub(" ", cleaned)
    return cleaned


def extract_tags(markdown: str) -> list[str]:
    """
    Extract unique #tags from note markdown.
    Supports Chinese, Latin, digits, underscores, hyphens, and slashes (e.g. #工作, #react-hooks, #读书/笔记).
    """
    if not markdown:
        return []
    cleaned = _strip_non_tag_segments(markdown)
    seen: set[str] = set()
    tags: list[str] = []

    for match in TAG_RE.finditer(cleaned):
        raw = re.sub(r"[/\-]+$", "", match.group(1))
        if not raw:
            continue
        if HEX_COLOR_6_OR_8.match(raw) or HEX_COLOR_3_COMMON.match(raw):
            continue
        lower = raw.lower()
        if lower not in seen:
            seen.add(lower)
            tags.append(raw)
    return tags


def toggle_checkbox_at_index(markdown: str, target_index: int) -> tuple[str, bool]:
    """Toggle the N-th GFM task list checkbox (0-based) outside fenced code blocks."""
    if target_index < 0:
        return markdown, False

    lines = markdown.split("\n")
    in_fence = False
    fence_char = ""
    fence_len = 0
    task_index = 0
    toggled = False

    for i, line in enumerate(lines):
        fence_match = FENCE_LINE_RE.match(line)
        if fence_match:
            marker = fence_match.group(1)
            if not in_fence:
                in_fence = True
                fence_char = marker[0]
                fence_len = len(marker)
            elif marker[0] == fence_char and len(marker) >= fence_len:
                in_fence = False
            continue

        if in_fence:
            continue

        task_match = TASK_LINE_RE.match(line)
        if task_match:
            if task_index == target_index:
                next_mark = " " if task_match.group(2).lower() == "x" else "x"
                lines[i] = f"{task_match.group(1)}{next_mark}{task_match.group(3)}"
                toggled = True
                break
            task_index += 1

    return "\n".join(lines), toggled


def slugify_notebook(name: str, existing_slugs: set[str]) -> str:
    """Generate a safe unique filesystem slug for a notebook's markdown mirror."""
    base = name.strip().lower()
    base = re.sub(r'[\/\\:*?"<>|]', "", base)
    base = re.sub(r"\s+", "-", base)
    base = re.sub(r"-+", "-", base)
    base = re.sub(r"^-|-$", "", base)

    if not base:
        base = "notebook"
    if len(base) > 60:
        base = base[:60].rstrip("-") or "notebook"

    candidate = base
    counter = 2
    while candidate in existing_slugs:
        candidate = f"{base}-{counter}"
        counter += 1
    return candidate


def build_plain_preview(markdown: str, max_len: int = 90) -> str:
    """Build a clean plain-text preview snippet from markdown content."""
    plain = re.sub(r"```[\s\S]*?```", "[代码块]", markdown)
    plain = re.sub(r"`([^`]+)`", r"\1", plain)
    plain = re.sub(r"!\[[^\]]*\]\([^)]*\)", "[图片]", plain)
    plain = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", plain)
    plain = re.sub(r"^#{1,6}\s+", "", plain, flags=re.MULTILINE)
    plain = re.sub(r"^>\s?", "", plain, flags=re.MULTILINE)
    plain = re.sub(r"[*_~]+", "", plain)
    plain = re.sub(r"\s+", " ", plain).strip()

    if len(plain) <= max_len:
        return plain
    return f"{plain[:max_len].rstrip()}…"


def build_search_snippet(markdown: str, query: str, max_len: int = 120) -> str:
    """Build a contextual search snippet centered around the first match."""
    flat = re.sub(r"\s+", " ", markdown).strip()
    if not query:
        return build_plain_preview(flat, max_len)

    idx = flat.lower().find(query.lower())
    if idx == -1:
        return flat if len(flat) <= max_len else f"{flat[:max_len]}…"

    context_before = int((max_len - len(query)) * 0.35)
    start = max(0, idx - context_before)
    end = min(len(flat), start + max_len)
    prefix = "…" if start > 0 else ""
    suffix = "…" if end < len(flat) else ""
    return f"{prefix}{flat[start:end]}{suffix}"
