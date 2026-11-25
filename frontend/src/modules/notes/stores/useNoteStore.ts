import { ref, watch } from 'vue';
import { defineStore } from 'pinia';
import { useUiStore } from '@/core/stores/useUiStore';
import { notebooksApi } from '@/modules/notebooks/api/notebooksApi';
import { useNotebookStore } from '@/modules/notebooks/stores/useNotebookStore';
import { notesApi } from '@/modules/notes/api/notesApi';
import { useNoteScrollFocus } from '@/modules/notes/composables/useNoteScrollFocus';
import type { Note } from '@/modules/notes/types';

/** Manage note stream, pinning, checkboxes, forwarding, deletion, and jump-to-note scrolling. */
export const useNoteStore = defineStore('notes', () => {
  const ui = useUiStore();
  const notebookStore = useNotebookStore();
  const { highlightedNoteId, focusNoteElement } = useNoteScrollFocus();

  const notes = ref<Note[]>([]);
  const channelPinnedNotes = ref<Note[]>([]);
  const notesLoading = ref(true);
  const pinnedOnly = ref(false);
  const forwardingNote = ref<Note | null>(null);

  const scrollTrigger = ref(0);
  const pendingJumpNoteId = ref<string | null>(null);

  const refreshNotes = async (
    nbId: string,
    tag: string | null,
    onlyPinned: boolean,
    scrollBottom = false
  ) => {
    if (!nbId) return;
    notesLoading.value = true;
    try {
      const [noteList, pinnedList, tagList] = await Promise.all([
        notesApi.listNotes(nbId, { tag: tag ?? undefined, pinnedOnly: onlyPinned }),
        tag || onlyPinned ? notesApi.listNotes(nbId, { pinnedOnly: true }) : Promise.resolve(null),
        notebooksApi.listTags(),
      ]);
      notes.value = noteList;
      channelPinnedNotes.value = pinnedList ?? noteList.filter((n) => n.isPinned);
      notebookStore.tags = tagList;
      if (scrollBottom) {
        scrollTrigger.value += 1;
      }
    } catch (err) {
      ui.showToast(err instanceof Error ? err.message : '加载笔记失败', true);
    } finally {
      notesLoading.value = false;
    }
  };

  const jumpToNote = (noteId: string) => {
    if (!focusNoteElement(noteId)) {
      pendingJumpNoteId.value = noteId;
      if (notebookStore.activeTag || pinnedOnly.value) {
        notebookStore.setActiveTag(null);
        pinnedOnly.value = false;
      }
    }
  };

  // Reload notes whenever active notebook or filter changes
  watch(
    [() => notebookStore.activeNotebookId, () => notebookStore.activeTag, pinnedOnly],
    ([nbId, tag, onlyPinned]) => {
      if (!nbId) return;
      void refreshNotes(nbId, tag, onlyPinned, !pendingJumpNoteId.value);
    }
  );

  // Resolve pending jump once target channel notes finish loading
  watch([pendingJumpNoteId, notes, notesLoading], ([targetId, noteList, loading]) => {
    if (!targetId || loading) return;
    const found = noteList.some((n) => n.id === targetId);
    if (found) {
      window.setTimeout(() => {
        focusNoteElement(targetId);
        pendingJumpNoteId.value = null;
      }, 60);
    } else if (notebookStore.activeTag || pinnedOnly.value) {
      notebookStore.setActiveTag(null);
      pinnedOnly.value = false;
    } else {
      pendingJumpNoteId.value = null;
    }
  });

  const toggleCheckbox = async (noteId: string, taskIndex: number) => {
    try {
      const updated = await notesApi.toggleCheckbox(noteId, taskIndex);
      notes.value = notes.value.map((n) => (n.id === updated.id ? updated : n));
      channelPinnedNotes.value = channelPinnedNotes.value.map((n) =>
        n.id === updated.id ? updated : n
      );
      await notebookStore.refreshNotebooksAndTags();
    } catch (err) {
      ui.showToast(err instanceof Error ? err.message : '更新待办失败', true);
    }
  };

  const togglePinNote = async (note: Note) => {
    try {
      const updated = await notesApi.togglePinNote(note.id, !note.isPinned);
      if (pinnedOnly.value && !updated.isPinned) {
        notes.value = notes.value.filter((n) => n.id !== updated.id);
      } else {
        notes.value = notes.value.map((n) => (n.id === updated.id ? updated : n));
      }
      channelPinnedNotes.value = updated.isPinned
        ? [...channelPinnedNotes.value.filter((n) => n.id !== updated.id), updated]
        : channelPinnedNotes.value.filter((n) => n.id !== updated.id);
      await notebookStore.refreshNotebooksAndTags();
      ui.showToast(updated.isPinned ? '已置顶笔记' : '已取消置顶');
    } catch (err) {
      ui.showToast(err instanceof Error ? err.message : '操作失败', true);
    }
  };

  const copyMarkdown = async (note: Note) => {
    try {
      await navigator.clipboard.writeText(note.content);
      ui.showToast('已复制 Markdown 原文');
    } catch {
      ui.showToast('复制失败，请检查剪贴板权限', true);
    }
  };

  const deleteNote = async (note: Note): Promise<boolean> => {
    if (!window.confirm('确定删除这条笔记吗？此操作无法撤销。')) return false;
    try {
      await notesApi.deleteNote(note.id);
      notes.value = notes.value.filter((n) => n.id !== note.id);
      channelPinnedNotes.value = channelPinnedNotes.value.filter((n) => n.id !== note.id);
      await notebookStore.refreshNotebooksAndTags();
      ui.showToast('笔记已删除');
      return true;
    } catch (err) {
      ui.showToast(err instanceof Error ? err.message : '删除失败', true);
      return false;
    }
  };

  const forwardNote = async (targetNotebookId: string, mode: 'copy' | 'move') => {
    if (!forwardingNote.value) return;
    await notesApi.forwardNote(forwardingNote.value.id, targetNotebookId, mode);
    if (mode === 'move' && targetNotebookId !== notebookStore.activeNotebookId) {
      notes.value = notes.value.filter((n) => n.id !== forwardingNote.value!.id);
      channelPinnedNotes.value = channelPinnedNotes.value.filter(
        (n) => n.id !== forwardingNote.value!.id
      );
    } else if (mode === 'copy' && targetNotebookId === notebookStore.activeNotebookId) {
      await refreshNotes(
        notebookStore.activeNotebookId,
        notebookStore.activeTag,
        pinnedOnly.value,
        true
      );
    }
    const targetNb = notebookStore.notebooks.find((nb) => nb.id === targetNotebookId);
    await notebookStore.refreshNotebooksAndTags();
    ui.showToast(
      mode === 'move'
        ? `已移动至「${targetNb?.name ?? '目标频道'}」`
        : `已转发至「${targetNb?.name ?? '目标频道'}」`
    );
  };

  const clearFilters = () => {
    notebookStore.setActiveTag(null);
    pinnedOnly.value = false;
  };

  const togglePinnedOnly = () => {
    pinnedOnly.value = !pinnedOnly.value;
  };

  return {
    notes,
    channelPinnedNotes,
    notesLoading,
    pinnedOnly,
    forwardingNote,
    scrollTrigger,
    pendingJumpNoteId,
    highlightedNoteId,
    refreshNotes,
    focusNoteElement,
    jumpToNote,
    toggleCheckbox,
    togglePinNote,
    copyMarkdown,
    deleteNote,
    forwardNote,
    clearFilters,
    togglePinnedOnly,
  };
});
