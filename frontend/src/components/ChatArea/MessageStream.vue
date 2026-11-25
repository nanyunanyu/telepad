<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { ChevronDown, ImagePlus, Send } from 'lucide-vue-next';
import type { Attachment, Note } from '../../types';
import { formatDateSeparator, getDateKey } from '../../utils/formatTime';
import NoteBubble from './NoteBubble.vue';

const props = defineProps<{
  notes: Note[];
  loading: boolean;
  notebookName: string;
  highlightedNoteId: string | null;
  searchQuery: string;
  scrollTrigger: number;
}>();

const emit = defineEmits<{
  reply: [note: Note];
  edit: [note: Note];
  togglePin: [note: Note];
  copyMarkdown: [note: Note];
  toggleCheckbox: [noteId: string, taskIndex: number];
  jumpToNote: [noteId: string];
  tagClick: [tag: string];
  openLightbox: [attachments: Attachment[], index: number];
  noteContextMenu: [event: MouseEvent, note: Note];
  dropFiles: [files: File[]];
}>();

const viewportRef = ref<HTMLDivElement | null>(null);
const showScrollBottom = ref(false);
const dragging = ref(false);
let dragDepth = 0;

watch(
  () => props.scrollTrigger,
  async () => {
    await nextTick();
    const el = viewportRef.value;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }
);

const handleScroll = () => {
  const el = viewportRef.value;
  if (!el) return;
  const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
  showScrollBottom.value = distanceFromBottom > 220;
};

const scrollToBottom = () => {
  const el = viewportRef.value;
  if (!el) return;
  el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
};

const handleDragEnter = (e: DragEvent) => {
  if (!e.dataTransfer?.types.includes('Files')) return;
  e.preventDefault();
  dragDepth++;
  dragging.value = true;
};

const handleDragLeave = (e: DragEvent) => {
  if (!e.dataTransfer?.types.includes('Files')) return;
  e.preventDefault();
  dragDepth = Math.max(0, dragDepth - 1);
  if (dragDepth === 0) dragging.value = false;
};

const handleDragOver = (e: DragEvent) => {
  if (!e.dataTransfer?.types.includes('Files')) return;
  e.preventDefault();
};

const handleDrop = (e: DragEvent) => {
  e.preventDefault();
  dragDepth = 0;
  dragging.value = false;
  const files = Array.from(e.dataTransfer?.files ?? []).filter((f) =>
    f.type.startsWith('image/')
  );
  if (files.length > 0) {
    emit('dropFiles', files);
  }
};

type StreamItem =
  | { type: 'date'; key: string; label: string }
  | { type: 'note'; key: string; note: Note; showTail: boolean };

const items = computed<StreamItem[]>(() => {
  const list: StreamItem[] = [];
  let lastDateKey = '';

  for (let i = 0; i < props.notes.length; i++) {
    const note = props.notes[i];
    const dateKey = getDateKey(note.createdAt);
    if (dateKey !== lastDateKey) {
      list.push({
        type: 'date',
        key: `date-${dateKey}`,
        label: formatDateSeparator(note.createdAt),
      });
      lastDateKey = dateKey;
    }

    const next = props.notes[i + 1];
    const isLastBeforeBreak =
      !next ||
      getDateKey(next.createdAt) !== dateKey ||
      new Date(next.createdAt).getTime() - new Date(note.createdAt).getTime() > 5 * 60 * 1000;

    list.push({ type: 'note', key: note.id, note, showTail: isLastBeforeBreak });
  }
  return list;
});
</script>

<template>
  <div
    style="flex: 1; min-height: 0; position: relative; display: flex; flex-direction: column"
    @dragenter="handleDragEnter"
    @dragleave="handleDragLeave"
    @dragover="handleDragOver"
    @drop="handleDrop"
  >
    <div ref="viewportRef" class="stream-viewport" @scroll="handleScroll">
      <div class="stream-column">
        <div v-if="loading" class="stream-empty">
          <span class="stream-empty-title">加载笔记中...</span>
        </div>

        <div v-else-if="notes.length === 0" class="stream-empty">
          <Send :size="28" />
          <div class="stream-empty-title">{{ notebookName }} 暂无匹配笔记</div>
          <div class="stream-empty-sub">
            在下方输入 Markdown、使用 #标签 分类，或直接粘贴/拖拽图片发送第一条笔记吧。
          </div>
        </div>

        <template v-else>
          <template v-for="item in items" :key="item.key">
            <div v-if="item.type === 'date'" class="date-divider-wrap">
              <span class="date-divider-pill">{{ item.label }}</span>
            </div>
            <NoteBubble
              v-else
              :note="item.note"
              :show-tail="item.showTail"
              :highlighted="highlightedNoteId === item.note.id"
              :search-query="searchQuery"
              @reply="emit('reply', $event)"
              @edit="emit('edit', $event)"
              @toggle-pin="emit('togglePin', $event)"
              @copy-markdown="emit('copyMarkdown', $event)"
              @toggle-checkbox="(id, idx) => emit('toggleCheckbox', id, idx)"
              @jump-to-note="emit('jumpToNote', $event)"
              @tag-click="emit('tagClick', $event)"
              @open-lightbox="(atts, idx) => emit('openLightbox', atts, idx)"
              @contextmenu="(ev, note) => emit('noteContextMenu', ev, note)"
            />
          </template>
        </template>
      </div>
    </div>

    <button
      v-if="showScrollBottom"
      type="button"
      class="scroll-bottom-btn"
      title="回到底部最新笔记"
      aria-label="回到底部"
      @click="scrollToBottom"
    >
      <ChevronDown :size="22" />
    </button>

    <div v-if="dragging" class="drop-overlay">
      <div class="drop-overlay-card">
        <ImagePlus :size="34" />
        <span>释放图片以添加到当前笔记</span>
      </div>
    </div>
  </div>
</template>
