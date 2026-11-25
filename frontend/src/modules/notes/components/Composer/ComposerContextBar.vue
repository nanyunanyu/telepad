<script setup lang="ts">
import { computed } from 'vue';
import { X } from 'lucide-vue-next';
import type { Note } from '@/modules/notes/types';

const props = defineProps<{
  replyToNote: Note | null;
  editingNote: Note | null;
}>();

const emit = defineEmits<{
  cancel: [];
}>();

const contextPreview = computed(() => {
  const target = props.editingNote ?? props.replyToNote;
  if (!target) return '';
  return target.content.replace(/\s+/g, ' ').slice(0, 90) || '[图片笔记]';
});
</script>

<template>
  <div v-if="replyToNote || editingNote" class="composer-context-bar">
    <div class="composer-context-left">
      <div class="composer-context-bar-line" />
      <div style="min-width: 0">
        <div class="composer-context-title">
          {{ editingNote ? '编辑笔记' : '引用回复' }}
        </div>
        <div class="composer-context-preview">{{ contextPreview }}</div>
      </div>
    </div>
    <button
      type="button"
      class="icon-btn sm"
      title="取消"
      aria-label="取消当前操作"
      @click="emit('cancel')"
    >
      <X :size="16" />
    </button>
  </div>
</template>

<style scoped>
.composer-context-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 7px 12px;
  border-bottom: 1px solid var(--tg-border-subtle);
  background: var(--tg-bg-hover);
}

.composer-context-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.composer-context-bar-line {
  width: 3px;
  height: 28px;
  border-radius: 2px;
  background: var(--tg-accent);
  flex-shrink: 0;
}

.composer-context-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--tg-accent);
}

.composer-context-preview {
  font-size: 12.5px;
  color: var(--tg-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
