import { ref } from 'vue';

/** Scroll to and temporarily highlight a rendered note bubble by ID. */
export function useNoteScrollFocus() {
  const highlightedNoteId = ref<string | null>(null);
  let highlightTimer: number | null = null;

  const focusNoteElement = (noteId: string): boolean => {
    const el = document.getElementById(`note-${noteId}`);
    if (!el) return false;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    highlightedNoteId.value = null;
    window.requestAnimationFrame(() => {
      highlightedNoteId.value = noteId;
    });
    if (highlightTimer !== null) {
      window.clearTimeout(highlightTimer);
    }
    highlightTimer = window.setTimeout(() => {
      highlightedNoteId.value = null;
    }, 1900);
    return true;
  };

  return {
    highlightedNoteId,
    focusNoteElement,
  };
}
