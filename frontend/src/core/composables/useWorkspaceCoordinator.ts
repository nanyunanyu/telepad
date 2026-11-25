import { useUiStore } from '@/core/stores/useUiStore';
import { useNotebookStore } from '@/modules/notebooks/stores/useNotebookStore';
import type { Notebook, NotebookPayload } from '@/modules/notebooks/types';
import { useComposerStore } from '@/modules/notes/stores/useComposerStore';
import { useNoteStore } from '@/modules/notes/stores/useNoteStore';
import type { Note } from '@/modules/notes/types';
import { useSearchStore } from '@/modules/search/stores/useSearchStore';
import type { SearchResultItem } from '@/modules/search/types';

/** Orchestrate deterministic cross-module workflows without reactive watcher races. */
export function useWorkspaceCoordinator() {
  const ui = useUiStore();
  const notebookStore = useNotebookStore();
  const noteStore = useNoteStore();
  const composerStore = useComposerStore();
  const searchStore = useSearchStore();

  const initWorkspace = async () => {
    try {
      const nbList = await notebookStore.refreshNotebooksAndTags();
      if (nbList.length > 0 && !nbList.some((n) => n.id === notebookStore.activeNotebookId)) {
        notebookStore.activeNotebookId = nbList[0].id;
      } else {
        await noteStore.refreshNotes(
          notebookStore.activeNotebookId,
          notebookStore.activeTag,
          noteStore.pinnedOnly,
          true
        );
      }
    } catch (err) {
      ui.showToast(err instanceof Error ? err.message : '加载失败', true);
      noteStore.notesLoading = false;
    }
  };

  const selectNotebook = (id: string) => {
    if (id === notebookStore.activeNotebookId) return;
    notebookStore.activeNotebookId = id;
    noteStore.pinnedOnly = false;
    searchStore.closeInChatSearch();
    composerStore.reset();
  };

  const selectSearchResult = (result: SearchResultItem) => {
    noteStore.pendingJumpNoteId = result.id;
    if (result.notebookId !== notebookStore.activeNotebookId) {
      notebookStore.activeNotebookId = result.notebookId;
    }
    notebookStore.setActiveTag(null);
    noteStore.pinnedOnly = false;
    searchStore.openInChatSearch();
    searchStore.inChatQuery = searchStore.globalSearchQuery.trim();
  };

  const saveNotebook = async (data: Required<NotebookPayload>) => {
    const { created } = await notebookStore.saveNotebook(data);
    if (created) {
      noteStore.pinnedOnly = false;
      searchStore.closeInChatSearch();
      composerStore.reset();
    }
  };

  const deleteNotebook = async (notebook: Notebook): Promise<boolean> => {
    const wasActive = notebookStore.activeNotebookId === notebook.id;
    const deleted = await notebookStore.deleteNotebook(notebook);
    if (deleted && wasActive) {
      notebookStore.setActiveTag(null);
      noteStore.pinnedOnly = false;
      searchStore.closeInChatSearch();
      composerStore.reset();
    }
    return deleted;
  };

  const deleteNote = async (note: Note) => {
    const deleted = await noteStore.deleteNote(note);
    if (!deleted) return;
    if (composerStore.editingNote?.id === note.id) {
      composerStore.cancelContext();
    }
    if (composerStore.replyToNote?.id === note.id) {
      composerStore.replyToNote = null;
    }
  };

  const onBackupImported = async (summary: string) => {
    const nbList = await notebookStore.refreshNotebooksAndTags();
    const nextId = nbList.some((n) => n.id === notebookStore.activeNotebookId)
      ? notebookStore.activeNotebookId
      : nbList[0]?.id ?? 'saved-messages';
    notebookStore.activeNotebookId = nextId;
    notebookStore.setActiveTag(null);
    noteStore.pinnedOnly = false;
    searchStore.closeInChatSearch();
    composerStore.reset();
    await noteStore.refreshNotes(nextId, null, false, true);
    ui.showToast(summary);
  };

  return {
    initWorkspace,
    selectNotebook,
    selectSearchResult,
    saveNotebook,
    deleteNotebook,
    deleteNote,
    onBackupImported,
  };
}
