<script setup lang="ts">
import { Pin } from 'lucide-vue-next';
import type { Notebook } from '../../types';
import { formatSidebarTime } from '../../utils/formatTime';
import Avatar from '../Common/Avatar.vue';

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
