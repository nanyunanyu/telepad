<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import {
  Bold,
  Check,
  CheckSquare,
  Code,
  Eye,
  FileCode2,
  Hash,
  Heading3,
  Italic,
  Paperclip,
  Pencil,
  Quote,
  Send,
  Strikethrough,
  X,
} from 'lucide-vue-next';
import type { Attachment, Note, SendKeyMode } from '../../types';
import MarkdownRenderer from './MarkdownRenderer.vue';

const SEND_MODE_KEY = 'telepad-send-mode';

function getInitialSendMode(): SendKeyMode {
  try {
    const saved = localStorage.getItem(SEND_MODE_KEY);
    if (saved === 'enter' || saved === 'mod-enter') return saved;
  } catch {
    // ignore
  }
  return 'mod-enter';
}

const props = defineProps<{
  notebookName: string;
  replyToNote: Note | null;
  editingNote: Note | null;
  pendingAttachments: Attachment[];
  uploadingImages: boolean;
  onSubmit: (content: string) => Promise<boolean>;
}>();

const emit = defineEmits<{
  cancelContext: [];
  uploadFiles: [files: File[]];
  removeAttachment: [att: Attachment];
}>();

const content = ref('');
const previewMode = ref(false);
const submitting = ref(false);
const sendMode = ref<SendKeyMode>(getInitialSendMode());

const textareaRef = ref<HTMLTextAreaElement | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);

const resizeTextarea = async () => {
  await nextTick();
  const el = textareaRef.value;
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
};

watch(
  () => props.editingNote,
  (note) => {
    if (note) {
      content.value = note.content;
      previewMode.value = false;
      window.setTimeout(() => {
        textareaRef.value?.focus();
        const len = note.content.length;
        textareaRef.value?.setSelectionRange(len, len);
      }, 20);
    }
  }
);

watch(
  () => props.replyToNote,
  (note) => {
    if (note) {
      textareaRef.value?.focus();
    }
  }
);

watch([content, previewMode], () => {
  void resizeTextarea();
});

const toggleSendMode = () => {
  const next: SendKeyMode = sendMode.value === 'mod-enter' ? 'enter' : 'mod-enter';
  sendMode.value = next;
  try {
    localStorage.setItem(SEND_MODE_KEY, next);
  } catch {
    // ignore
  }
};

const canSend = computed(
  () =>
    !submitting.value &&
    !props.uploadingImages &&
    (content.value.trim().length > 0 || props.pendingAttachments.length > 0)
);

const contextPreview = computed(() => {
  const target = props.editingNote ?? props.replyToNote;
  if (!target) return '';
  return target.content.replace(/\s+/g, ' ').slice(0, 90) || '[图片笔记]';
});

const handleSend = async () => {
  if (!canSend.value) return;
  submitting.value = true;
  try {
    const ok = await props.onSubmit(content.value);
    if (ok) {
      content.value = '';
      previewMode.value = false;
      if (textareaRef.value) {
        textareaRef.value.style.height = 'auto';
      }
    }
  } finally {
    submitting.value = false;
  }
};

const handleCancel = () => {
  if (props.editingNote) {
    content.value = '';
  }
  emit('cancelContext');
};

const insertFormat = (prefix: string, suffix = '', placeholder = '') => {
  const el = textareaRef.value;
  if (!el) {
    content.value += prefix + placeholder + suffix;
    return;
  }
  const start = el.selectionStart;
  const end = el.selectionEnd;
  const selected = content.value.slice(start, end) || placeholder;
  content.value =
    content.value.slice(0, start) + prefix + selected + suffix + content.value.slice(end);
  previewMode.value = false;
  window.requestAnimationFrame(() => {
    el.focus();
    const cursorStart = start + prefix.length;
    const cursorEnd = cursorStart + selected.length;
    el.setSelectionRange(cursorStart, cursorEnd);
  });
};

const insertLinePrefix = (linePrefix: string) => {
  const el = textareaRef.value;
  if (!el) {
    content.value = `${content.value ? `${content.value}\n` : ''}${linePrefix}`;
    return;
  }
  const start = el.selectionStart;
  const lineStart = content.value.lastIndexOf('\n', start - 1) + 1;
  content.value =
    content.value.slice(0, lineStart) + linePrefix + content.value.slice(lineStart);
  previewMode.value = false;
  window.requestAnimationFrame(() => {
    el.focus();
    const pos = start + linePrefix.length;
    el.setSelectionRange(pos, pos);
  });
};

const handlePaste = (e: ClipboardEvent) => {
  const items = Array.from(e.clipboardData?.items ?? []);
  const imageFiles: File[] = [];
  for (const item of items) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) imageFiles.push(file);
    }
  }
  if (imageFiles.length > 0) {
    e.preventDefault();
    emit('uploadFiles', imageFiles);
  }
};

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.isComposing) return;
  if (sendMode.value === 'mod-enter') {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      void handleSend();
    }
  } else if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    void handleSend();
  }
};

const handleFileInputChange = (e: Event) => {
  const input = e.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);
  input.value = '';
  if (files.length > 0) {
    emit('uploadFiles', files);
  }
};
</script>

<template>
  <div class="composer-outer">
    <div class="composer-card">
      <!-- Reply / Edit Context Strip -->
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
          @click="handleCancel"
        >
          <X :size="16" />
        </button>
      </div>

      <!-- Staged Image Attachments -->
      <div v-if="pendingAttachments.length > 0 || uploadingImages" class="composer-attachments">
        <div v-for="att in pendingAttachments" :key="att.id" class="composer-thumb">
          <img :src="att.url" :alt="att.originalName" />
          <button
            type="button"
            class="composer-thumb-remove"
            title="移除图片"
            aria-label="移除图片"
            @click="emit('removeAttachment', att)"
          >
            <X :size="12" />
          </button>
        </div>
        <div
          v-if="uploadingImages"
          class="composer-thumb"
          style="
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            color: var(--tg-text-secondary);
            background: var(--tg-bg-input);
          "
        >
          上传中...
        </div>
      </div>

      <!-- Markdown Formatting Toolbar -->
      <div class="composer-toolbar">
        <div class="composer-toolbar-group">
          <button
            type="button"
            class="toolbar-btn"
            title="加粗"
            @click="insertFormat('**', '**', '加粗文本')"
          >
            <Bold :size="14" />
          </button>
          <button
            type="button"
            class="toolbar-btn"
            title="斜体"
            @click="insertFormat('*', '*', '斜体文本')"
          >
            <Italic :size="14" />
          </button>
          <button
            type="button"
            class="toolbar-btn"
            title="删除线"
            @click="insertFormat('~~', '~~', '删除线')"
          >
            <Strikethrough :size="14" />
          </button>
          <button
            type="button"
            class="toolbar-btn"
            title="标题"
            @click="insertLinePrefix('### ')"
          >
            <Heading3 :size="14" />
          </button>
          <button
            type="button"
            class="toolbar-btn"
            title="待办清单 Checkbox"
            @click="insertLinePrefix('- [ ] ')"
          >
            <CheckSquare :size="14" />
          </button>
          <button
            type="button"
            class="toolbar-btn"
            title="引用"
            @click="insertLinePrefix('> ')"
          >
            <Quote :size="14" />
          </button>
          <button
            type="button"
            class="toolbar-btn"
            title="行内代码"
            @click="insertFormat('`', '`', 'code')"
          >
            <Code :size="14" />
          </button>
          <button
            type="button"
            class="toolbar-btn"
            title="代码块"
            @click="insertFormat('```ts\n', '\n```', '// 代码片段')"
          >
            <FileCode2 :size="14" />
          </button>
          <button
            type="button"
            class="toolbar-btn"
            title="插入标签"
            @click="insertFormat('#', '', '标签')"
          >
            <Hash :size="14" />
          </button>
        </div>

        <button
          type="button"
          :class="['toolbar-btn', { active: previewMode }]"
          title="切换 Markdown 实时预览"
          @click="previewMode = !previewMode"
        >
          <Pencil v-if="previewMode" :size="13" />
          <Eye v-else :size="13" />
          <span>{{ previewMode ? '继续编辑' : '实时预览' }}</span>
        </button>
      </div>

      <!-- Live Markdown Preview Pane -->
      <div v-if="previewMode" class="composer-preview-pane">
        <MarkdownRenderer v-if="content.trim()" :content="content" :interactive="false" />
        <div v-else style="font-size: 13px; color: var(--tg-text-muted)">
          暂无可预览的 Markdown 内容
        </div>
      </div>

      <!-- Main Message Input Row -->
      <div class="composer-input-row">
        <input
          ref="fileInputRef"
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp,image/avif"
          multiple
          style="display: none"
          @change="handleFileInputChange"
        />

        <button
          type="button"
          class="icon-btn"
          title="添加图片（也支持直接粘贴截图或拖拽上传）"
          aria-label="添加图片"
          @click="fileInputRef?.click()"
        >
          <Paperclip :size="19" />
        </button>

        <textarea
          ref="textareaRef"
          v-model="content"
          class="composer-textarea"
          rows="1"
          :placeholder="`发一条笔记到 ${notebookName}...（支持 Markdown、#标签、粘贴截图）`"
          aria-label="输入笔记内容"
          @paste="handlePaste"
          @keydown="handleKeyDown"
        />

        <button
          type="button"
          class="send-mode-btn"
          title="点击切换发送快捷键（Cmd/Ctrl+Enter 或 Enter）"
          @click="toggleSendMode"
        >
          {{ sendMode === 'mod-enter' ? '⌘↵ 发送' : '↵ 发送' }}
        </button>

        <button
          type="button"
          class="composer-send-btn"
          :disabled="!canSend"
          :title="editingNote ? '保存修改' : '发送笔记'"
          :aria-label="editingNote ? '保存修改' : '发送笔记'"
          @click="void handleSend()"
        >
          <Check v-if="editingNote" :size="20" />
          <Send v-else :size="18" />
        </button>
      </div>
    </div>
  </div>
</template>
