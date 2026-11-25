<script setup lang="ts">
import { Hash, Pin, X } from 'lucide-vue-next';
import { useNotebookStore } from '@/modules/notebooks/stores/useNotebookStore';
import { useNoteStore } from '@/modules/notes/stores/useNoteStore';

const notebookStore = useNotebookStore();
const noteStore = useNoteStore();
</script>

<template>
  <div v-if="notebookStore.activeTag || noteStore.pinnedOnly" class="active-filter-banner">
    <div class="active-filter-info">
      <span>当前筛选：</span>
      <span v-if="notebookStore.activeTag" class="active-filter-pill">
        <Hash :size="12" />
        {{ notebookStore.activeTag }}
      </span>
      <span v-if="noteStore.pinnedOnly" class="active-filter-pill">
        <Pin :size="12" />
        仅置顶笔记
      </span>
      <span>（共 {{ noteStore.notes.length }} 条）</span>
    </div>
    <button
      type="button"
      class="toolbar-btn"
      @click="noteStore.clearFilters()"
    >
      <X :size="13" />
      <span>清除筛选</span>
    </button>
  </div>
</template>

<style scoped>
.active-filter-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 7px 16px;
  background: var(--tg-bg-surface);
  border-bottom: 1px solid var(--tg-border);
  font-size: 12.5px;
  color: var(--tg-text-secondary);
  z-index: 13;
}

.active-filter-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.active-filter-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 9px;
  border-radius: var(--radius-pill);
  background: var(--tg-accent-soft);
  color: var(--tg-accent);
  font-weight: 600;
}
</style>
