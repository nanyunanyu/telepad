<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';
import { ChevronLeft, ChevronRight, Download, X } from 'lucide-vue-next';
import type { LightboxItem } from '@/core/types/common';
import { formatFileSize } from '@/shared/utils/formatTime';

const props = defineProps<{
  items: LightboxItem[];
  index: number;
}>();

const emit = defineEmits<{
  changeIndex: [nextIndex: number];
  close: [];
}>();

const current = computed(() => props.items[props.index] ?? null);

const onKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape') emit('close');
  if (e.key === 'ArrowLeft' && props.items.length > 1) {
    emit('changeIndex', (props.index - 1 + props.items.length) % props.items.length);
  }
  if (e.key === 'ArrowRight' && props.items.length > 1) {
    emit('changeIndex', (props.index + 1) % props.items.length);
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
        <span v-if="items.length > 1" style="font-size: 12px; opacity: 0.75">
          ({{ index + 1 }} / {{ items.length }})
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
        v-if="items.length > 1"
        type="button"
        class="lightbox-nav prev"
        aria-label="上一张"
        @click="emit('changeIndex', (index - 1 + items.length) % items.length)"
      >
        <ChevronLeft :size="24" />
      </button>

      <img :src="current.url" :alt="current.originalName" />

      <button
        v-if="items.length > 1"
        type="button"
        class="lightbox-nav next"
        aria-label="下一张"
        @click="emit('changeIndex', (index + 1) % items.length)"
      >
        <ChevronRight :size="24" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.lightbox-backdrop {
  position: fixed;
  inset: 0;
  z-index: 120;
  background: rgba(10, 14, 20, 0.92);
  display: flex;
  flex-direction: column;
  animation: fadeIn 0.14s ease;
}

.lightbox-topbar {
  height: 54px;
  padding: 0 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #ffffff;
}

.lightbox-stage {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: 16px 60px 28px;
  overflow: hidden;
}

.lightbox-stage img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
}

.lightbox-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.14);
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.lightbox-nav:hover {
  background: rgba(255, 255, 255, 0.24);
}

.lightbox-nav.prev {
  left: 16px;
}

.lightbox-nav.next {
  right: 16px;
}
</style>
