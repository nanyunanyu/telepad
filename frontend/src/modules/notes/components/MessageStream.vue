<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import {
  ChevronDown,
  Copy,
  Download,
  Edit3,
  Forward,
  ImagePlus,
  Pin,
  PinOff,
  Reply,
  Send,
  Trash2,
} from 'lucide-vue-next';
import { useWorkspaceCoordinator } from '@/core/composables/useWorkspaceCoordinator';
import { useUiStore } from '@/core/stores/useUiStore';
import { useContextMenu } from '@/shared/composables/useContextMenu';
import { formatDateSeparator, getDateKey } from '@/shared/utils/formatTime';
import { useNotebookStore } from '@/modules/notebooks/stores/useNotebookStore';
import { notesApi } from '@/modules/notes/api/notesApi';
import { useComposerStore } from '@/modules/notes/stores/useComposerStore';
import { useNoteStore } from '@/modules/notes/stores/useNoteStore';
import type { Note } from '@/modules/notes/types';
import { useSearchStore } from '@/modules/search/stores/useSearchStore';
import NoteBubble from './NoteBubble.vue';

const ui = useUiStore();
const notebookStore = useNotebookStore();
const noteStore = useNoteStore();
const composerStore = useComposerStore();
const searchStore = useSearchStore();
const coordinator = useWorkspaceCoordinator();
const { openContextMenu } = useContextMenu();

const viewportRef = ref<HTMLDivElement | null>(null);
const showScrollBottom = ref(false);
const dragging = ref(false);
let dragDepth = 0;

const notebookName = computed(() => notebookStore.activeNotebook?.name ?? 'Telepad');

watch(
  () => noteStore.scrollTrigger,
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
    void composerStore.uploadFiles(files);
  }
};

const handleNoteContextMenu = (e: MouseEvent, note: Note) => {
  openContextMenu(e, [
    {
      id: 'reply',
      label: '引用回复',
      icon: Reply,
      onSelect: () => composerStore.startReply(note),
    },
    {
      id: 'edit',
      label: '编辑笔记',
      icon: Edit3,
      onSelect: () => composerStore.startEdit(note),
    },
    {
      id: 'pin',
      label: note.isPinned ? '取消置顶' : '置顶笔记',
      icon: note.isPinned ? PinOff : Pin,
      onSelect: () => void noteStore.togglePinNote(note),
    },
    {
      id: 'copy',
      label: '复制 Markdown',
      icon: Copy,
      onSelect: () => void noteStore.copyMarkdown(note),
    },
    {
      id: 'forward',
      label: '转发 / 移动',
      icon: Forward,
      onSelect: () => {
        noteStore.forwardingNote = note;
      },
    },
    {
      id: 'export',
      label: '导出单篇 .md',
      icon: Download,
      onSelect: () => {
        window.location.href = notesApi.getExportUrl(note.id);
      },
    },
    {
      id: 'delete',
      label: '删除笔记',
      icon: Trash2,
      danger: true,
      dividerBefore: true,
      onSelect: () => void coordinator.deleteNote(note),
    },
  ]);
};

type StreamItem =
  | { type: 'date'; key: string; label: string }
  | { type: 'note'; key: string; note: Note; showTail: boolean };

const items = computed<StreamItem[]>(() => {
  const list: StreamItem[] = [];
  let lastDateKey = '';

  for (let i = 0; i < noteStore.notes.length; i++) {
    const note = noteStore.notes[i];
    const dateKey = getDateKey(note.createdAt);
    if (dateKey !== lastDateKey) {
      list.push({
        type: 'date',
        key: `date-${dateKey}`,
        label: formatDateSeparator(note.createdAt),
      });
      lastDateKey = dateKey;
    }

    const next = noteStore.notes[i + 1];
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
    class="stream-container"
    @dragenter="handleDragEnter"
    @dragleave="handleDragLeave"
    @dragover="handleDragOver"
    @drop="handleDrop"
  >
    <div ref="viewportRef" class="stream-viewport" @scroll="handleScroll">
      <div class="stream-column">
        <div v-if="noteStore.notesLoading" class="stream-empty">
          <span class="stream-empty-title">加载笔记中...</span>
        </div>

        <div v-else-if="noteStore.notes.length === 0" class="stream-empty">
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
              :highlighted="noteStore.highlightedNoteId === item.note.id"
              :search-query="searchStore.activeHighlightQuery"
              @reply="composerStore.startReply"
              @edit="composerStore.startEdit"
              @toggle-pin="noteStore.togglePinNote"
              @copy-markdown="noteStore.copyMarkdown"
              @toggle-checkbox="noteStore.toggleCheckbox"
              @jump-to-note="noteStore.jumpToNote"
              @tag-click="notebookStore.toggleTag"
              @open-lightbox="(atts, idx) => ui.openLightbox(atts, idx)"
              @contextmenu="handleNoteContextMenu"
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

<style scoped>
.stream-container {
  flex: 1;
  min-height: 0;
  position: relative;
  display: flex;
  flex-direction: column;
}

.stream-viewport {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 14px 16px 20px;
  position: relative;
  scroll-behavior: smooth;
}

.stream-column {
  max-width: 780px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 100%;
}

.date-divider-wrap {
  position: sticky;
  top: 6px;
  z-index: 6;
  display: flex;
  justify-content: center;
  margin: 10px 0 6px;
  pointer-events: none;
}

.date-divider-pill {
  padding: 3px 12px;
  border-radius: var(--radius-pill);
  background: var(--tg-date-pill-bg);
  color: var(--tg-date-pill-text);
  font-size: 12px;
  font-weight: 600;
  backdrop-filter: blur(8px);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
}

.stream-empty {
  margin: auto;
  max-width: 340px;
  padding: 22px 24px;
  border-radius: var(--radius-lg);
  background: var(--tg-date-pill-bg);
  color: var(--tg-date-pill-text);
  text-align: center;
  backdrop-filter: blur(10px);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.stream-empty-title {
  font-size: 15px;
  font-weight: 600;
}

.stream-empty-sub {
  font-size: 12.5px;
  opacity: 0.9;
}

.scroll-bottom-btn {
  position: absolute;
  right: 22px;
  bottom: 18px;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: var(--tg-bg-surface);
  color: var(--tg-text-secondary);
  border: 1px solid var(--tg-border);
  box-shadow: var(--tg-menu-shadow);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  z-index: 12;
  transition: transform 0.16s ease, color 0.16s ease;
}

.scroll-bottom-btn:hover {
  color: var(--tg-accent);
  transform: translateY(-2px);
}

.drop-overlay {
  position: absolute;
  inset: 14px;
  z-index: 40;
  border-radius: var(--radius-lg);
  border: 2.5px dashed var(--tg-accent);
  background: rgba(51, 144, 236, 0.16);
  backdrop-filter: blur(6px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--tg-text-primary);
  pointer-events: none;
}

.drop-overlay-card {
  padding: 18px 28px;
  border-radius: var(--radius-lg);
  background: var(--tg-bg-surface);
  box-shadow: var(--tg-menu-shadow);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: var(--tg-accent);
  font-weight: 600;
}
</style>
