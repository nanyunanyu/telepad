<script setup lang="ts">
import { computed } from 'vue';
import {
  CheckCheck,
  Copy,
  Edit3,
  MoreHorizontal,
  Pin,
  PinOff,
  Reply,
} from 'lucide-vue-next';
import { formatBubbleTime } from '@/shared/utils/formatTime';
import type { Attachment, Note } from '@/modules/notes/types';
import MarkdownRenderer from './MarkdownRenderer.vue';

const props = defineProps<{
  note: Note;
  showTail: boolean;
  highlighted: boolean;
  searchQuery: string;
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
  contextmenu: [event: MouseEvent, note: Note];
}>();

const imageCountClass = computed(() =>
  props.note.attachments.length === 1
    ? 'count-1'
    : props.note.attachments.length === 2
      ? 'count-2'
      : 'count-many'
);
</script>

<template>
  <div
    :id="`note-${note.id}`"
    :class="['note-row', { highlighted }]"
    @contextmenu="emit('contextmenu', $event, note)"
  >
    <div class="note-hover-actions" aria-label="快捷操作">
      <button
        type="button"
        class="bubble-action-btn"
        title="引用回复"
        @click="emit('reply', note)"
      >
        <Reply :size="14" />
      </button>
      <button
        type="button"
        class="bubble-action-btn"
        title="编辑笔记"
        @click="emit('edit', note)"
      >
        <Edit3 :size="14" />
      </button>
      <button
        type="button"
        class="bubble-action-btn"
        :title="note.isPinned ? '取消置顶' : '置顶笔记'"
        @click="emit('togglePin', note)"
      >
        <PinOff v-if="note.isPinned" :size="14" />
        <Pin v-else :size="14" />
      </button>
      <button
        type="button"
        class="bubble-action-btn"
        title="复制 Markdown"
        @click="emit('copyMarkdown', note)"
      >
        <Copy :size="14" />
      </button>
      <button
        type="button"
        class="bubble-action-btn"
        title="更多操作"
        @click="emit('contextmenu', $event, note)"
      >
        <MoreHorizontal :size="14" />
      </button>
    </div>

    <article :class="['note-bubble', { 'with-tail': showTail }]">
      <button
        v-if="note.replyTo"
        type="button"
        class="bubble-reply-quote"
        title="点击跳转到原笔记"
        @click="emit('jumpToNote', note.replyTo.id)"
      >
        <span class="bubble-reply-label">↩ 引用笔记</span>
        <span class="bubble-reply-text">
          <template v-if="note.replyTo.hasImages">🖼️ </template>
          {{ note.replyTo.content || '[图片笔记]' }}
        </span>
      </button>

      <div v-if="note.attachments.length > 0" :class="['bubble-images', imageCountClass]">
        <button
          v-for="(att, idx) in note.attachments"
          :key="att.id"
          type="button"
          class="bubble-image-tile"
          title="点击查看大图"
          @click="emit('openLightbox', note.attachments, idx)"
        >
          <img :src="att.url" :alt="att.originalName" loading="lazy" />
        </button>
      </div>

      <MarkdownRenderer
        v-if="note.content.trim().length > 0"
        :content="note.content"
        :highlight-query="searchQuery"
        @toggle-checkbox="(taskIdx) => emit('toggleCheckbox', note.id, taskIdx)"
        @tag-click="(tag) => emit('tagClick', tag)"
      />

      <footer class="bubble-footer">
        <span v-if="note.isPinned" class="bubble-pinned-pill" title="已置顶">
          <Pin :size="11" />
        </span>
        <span v-if="note.editedAt">已编辑</span>
        <span>{{ formatBubbleTime(note.createdAt) }}</span>
        <CheckCheck :size="14" aria-label="已保存到本地" />
      </footer>

      <svg
        v-if="showTail"
        class="bubble-tail-svg"
        viewBox="0 0 9 16"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M0 0 C0 9 4 14 9 16 L0 16 Z" />
      </svg>
    </article>
  </div>
</template>

<style scoped>
.note-row {
  display: flex;
  justify-content: flex-end;
  align-items: flex-end;
  gap: 8px;
  padding: 2px 4px;
  border-radius: 12px;
  position: relative;
  transition: background-color 0.2s ease;
}

.note-row.highlighted {
  animation: telegramHighlightPulse 1.8s ease;
}

@keyframes telegramHighlightPulse {
  0% {
    background-color: var(--tg-pulse-color);
  }
  70% {
    background-color: var(--tg-pulse-color);
  }
  100% {
    background-color: transparent;
  }
}

.note-hover-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 3px 4px;
  border-radius: var(--radius-pill);
  background: var(--tg-menu-bg);
  box-shadow: var(--tg-bubble-shadow);
  opacity: 0;
  transform: translateX(4px);
  transition: opacity 0.14s ease, transform 0.14s ease;
  align-self: center;
  flex-shrink: 0;
}

.note-row:hover .note-hover-actions,
.note-row:focus-within .note-hover-actions {
  opacity: 1;
  transform: translateX(0);
}

.bubble-action-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--tg-text-secondary);
  transition: background-color 0.12s ease, color 0.12s ease;
}

.bubble-action-btn:hover {
  background: var(--tg-bg-hover);
  color: var(--tg-accent);
}

.note-bubble {
  position: relative;
  max-width: min(86%, 620px);
  min-width: 140px;
  padding: 8px 12px 7px;
  border-radius: 14px 14px 4px 14px;
  background: var(--tg-bubble-bg);
  border: 1px solid var(--tg-bubble-border);
  box-shadow: var(--tg-bubble-shadow);
  color: var(--tg-text-primary);
  word-wrap: break-word;
  overflow-wrap: anywhere;
  animation: bubblePopIn 0.16s ease;
}

.note-bubble.with-tail {
  border-bottom-right-radius: 4px;
}

.bubble-tail-svg {
  position: absolute;
  right: -7px;
  bottom: -1px;
  width: 9px;
  height: 16px;
  color: var(--tg-bubble-bg);
  pointer-events: none;
}

@keyframes bubblePopIn {
  from {
    opacity: 0;
    transform: translateY(6px) scale(0.985);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.bubble-reply-quote {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 5px 9px;
  margin-bottom: 6px;
  border-radius: 6px;
  border-left: 3px solid var(--tg-bubble-reply-bar);
  background: var(--tg-bubble-reply-bg);
  cursor: pointer;
  transition: background-color 0.12s ease;
  text-align: left;
  width: 100%;
}

.bubble-reply-quote:hover {
  background: var(--tg-bubble-reply-hover);
}

.bubble-reply-label {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--tg-bubble-reply-bar);
}

.bubble-reply-text {
  font-size: 12.5px;
  color: var(--tg-text-primary);
  opacity: 0.85;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bubble-images {
  display: grid;
  gap: 4px;
  margin-bottom: 6px;
  border-radius: 9px;
  overflow: hidden;
}

.bubble-images.count-1 {
  grid-template-columns: 1fr;
}

.bubble-images.count-2 {
  grid-template-columns: repeat(2, 1fr);
}

.bubble-images.count-many {
  grid-template-columns: repeat(3, 1fr);
}

.bubble-image-tile {
  position: relative;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.08);
  cursor: zoom-in;
  display: block;
}

.bubble-images.count-1 .bubble-image-tile img {
  max-height: 340px;
  width: 100%;
  object-fit: cover;
  display: block;
}

.bubble-images.count-2 .bubble-image-tile img,
.bubble-images.count-many .bubble-image-tile img {
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  display: block;
}

.bubble-image-tile:hover img {
  filter: brightness(0.95);
}

.bubble-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 5px;
  margin-top: 4px;
  font-size: 11px;
  color: var(--tg-bubble-meta);
  user-select: none;
}

.bubble-pinned-pill {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-weight: 600;
}

@media (max-width: 768px) {
  .note-bubble {
    max-width: 92%;
  }

  .note-hover-actions {
    display: none;
  }
}
</style>
