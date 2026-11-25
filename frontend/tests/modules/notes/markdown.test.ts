import { describe, expect, it } from 'vitest';
import { renderTelepadMarkdown } from '@/modules/notes/utils/markdown';

describe('modules/notes/utils/markdown', () => {
  it('renders interactive and read-only task list checkboxes with sequential indices', () => {
    const md = '- [ ] 第一项\n- [x] 第二项';
    const interactiveHtml = renderTelepadMarkdown(md, { interactive: true });
    expect(interactiveHtml).toContain('data-task-index="0"');
    expect(interactiveHtml).toContain('data-task-index="1" checked');
    expect(interactiveHtml).not.toContain(' disabled');

    const previewHtml = renderTelepadMarkdown(md, { interactive: false });
    expect(previewHtml).toContain(' disabled');
  });

  it('renders inline clickable tags while skipping hex color literals', () => {
    const html = renderTelepadMarkdown('记录 #工作 与 #typescript，颜色 #3390ec 与 #fff 不算标签');
    expect(html).toContain('<button type="button" class="md-inline-tag" data-tag="工作"');
    expect(html).toContain('data-tag="typescript"');
    expect(html).not.toContain('data-tag="3390ec"');
    expect(html).not.toContain('data-tag="fff"');
  });

  it('highlights search matches and renders fenced code block headers', () => {
    const html = renderTelepadMarkdown('Hello Telepad\n\n```ts\nconst x = 1;\n```', {
      highlightQuery: 'telepad',
    });
    expect(html).toContain('<mark class="search-mark">Telepad</mark>');
    expect(html).toContain('class="md-code-block"');
    expect(html).toContain('class="md-code-copy-btn"');
  });
});
