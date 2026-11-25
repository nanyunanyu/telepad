<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';
import { ChevronLeft, ChevronRight, Download, X } from 'lucide-vue-next';
import type { Attachment } from '../../types';
import { formatFileSize } from '../../utils/formatTime';

const props = defineProps<{
  attachments: Attachment[];
  index: number;
}>();

const emit = defineEmits<{
  changeIndex: [nextIndex: number];
  close: [];
}>();

const current = computed(() => props.attachments[props.index] ?? null);

const onKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape') emit('close');
  if (e.key === 'ArrowLeft' && props.attachments.length > 1) {
    emit('changeIndex', (props.index - 1 + props.attachments.length) % props.attachments.length);
  }
  if (e.key === 'ArrowRight' && props.attachments.length > 1) {
    emit('changeIndex', (props.index + 1) % props.attachments.length);
  }
};

onMounted(() => {
  window.addEventListener('keydown', onKey);
});

onUnmounted(() => {
  window.removeEventListener('keydown', onKey);
});
</script>

<template>
  <div v-if="current" class="lightbox-backdrop" @click="emit('close')">
    <div class="lightbox-topbar" @click.stop>
      <div style="display: flex; align-items: center; gap: 10px">
        <span style="font-weight: 600; font-size: 14px">{{ current.originalName }}</span>
        <span style="font-size: 12px; opacity: 0.7">{{ formatFileSize(current.size) }}</span>
        <span v-if="attachments.length > 1" style="font-size: 12px; opacity: 0.75">
          ({{ index + 1 }} / {{ attachments.length }})
        </span>
      </div>
      <div style="display: flex; align-items: center; gap: 8px">
        <a
          :href="current.url"
          :download="current.originalName"
          class="icon-btn"
          style="color: #ffffff"
          title="下载原图"
        >
          <Download :size="18" />
        </a>
        <button
          type="button"
          class="icon-btn"
          style="color: #ffffff"
          aria-label="关闭大图"
          @click="emit('close')"
        >
          <X :size="20" />
        </button>
      </div>
    </div>

    <div class="lightbox-stage" @click.stop>
      <button
        v-if="attachments.length > 1"
        type="button"
        class="lightbox-nav prev"
        aria-label="上一张"
        @click="emit('changeIndex', (index - 1 + attachments.length) % attachments.length)"
      >
        <ChevronLeft :size="24" />
      </button>

      <img :src="current.url" :alt="current.originalName" />

      <button
        v-if="attachments.length > 1"
        type="button"
        class="lightbox-nav next"
        aria-label="下一张"
        @click="emit('changeIndex', (index + 1) % attachments.length)"
      >
        <ChevronRight :size="24" />
      </button>
    </div>
  </div>
</template>
