import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { notebooksApi } from '@/modules/notebooks/api/notebooksApi';
import { useNotebookStore } from '@/modules/notebooks/stores/useNotebookStore';
import type { Notebook } from '@/modules/notebooks/types';

function makeNotebook(overrides: Partial<Notebook> = {}): Notebook {
  return {
    id: 'saved-messages',
    name: 'Saved Messages',
    slug: 'saved-messages',
    description: '',
    icon: 'saved-messages',
    avatarColor: 'blue',
    isSystem: true,
    isPinned: true,
    createdAt: '2026-11-25T10:00:00Z',
    updatedAt: '2026-11-25T10:00:00Z',
    noteCount: 2,
    pinnedCount: 1,
    lastNotePreview: null,
    lastNoteAt: null,
    lastNoteHasImages: false,
    ...overrides,
  };
}

describe('modules/notebooks/stores/useNotebookStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('creates a new notebook, switches active channel, and clears active tag', async () => {
    const savedNb = makeNotebook();
    const createdNb = makeNotebook({
      id: 'nb-2',
      name: 'Ideas',
      slug: 'ideas',
      icon: '💡',
      avatarColor: 'violet',
      isSystem: false,
      isPinned: false,
    });

    vi.spyOn(notebooksApi, 'createNotebook').mockResolvedValue(createdNb);
    vi.spyOn(notebooksApi, 'listNotebooks').mockResolvedValue([savedNb, createdNb]);
    vi.spyOn(notebooksApi, 'listTags').mockResolvedValue([{ tag: '工作', count: 1 }]);

    const store = useNotebookStore();
    store.setActiveTag('工作');

    const { created } = await store.saveNotebook({
      name: 'Ideas',
      description: '',
      icon: '💡',
      avatarColor: 'violet',
      isPinned: false,
    });

    expect(created?.id).toBe('nb-2');
    expect(store.activeNotebookId).toBe('nb-2');
    expect(store.activeTag).toBeNull();
    expect(store.notebooks).toHaveLength(2);
  });

  it('toggles tag filter case-insensitively and handles deleting active notebook', async () => {
    const savedNb = makeNotebook();
    const customNb = makeNotebook({ id: 'nb-2', name: 'Work', isSystem: false, isPinned: false });

    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true));
    vi.spyOn(notebooksApi, 'deleteNotebook').mockResolvedValue();
    vi.spyOn(notebooksApi, 'listNotebooks').mockResolvedValue([savedNb]);
    vi.spyOn(notebooksApi, 'listTags').mockResolvedValue([]);

    const store = useNotebookStore();
    store.notebooks = [savedNb, customNb];
    store.activeNotebookId = 'nb-2';

    store.toggleTag('Work');
    expect(store.activeTag).toBe('Work');
    store.toggleTag('work');
    expect(store.activeTag).toBeNull();

    const deleted = await store.deleteNotebook(customNb);
    expect(deleted).toBe(true);
    expect(store.activeNotebookId).toBe('saved-messages');
  });
});
