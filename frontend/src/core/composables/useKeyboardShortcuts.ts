import { onMounted, onUnmounted } from 'vue';

export interface ShortcutHandlers {
  onGlobalSearch: () => void;
  onInChatSearch: () => void;
  onEscape: () => void;
}

/** Register global Cmd/Ctrl+K, Cmd/Ctrl+F, and Escape keyboard shortcuts. */
export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  const handleKeyDown = (e: KeyboardEvent) => {
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      handlers.onGlobalSearch();
      return;
    }
    if (mod && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      handlers.onInChatSearch();
      return;
    }
    if (e.key === 'Escape') {
      handlers.onEscape();
    }
  };

  onMounted(() => {
    window.addEventListener('keydown', handleKeyDown);
  });

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown);
  });
}
