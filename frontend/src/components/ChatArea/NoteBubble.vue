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
import type { Attachment, Note } from '../../types';
import { formatBubbleTime } from '../../utils/formatTime';
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
