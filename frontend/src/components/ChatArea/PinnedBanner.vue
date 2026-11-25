<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Pin, PinOff } from 'lucide-vue-next';
import type { Note } from '../../types';

const props = defineProps<{
  pinnedNotes: Note[];
}>();

const emit = defineEmits<{
  jumpToNote: [noteId: string];
  unpin: [note: Note];
  togglePinnedFilter: [];
}>();

const index = ref(0);

watch(
  () => props.pinnedNotes.length,
  (len) => {
    if (index.value >= len) {
      index.value = 0;
    }
  }
);

const ordered = computed(() => [...props.pinnedNotes].reverse());
const safeIndex = computed(() => (ordered.value.length > 0 ? index.value % ordered.value.length : 0));
const active = computed(() => ordered.value[safeIndex.value] ?? null);
const segments = computed(() => Math.min(ordered.value.length, 5));
const activeSeg = computed(() => Math.min(safeIndex.value, Math.max(0, segments.value - 1)));

function getPreview(note: Note): string {
  const flat = note.content
    .replace(/```[\s\S]*?```/g, '[代码块]')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_~`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (flat) return flat;
  if (note.attachments.length > 0) return `🖼️ [图片 ×${note.attachments.length}]`;
  return '置顶笔记';
}

const handleBannerClick = () => {
  if (!active.value) return;
  emit('jumpToNote', active.value.id);
  if (ordered.value.length > 1) {
    index.value = (index.value + 1) % ordered.value.length;
  }
};
</script>

<template>
  <div
    v-if="active"
    class="pinned-banner"
    role="button"
    tabindex="0"
    @click="handleBannerClick"
    @keydown.enter="handleBannerClick"
  >
    <div class="pinned-bars" aria-hidden="true">
      <span
        v-for="i in segments"
        :key="i"
        :class="['pinned-bar-seg', { active: i - 1 === activeSeg }]"
      />
    </div>

    <div class="pinned-banner-content">
      <span class="pinned-banner-label">
        <Pin :size="12" />
        <span>
          置顶笔记 {{ ordered.length > 1 ? `#${safeIndex + 1} / ${ordered.length}` : '' }}
        </span>
      </span>
      <span class="pinned-banner-preview">{{ getPreview(active) }}</span>
    </div>

    <button
      v-if="ordered.length > 1"
      type="button"
      class="toolbar-btn"
      title="仅查看全部置顶"
      @click.stop="emit('togglePinnedFilter')"
    >
      全部 ({{ ordered.length }})
    </button>

    <button
      type="button"
      class="icon-btn sm"
      title="取消该条置顶"
      aria-label="取消置顶"
      @click.stop="emit('unpin', active)"
    >
      <PinOff :size="15" />
    </button>
  </div>
</template>
