<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Check, Paperclip, Send } from 'lucide-vue-next';
import { useNotebookStore } from '@/modules/notebooks/stores/useNotebookStore';
import { useMarkdownEditor } from '@/modules/notes/composables/useMarkdownEditor';
import { useComposerStore } from '@/modules/notes/stores/useComposerStore';
import MarkdownRenderer from '@/modules/notes/components/MarkdownRenderer.vue';
import ComposerAttachments from './ComposerAttachments.vue';
import ComposerContextBar from './ComposerContextBar.vue';
import ComposerToolbar from './ComposerToolbar.vue';

const notebookStore = useNotebookStore();
const composerStore = useComposerStore();

const content = ref('');
const previewMode = ref(false);
const submitting = ref(false);
const textareaRef = ref<HTMLTextAreaElement | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);

const {
  sendMode,
  toggleSendMode,
  resizeTextarea,
  insertFormat,
  insertLinePrefix,
  extractClipboardImages,
  isSendShortcut,
} = useMarkdownEditor(content, textareaRef, previewMode);

const notebookName = computed(() => notebookStore.activeNotebook?.name ?? 'Saved Messages');

watch(
  () => composerStore.editingNote,
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
  () => composerStore.replyToNote,
  (note) => {
    if (note) {
      textareaRef.value?.focus();
    }
  }
);

watch([content, previewMode], () => {
  void resizeTextarea();
});

const canSend = computed(
  () =>
    !submitting.value &&
    !composerStore.uploadingImages &&
    (content.value.trim().length > 0 || composerStore.pendingAttachments.length > 0)
);

const handleSend = async () => {
  if (!canSend.value) return;
  submitting.value = true;
  try {
    const ok = await composerStore.submit(content.value);
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
  if (composerStore.editingNote) {
    content.value = '';
  }
  composerStore.cancelContext();
};

const handlePaste = (e: ClipboardEvent) => {
  const imageFiles = extractClipboardImages(e);
  if (imageFiles.length > 0) {
    e.preventDefault();
    void composerStore.uploadFiles(imageFiles);
  }
};

const handleKeyDown = (e: KeyboardEvent) => {
  if (isSendShortcut(e)) {
    e.preventDefault();
    void handleSend();
  }
};

const handleFileInputChange = (e: Event) => {
  const input = e.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);
  input.value = '';
  if (files.length > 0) {
    void composerStore.uploadFiles(files);
  }
};
</script>

<template>
  <div class="composer-outer">
    <div class="composer-card">
      <ComposerContextBar
        :reply-to-note="composerStore.replyToNote"
        :editing-note="composerStore.editingNote"
        @cancel="handleCancel"
      />

      <ComposerAttachments
        :attachments="composerStore.pendingAttachments"
        :uploading="composerStore.uploadingImages"
        @remove="composerStore.removePendingAttachment"
      />

      <ComposerToolbar
        :preview-mode="previewMode"
        @insert-format="insertFormat"
        @insert-line-prefix="insertLinePrefix"
        @toggle-preview="previewMode = !previewMode"
      />

      <div v-if="previewMode" class="composer-preview-pane">
        <MarkdownRenderer v-if="content.trim()" :content="content" :interactive="false" />
        <div v-else class="preview-empty">暂无可预览的 Markdown 内容</div>
      </div>

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
          :title="composerStore.editingNote ? '保存修改' : '发送笔记'"
          :aria-label="composerStore.editingNote ? '保存修改' : '发送笔记'"
          @click="void handleSend()"
        >
          <Check v-if="composerStore.editingNote" :size="20" />
          <Send v-else :size="18" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.composer-outer {
  padding: 8px 16px 12px;
  z-index: 16;
  flex-shrink: 0;
}

.composer-card {
  max-width: 780px;
  margin: 0 auto;
  background: var(--tg-bg-surface);
  border: 1px solid var(--tg-border);
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.composer-preview-pane {
  min-height: 76px;
  max-height: 240px;
  overflow-y: auto;
  padding: 10px 14px;
  background: var(--tg-bg-hover);
  border-bottom: 1px solid var(--tg-border-subtle);
}

.preview-empty {
  font-size: 13px;
  color: var(--tg-text-muted);
}

.composer-input-row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 8px 10px 8px 12px;
}

.composer-textarea {
  flex: 1;
  min-height: 36px;
  max-height: 220px;
  padding: 6px 2px;
  border: none;
  outline: none;
  resize: none;
  background: transparent;
  font-size: 14px;
  line-height: 1.5;
  color: var(--tg-text-primary);
}

.composer-textarea::placeholder {
  color: var(--tg-text-muted);
}

.send-mode-btn {
  height: 28px;
  padding: 0 8px;
  border-radius: var(--radius-pill);
  font-size: 11px;
  color: var(--tg-text-secondary);
  background: var(--tg-bg-input);
  white-space: nowrap;
  margin-bottom: 4px;
  transition: background-color 0.14s ease, color 0.14s ease;
}

.send-mode-btn:hover {
  background: var(--tg-accent-soft);
  color: var(--tg-accent);
}

.composer-send-btn {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: var(--tg-accent);
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background-color 0.15s ease, transform 0.12s ease, opacity 0.15s ease;
}

.composer-send-btn:hover:not(:disabled) {
  background: var(--tg-accent-hover);
  transform: scale(1.04);
}

.composer-send-btn:disabled {
  opacity: 0.42;
  cursor: default;
}
</style>
