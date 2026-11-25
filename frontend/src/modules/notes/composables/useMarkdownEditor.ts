import { nextTick, ref, type Ref } from 'vue';
import type { SendKeyMode } from '@/core/types/common';

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

/** Encapsulate Markdown formatting insertion, textarea sizing, and send-key mode. */
export function useMarkdownEditor(
  content: Ref<string>,
  textareaRef: Ref<HTMLTextAreaElement | null>,
  previewMode: Ref<boolean>
) {
  const sendMode = ref<SendKeyMode>(getInitialSendMode());

  const toggleSendMode = () => {
    const next: SendKeyMode = sendMode.value === 'mod-enter' ? 'enter' : 'mod-enter';
    sendMode.value = next;
    try {
      localStorage.setItem(SEND_MODE_KEY, next);
    } catch {
      // ignore
    }
  };

  const resizeTextarea = async () => {
    await nextTick();
    const el = textareaRef.value;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
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

  const extractClipboardImages = (e: ClipboardEvent): File[] => {
    const items = Array.from(e.clipboardData?.items ?? []);
    const imageFiles: File[] = [];
    for (const item of items) {
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) imageFiles.push(file);
      }
    }
    return imageFiles;
  };

  const isSendShortcut = (e: KeyboardEvent): boolean => {
    if (e.isComposing) return false;
    if (sendMode.value === 'mod-enter') {
      return (e.metaKey || e.ctrlKey) && e.key === 'Enter';
    }
    return e.key === 'Enter' && !e.shiftKey;
  };

  return {
    sendMode,
    toggleSendMode,
    resizeTextarea,
    insertFormat,
    insertLinePrefix,
    extractClipboardImages,
    isSendShortcut,
  };
}
