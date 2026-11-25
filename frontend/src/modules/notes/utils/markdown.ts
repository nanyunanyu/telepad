import MarkdownIt from 'markdown-it';
import type StateCore from 'markdown-it/lib/rules_core/state_core.mjs';
import type Token from 'markdown-it/lib/token.mjs';
import hljs from 'highlight.js';
import { escapeRegex } from '@/shared/utils/formatTime';

const HEX_6_OR_8 = /^[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/;
const HEX_3_COMMON = /^(000|111|222|333|444|555|666|777|888|999|aaa|bbb|ccc|ddd|eee|fff)$/i;

export const COPY_ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';

export const CHECK_ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';

interface RenderEnv {
  highlightQuery: string;
  interactive: boolean;
  inLinkDepth: number;
}

function renderHighlightedHtml(md: MarkdownIt, text: string, query: string): string {
  const q = query.trim();
  if (!q) return md.utils.escapeHtml(text);

  const regex = new RegExp(`(${escapeRegex(q)})`, 'gi');
  const parts = text.split(regex);
  if (parts.length === 1) return md.utils.escapeHtml(text);

  return parts
    .map((part) => {
      const escaped = md.utils.escapeHtml(part);
      return part.toLowerCase() === q.toLowerCase()
        ? `<mark class="search-mark">${escaped}</mark>`
        : escaped;
    })
    .join('');
}

function decorateTextHtml(md: MarkdownIt, text: string, env: RenderEnv): string {
  if (env.inLinkDepth > 0) {
    return renderHighlightedHtml(md, text, env.highlightQuery);
  }

  const tagRegex = /(^|[\s([{"'（【，。、：；！？])#([\p{L}\p{N}_][\p{L}\p{N}_\-/]{0,47})/gu;
  let result = '';
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(text)) !== null) {
    const fullStart = match.index;
    const prefix = match[1] ?? '';
    const rawTag = match[2].replace(/[/\-]+$/g, '');
    if (!rawTag || HEX_6_OR_8.test(rawTag) || HEX_3_COMMON.test(rawTag)) {
      continue;
    }

    const hashStart = fullStart + prefix.length;
    const tagEnd = hashStart + 1 + rawTag.length;

    if (hashStart > lastIndex) {
      result += renderHighlightedHtml(md, text.slice(lastIndex, hashStart), env.highlightQuery);
    }

    const safeTagAttr = md.utils.escapeHtml(rawTag);
    const labelHtml = renderHighlightedHtml(md, `#${rawTag}`, env.highlightQuery);
    result += `<button type="button" class="md-inline-tag" data-tag="${safeTagAttr}" title="按标签 #${safeTagAttr} 筛选">${labelHtml}</button>`;

    lastIndex = tagEnd;
  }

  if (lastIndex === 0) {
    return renderHighlightedHtml(md, text, env.highlightQuery);
  }
  if (lastIndex < text.length) {
    result += renderHighlightedHtml(md, text.slice(lastIndex), env.highlightQuery);
  }
  return result;
}

function addClassToToken(token: Token, className: string): void {
  const existing = token.attrGet('class');
  if (!existing) {
    token.attrSet('class', className);
  } else if (!existing.split(/\s+/).includes(className)) {
    token.attrSet('class', `${existing} ${className}`);
  }
}

function taskListPlugin(md: MarkdownIt): void {
  md.core.ruler.after('inline', 'telepad-task-lists', (state: StateCore) => {
    const tokens = state.tokens;
    let taskCounter = 0;

    // Track enclosing list open tokens via stack
    const listStack: Token[] = [];

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (token.type === 'bullet_list_open' || token.type === 'ordered_list_open') {
        listStack.push(token);
        continue;
      }
      if (token.type === 'bullet_list_close' || token.type === 'ordered_list_close') {
        listStack.pop();
        continue;
      }

      if (
        token.type === 'list_item_open' &&
        i + 2 < tokens.length &&
        tokens[i + 1].type === 'paragraph_open' &&
        tokens[i + 2].type === 'inline'
      ) {
        const inlineToken = tokens[i + 2];
        const children = inlineToken.children;
        if (!children || children.length === 0) continue;

        const firstChild = children[0];
        if (firstChild.type !== 'text') continue;

        const taskMatch = firstChild.content.match(/^\[([ xX])\](?:\s+|$)/);
        if (!taskMatch) continue;

        const checked = taskMatch[1].toLowerCase() === 'x';
        firstChild.content = firstChild.content.slice(taskMatch[0].length);

        const openToken = new state.Token('task_checkbox_open', '', 0);
        openToken.meta = { checked, index: taskCounter++ };

        const closeToken = new state.Token('task_checkbox_close', '', 0);

        inlineToken.children = [openToken, ...children, closeToken];

        addClassToToken(token, 'task-list-item');
        if (checked) {
          addClassToToken(token, 'is-checked');
        }
        const parentList = listStack[listStack.length - 1];
        if (parentList) {
          addClassToToken(parentList, 'contains-task-list');
        }
      }
    }
  });
}

function createMarkdownInstance(): MarkdownIt {
  const md = new MarkdownIt({
    html: false,
    linkify: true,
    breaks: false,
  });

  md.use(taskListPlugin);

  md.renderer.rules.task_checkbox_open = (tokens, idx, _options, env: RenderEnv) => {
    const meta = tokens[idx].meta as { checked: boolean; index: number };
    const checkedAttr = meta.checked ? ' checked' : '';
    const disabledAttr = env.interactive ? '' : ' disabled';
    return `<input type="checkbox" class="md-task-checkbox" data-task-index="${meta.index}"${checkedAttr}${disabledAttr} /><span style="flex: 1; min-width: 0;">`;
  };

  md.renderer.rules.task_checkbox_close = () => '</span>';

  const defaultLinkOpen =
    md.renderer.rules.link_open ??
    ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));

  md.renderer.rules.link_open = (tokens, idx, options, env: RenderEnv, self) => {
    env.inLinkDepth = (env.inLinkDepth ?? 0) + 1;
    tokens[idx].attrSet('target', '_blank');
    tokens[idx].attrSet('rel', 'noopener noreferrer');
    return defaultLinkOpen(tokens, idx, options, env, self);
  };

  const defaultLinkClose =
    md.renderer.rules.link_close ??
    ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));

  md.renderer.rules.link_close = (tokens, idx, options, env: RenderEnv, self) => {
    env.inLinkDepth = Math.max(0, (env.inLinkDepth ?? 1) - 1);
    return defaultLinkClose(tokens, idx, options, env, self);
  };

  md.renderer.rules.text = (tokens, idx, _options, env: RenderEnv) => {
    return decorateTextHtml(md, tokens[idx].content, env);
  };

  md.renderer.rules.fence = (tokens, idx) => {
    const token = tokens[idx];
    const info = token.info.trim();
    const rawLang = info ? info.split(/\s+/)[0] : 'text';
    const langMatch = rawLang.match(/^([a-zA-Z0-9_+-]+)/);
    const language = langMatch ? langMatch[1] : 'text';
    const code = token.content;

    let highlightedHtml: string;
    if (language !== 'text' && hljs.getLanguage(language)) {
      try {
        highlightedHtml = hljs.highlight(code, { language, ignoreIllegals: true }).value;
      } catch {
        highlightedHtml = md.utils.escapeHtml(code);
      }
    } else if (language !== 'text') {
      try {
        highlightedHtml = hljs.highlightAuto(code).value;
      } catch {
        highlightedHtml = md.utils.escapeHtml(code);
      }
    } else {
      highlightedHtml = md.utils.escapeHtml(code);
    }

    const safeLang = md.utils.escapeHtml(language);
    return (
      `<div class="md-code-block">` +
      `<div class="md-code-header">` +
      `<span class="md-code-lang">${safeLang}</span>` +
      `<button type="button" class="md-code-copy-btn" data-copy-code="1">` +
      `<span class="md-copy-icon">${COPY_ICON_SVG}</span>` +
      `<span class="md-copy-label">复制</span>` +
      `</button>` +
      `</div>` +
      `<pre><code class="hljs language-${safeLang}">${highlightedHtml}</code></pre>` +
      `</div>`
    );
  };

  return md;
}

const mdInstance = createMarkdownInstance();

export function renderTelepadMarkdown(
  content: string,
  options: { highlightQuery?: string; interactive?: boolean } = {}
): string {
  const env: RenderEnv = {
    highlightQuery: options.highlightQuery ?? '',
    interactive: options.interactive ?? true,
    inLinkDepth: 0,
  };
  return mdInstance.render(content, env);
}
