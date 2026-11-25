import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { notebooksApi } from '@/modules/notebooks/api/notebooksApi';
import { useNotebookStore } from '@/modules/notebooks/stores/useNotebookStore';
import { notesApi } from '@/modules/notes/api/notesApi';
import { useComposerStore } from '@/modules/notes/stores/useComposerStore';
import { useNoteStore } from '@/modules/notes/stores/useNoteStore';
import type { Note } from '@/modules/notes/types';

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: 'note-1',
    notebookId: 'saved-messages',
    content: '- [ ] todo #工作',
    replyToId: null,
    replyTo: null,
    isPinned: false,
    pinnedAt: null,
    createdAt: '2026-11-25T10:00:00Z',
    updatedAt: '2026-11-25T10:00:00Z',
    editedAt: null,
    tags: ['工作'],
    attachments: [],
    ...overrides,
  };
}

describe('modules/notes stores', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.spyOn(notebooksApi, 'listNotebooks').mockResolvedValue([]);
    vi.spyOn(notebooksApi, 'listTags').mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('updates note in stream and pinned banner when toggling checkbox and pin', async () => {
    const initial = makeNote();
    const checked = makeNote({ content: '- [x] todo #工作' });
    const pinned = makeNote({ content: '- [x] todo #工作', isPinned: true, pinnedAt: '2026-11-25T10:01:00Z' });

    vi.spyOn(notesApi, 'toggleCheckbox').mockResolvedValue(checked);
    vi.spyOn(notesApi, 'togglePinNote').mockResolvedValue(pinned);

    const noteStore = useNoteStore();
    noteStore.notes = [initial];

    await noteStore.toggleCheckbox('note-1', 0);
    expect(noteStore.notes[0].content).toBe('- [x] todo #工作');

    await noteStore.togglePinNote(noteStore.notes[0]);
    expect(noteStore.notes[0].isPinned).toBe(true);
    expect(noteStore.channelPinnedNotes).toHaveLength(1);
  });

  it('appends created note to stream and increments scrollTrigger via composer store', async () => {
    const created = makeNote({ id: 'note-2', content: '新笔记' });
    vi.spyOn(notesApi, 'createNote').mockResolvedValue(created);

    const notebookStore = useNotebookStore();
    notebookStore.notebooks = [
      {
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
        noteCount: 0,
        pinnedCount: 0,
        lastNotePreview: null,
        lastNoteAt: null,
        lastNoteHasImages: false,
      },
    ];

    const noteStore = useNoteStore();
    const composerStore = useComposerStore();

    const ok = await composerStore.submit('新笔记');
    expect(ok).toBe(true);
    expect(noteStore.notes).toHaveLength(1);
    expect(noteStore.notes[0].id).toBe('note-2');
    expect(noteStore.scrollTrigger).toBe(1);
  });
});
