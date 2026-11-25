import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { useWorkspaceCoordinator } from '@/core/composables/useWorkspaceCoordinator';
import { notebooksApi } from '@/modules/notebooks/api/notebooksApi';
import { useNotebookStore } from '@/modules/notebooks/stores/useNotebookStore';
import { notesApi } from '@/modules/notes/api/notesApi';
import { useNoteStore } from '@/modules/notes/stores/useNoteStore';
import type { Note } from '@/modules/notes/types';
import { searchApi } from '@/modules/search/api/searchApi';
import { useSearchStore } from '@/modules/search/stores/useSearchStore';

function makeNote(id: string, content: string): Note {
  return {
    id,
    notebookId: 'saved-messages',
    content,
    replyToId: null,
    replyTo: null,
    isPinned: false,
    pinnedAt: null,
    createdAt: '2026-11-25T10:00:00Z',
    updatedAt: '2026-11-25T10:00:00Z',
    editedAt: null,
    tags: [],
    attachments: [],
  };
}

describe('modules/search & workspace coordinator', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('debounces global search queries and computes wrapping in-chat matches', async () => {
    const searchSpy = vi.spyOn(searchApi, 'searchNotes').mockResolvedValue([
      {
        id: 'n1',
        notebookId: 'saved-messages',
        notebookName: 'Saved Messages',
        notebookIcon: 'saved-messages',
        notebookAvatarColor: 'blue',
        content: 'Alpha test',
        snippet: 'Alpha test',
        createdAt: '2026-11-25T10:00:00Z',
        isPinned: false,
        hasImages: false,
        tags: [],
      },
    ]);

    const noteStore = useNoteStore();
    noteStore.notes = [
      makeNote('n1', 'Alpha test'),
      makeNote('n2', 'Beta note'),
      makeNote('n3', 'alpha second'),
    ];

    const searchStore = useSearchStore();
    searchStore.globalSearchQuery = 'alpha';
    await nextTick();
    expect(searchStore.globalSearchLoading).toBe(true);
    expect(searchSpy).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(180);
    expect(searchSpy).toHaveBeenCalledWith('alpha');
    expect(searchStore.globalSearchResults).toHaveLength(1);
    expect(searchStore.globalSearchLoading).toBe(false);

    searchStore.openInChatSearch();
    searchStore.inChatQuery = 'alpha';
    await nextTick();
    expect(searchStore.inChatMatches).toEqual(['n1', 'n3']);
    expect(searchStore.inChatMatchIdx).toBe(0);

    searchStore.nextMatch();
    expect(searchStore.inChatMatchIdx).toBe(1);
    searchStore.prevMatch();
    expect(searchStore.inChatMatchIdx).toBe(0);
    searchStore.prevMatch();
    expect(searchStore.inChatMatchIdx).toBe(1);
  });

  it('keeps in-chat search bar open when jumping to a cross-channel search result', async () => {
    vi.spyOn(notesApi, 'listNotes').mockResolvedValue([]);
    vi.spyOn(notebooksApi, 'listTags').mockResolvedValue([]);

    const notebookStore = useNotebookStore();
    const noteStore = useNoteStore();
    const searchStore = useSearchStore();
    const coordinator = useWorkspaceCoordinator();

    notebookStore.activeNotebookId = 'saved-messages';
    searchStore.globalSearchQuery = 'roadmap';

    coordinator.selectSearchResult({
      id: 'target-note',
      notebookId: 'ideas-clips',
      notebookName: 'Ideas & Clips',
      notebookIcon: '💡',
      notebookAvatarColor: 'violet',
      content: 'roadmap item',
      snippet: 'roadmap item',
      createdAt: '2026-11-25T10:00:00Z',
      isPinned: false,
      hasImages: false,
      tags: [],
    });

    await nextTick();
    expect(notebookStore.activeNotebookId).toBe('ideas-clips');
    expect(noteStore.pendingJumpNoteId).toBe('target-note');
    expect(searchStore.inChatSearchOpen).toBe(true);
    expect(searchStore.inChatQuery).toBe('roadmap');
  });
});
