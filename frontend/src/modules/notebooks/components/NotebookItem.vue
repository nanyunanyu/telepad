<script setup lang="ts">
import { Pin } from 'lucide-vue-next';
import Avatar from '@/shared/components/Avatar.vue';
import { formatSidebarTime } from '@/shared/utils/formatTime';
import type { Notebook } from '@/modules/notebooks/types';

defineProps<{
  notebook: Notebook;
  active: boolean;
}>();

const emit = defineEmits<{
  select: [id: string];
  contextmenu: [event: MouseEvent, notebook: Notebook];
}>();
</script>

<template>
  <button
    type="button"
    :class="['notebook-item', { active }]"
    @click="emit('select', notebook.id)"
    @contextmenu="emit('contextmenu', $event, notebook)"
  >
    <Avatar :icon="notebook.icon" :color="notebook.avatarColor" />
    <div class="notebook-item-body">
      <div class="notebook-item-top">
        <span class="notebook-item-name">{{ notebook.name }}</span>
        <span class="notebook-item-time">
          {{ formatSidebarTime(notebook.lastNoteAt || notebook.updatedAt) }}
        </span>
      </div>
      <div class="notebook-item-bottom">
        <span class="notebook-item-preview">
          {{ notebook.lastNotePreview || notebook.description || '还没有笔记，发一条试试吧' }}
        </span>
        <span class="notebook-item-meta">
          <Pin v-if="notebook.isPinned" :size="13" class="notebook-pin-icon" />
          <span v-if="notebook.noteCount > 0" class="notebook-count-badge">
            {{ notebook.noteCount }}
          </span>
        </span>
      </div>
    </div>
  </button>
</template>

<style scoped>
.notebook-item {
  display: flex;
  align-items: center;
  gap: 11px;
  width: 100%;
  padding: 9px 10px;
  border-radius: var(--radius-md);
  text-align: left;
  transition: background-color 0.12s ease;
  user-select: none;
  position: relative;
}

.notebook-item:hover {
  background: var(--tg-bg-hover);
}

.notebook-item.active {
  background: var(--tg-bg-active);
  color: var(--tg-bg-active-text);
}

.notebook-item-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.notebook-item-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.notebook-item-name {
  font-size: 14.5px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.notebook-item-time {
  font-size: 11.5px;
  color: var(--tg-text-secondary);
  flex-shrink: 0;
}

.notebook-item.active .notebook-item-time {
  color: var(--tg-bg-active-sub);
}

.notebook-item-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.notebook-item-preview {
  font-size: 13px;
  color: var(--tg-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.notebook-item.active .notebook-item-preview {
  color: var(--tg-bg-active-sub);
}

.notebook-item-meta {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
}

.notebook-pin-icon {
  color: var(--tg-text-muted);
}

.notebook-item.active .notebook-pin-icon {
  color: var(--tg-bg-active-sub);
}

.notebook-count-badge {
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: var(--radius-pill);
  font-size: 11px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--tg-badge-bg);
  color: var(--tg-badge-text);
}

.notebook-item.active .notebook-count-badge {
  background: var(--tg-badge-active-bg);
  color: var(--tg-badge-active-text);
}
</style>
