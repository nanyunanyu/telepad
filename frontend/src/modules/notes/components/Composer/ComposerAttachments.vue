<script setup lang="ts">
import { X } from 'lucide-vue-next';
import type { Attachment } from '@/modules/notes/types';

defineProps<{
  attachments: Attachment[];
  uploading: boolean;
}>();

const emit = defineEmits<{
  remove: [att: Attachment];
}>();
</script>

<template>
  <div v-if="attachments.length > 0 || uploading" class="composer-attachments">
    <div v-for="att in attachments" :key="att.id" class="composer-thumb">
      <img :src="att.url" :alt="att.originalName" />
      <button
        type="button"
        class="composer-thumb-remove"
        title="移除图片"
        aria-label="移除图片"
        @click="emit('remove', att)"
      >
        <X :size="12" />
      </button>
    </div>
    <div v-if="uploading" class="composer-thumb composer-thumb-uploading">
      上传中...
    </div>
  </div>
</template>

<style scoped>
.composer-attachments {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px 4px;
  overflow-x: auto;
}

.composer-thumb {
  position: relative;
  width: 68px;
  height: 68px;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid var(--tg-border);
  flex-shrink: 0;
}

.composer-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.composer-thumb-remove {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.65);
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.composer-thumb-uploading {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: var(--tg-text-secondary);
  background: var(--tg-bg-input);
}
</style>
