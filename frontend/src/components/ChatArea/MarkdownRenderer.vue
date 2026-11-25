<script setup lang="ts">
import { computed } from 'vue';
import {
  CHECK_ICON_SVG,
  COPY_ICON_SVG,
  renderTelepadMarkdown,
} from '../../utils/markdown';

const props = withDefaults(
  defineProps<{
    content: string;
    highlightQuery?: string;
    interactive?: boolean;
  }>(),
  {
    highlightQuery: '',
    interactive: true,
  }
);

const emit = defineEmits<{
  toggleCheckbox: [taskIndex: number];
  tagClick: [tag: string];
}>();

const renderedHtml = computed(() =>
  renderTelepadMarkdown(props.content, {
    highlightQuery: props.highlightQuery,
    interactive: props.interactive,
  })
);

const handleClick = async (e: MouseEvent) => {
  const target = e.target as HTMLElement | null;
  if (!target) return;

  const tagBtn = target.closest<HTMLButtonElement>('button.md-inline-tag[data-tag]');
  if (tagBtn) {
    e.stopPropagation();
    const tag = tagBtn.dataset.tag;
    if (tag) emit('tagClick', tag);
    return;
  }

  const copyBtn = target.closest<HTMLButtonElement>('button.md-code-copy-btn[data-copy-code]');
  if (copyBtn) {
    e.stopPropagation();
    const card = copyBtn.closest('.md-code-block');
    const codeEl = card?.querySelector('pre code');
    const rawCode = (codeEl?.textContent ?? '').replace(/\n$/, '');
    try {
      await navigator.clipboard.writeText(rawCode);
      const iconEl = copyBtn.querySelector('.md-copy-icon');
      const labelEl = copyBtn.querySelector('.md-copy-label');
      if (iconEl) iconEl.innerHTML = CHECK_ICON_SVG;
      if (labelEl) labelEl.textContent = '已复制';
      window.setTimeout(() => {
        if (iconEl) iconEl.innerHTML = COPY_ICON_SVG;
        if (labelEl) labelEl.textContent = '复制';
      }, 1800);
    } catch {
      // ignore clipboard errors
    }
  }
};

const handleChange = (e: Event) => {
  const target = e.target as HTMLInputElement | null;
  if (!target || !target.classList.contains('md-task-checkbox')) return;
  if (!props.interactive) return;
  const idxStr = target.dataset.taskIndex;
  if (idxStr !== undefined) {
    const idx = Number.parseInt(idxStr, 10);
    if (!Number.isNaN(idx)) {
      emit('toggleCheckbox', idx);
    }
  }
};
</script>

<template>
  <div
    class="md-content"
    @click="handleClick"
    @change="handleChange"
    v-html="renderedHtml"
  />
</template>
