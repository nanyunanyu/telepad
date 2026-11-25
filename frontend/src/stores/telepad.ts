import { computed, ref, watch } from 'vue';
import { defineStore } from 'pinia';
import type {
  Attachment,
  AvatarColor,
  Note,
  Notebook,
  SearchResultItem,
  TagSummary,
} from '../types';
import { api } from '../api/client';

export interface ToastMessage {
  id: number;
  text: string;
  isError?: boolean;
}

export type NotebookModalState =
  | { open: false }
  | { open: true; notebook: Notebook | null };

export interface LightboxState {
  attachments: Attachment[];
  index: number;
}

export interface NoteContextMenuState {
  x: number;
  y: number;
  note: Note;
}

export const useTelepadStore = defineStore('telepad', () => {
  const notebooks = ref<Notebook[]>([]);
  const activeNotebookId = ref<string>('saved-messages');
  const notes = ref<Note[]>([]);
  const channelPinnedNotes = ref<Note[]>([]);
  const notesLoading = ref(true);
  const tags = ref<TagSummary[]>([]);

  // Active filters
  const activeTag = ref<string | null>(null);
  const pinnedOnly = ref(false);

  // Global search
  const globalSearchQuery = ref('');
  const globalSearchResults = ref<SearchResultItem[]>([]);
  const globalSearchLoading = ref(false);
  let searchDebounceTimer: number | null = null;

  // In-chat search
  const inChatSearchOpen = ref(false);
  const inChatQuery = ref('');
  const inChatMatchIdx = ref(0);

  // Composer context
  const replyToNote = ref<Note | null>(null);
  const editingNote = ref<Note | null>(null);
  const pendingAttachments = ref<Attachment[]>([]);
  const uploadingImages = ref(false);

  // Overlays & modals
  const mobileSidebarOpen = ref(false);
  const notebookModal = ref<NotebookModalState>({ open: false });
  const forwardingNote = ref<Note | null>(null);
  const backupModalOpen = ref(false);
  const lightbox = ref<LightboxState | null>(null);
  const noteCtxMenu = ref<NoteContextMenuState | null>(null);

  // Scroll & highlight jump
  const scrollTrigger = ref(0);
  const highlightedNoteId = ref<string | null>(null);
  const pendingJumpNoteId = ref<string | null>(null);
  let highlightTimer: number | null = null;

  // Toasts
  const toasts = ref<ToastMessage[]>([]);

  const showToast = (text: string, isError = false) => {
    const id = Date.now() + Math.random();
    toasts.value = [...toasts.value, { id, text, isError }];
    window.setTimeout(() => {
      toasts.value = toasts.value.filter((t) => t.id !== id);
    }, 2600);
  };

  const activeNotebook = computed<Notebook | null>(
    () => notebooks.value.find((nb) => nb.id === activeNotebookId.value) ?? notebooks.value[0] ?? null
  );

  const inChatMatches = computed<string[]>(() => {
    const q = inChatQuery.value.trim().toLowerCase();
    if (!inChatSearchOpen.value || !q) return [];
    return notes.value.filter((n) => n.content.toLowerCase().includes(q)).map((n) => n.id);
  });

  const activeHighlightQuery = computed(() =>
    inChatSearchOpen.value ? inChatQuery.value : ''
  );

  const refreshNotebooksAndTags = async (notebookIdForTags?: string): Promise<Notebook[]> => {
    const [nbList, tagList] = await Promise.all([
      api.listNotebooks(),
      api.listTags(notebookIdForTags),
    ]);
    notebooks.value = nbList;
    tags.value = tagList;
    return nbList;
  };

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
        api.listNotes(nbId, { tag: tag ?? undefined, pinnedOnly: onlyPinned }),
        tag || onlyPinned ? api.listNotes(nbId, { pinnedOnly: true }) : Promise.resolve(null),
        api.listTags(),
      ]);
      notes.value = noteList;
      channelPinnedNotes.value = pinnedList ?? noteList.filter((n) => n.isPinned);
      tags.value = tagList;
      if (scrollBottom) {
        scrollTrigger.value += 1;
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : '加载笔记失败', true);
    } finally {
      notesLoading.value = false;
    }
  };

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

  const handleJumpToNote = (noteId: string) => {
    if (!focusNoteElement(noteId)) {
      pendingJumpNoteId.value = noteId;
      if (activeTag.value || pinnedOnly.value) {
        activeTag.value = null;
        pinnedOnly.value = false;
      }
    }
  };

  // Watch notebook / filter changes to reload notes
  watch(
    [activeNotebookId, activeTag, pinnedOnly],
    ([nbId, tag, onlyPinned]) => {
      if (!nbId) return;
      void refreshNotes(nbId, tag, onlyPinned, !pendingJumpNoteId.value);
    }
  );

  // Resolve pending jump once notes finish loading
  watch([pendingJumpNoteId, notes, notesLoading], ([targetId, noteList, loading]) => {
    if (!targetId || loading) return;
    const found = noteList.some((n) => n.id === targetId);
    if (found) {
      window.setTimeout(() => {
        focusNoteElement(targetId);
        pendingJumpNoteId.value = null;
      }, 60);
    } else if (activeTag.value || pinnedOnly.value) {
      activeTag.value = null;
      pinnedOnly.value = false;
    } else {
      pendingJumpNoteId.value = null;
    }
  });

  // Debounced global search
  watch(globalSearchQuery, (raw) => {
    if (searchDebounceTimer !== null) {
      window.clearTimeout(searchDebounceTimer);
      searchDebounceTimer = null;
    }
    const q = raw.trim();
    if (!q) {
      globalSearchResults.value = [];
      globalSearchLoading.value = false;
      return;
    }
    globalSearchLoading.value = true;
    searchDebounceTimer = window.setTimeout(() => {
      api
        .searchNotes(q)
        .then((res) => {
          globalSearchResults.value = res;
        })
        .catch(() => {
          globalSearchResults.value = [];
        })
        .finally(() => {
          globalSearchLoading.value = false;
        });
    }, 180);
  });

  // In-chat search match focus
  watch(inChatMatches, (matches) => {
    inChatMatchIdx.value = 0;
    if (matches.length > 0) {
      focusNoteElement(matches[0]);
    }
  });

  const init = async () => {
    try {
      const nbList = await refreshNotebooksAndTags();
      if (nbList.length > 0 && !nbList.some((n) => n.id === activeNotebookId.value)) {
        activeNotebookId.value = nbList[0].id;
      } else {
        await refreshNotes(activeNotebookId.value, activeTag.value, pinnedOnly.value, true);
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : '加载失败', true);
      notesLoading.value = false;
    }
  };

  const handleInChatPrev = () => {
    const matches = inChatMatches.value;
    if (matches.length === 0) return;
    const nextIdx = (inChatMatchIdx.value - 1 + matches.length) % matches.length;
    inChatMatchIdx.value = nextIdx;
    focusNoteElement(matches[nextIdx]);
  };

  const handleInChatNext = () => {
    const matches = inChatMatches.value;
    if (matches.length === 0) return;
    const nextIdx = (inChatMatchIdx.value + 1) % matches.length;
    inChatMatchIdx.value = nextIdx;
    focusNoteElement(matches[nextIdx]);
  };

  const handleSelectNotebook = (id: string) => {
    if (id === activeNotebookId.value) return;
    activeNotebookId.value = id;
    pinnedOnly.value = false;
    inChatSearchOpen.value = false;
    inChatQuery.value = '';
    replyToNote.value = null;
    editingNote.value = null;
    pendingAttachments.value = [];
  };

  const handleSelectSearchResult = (result: SearchResultItem) => {
    pendingJumpNoteId.value = result.id;
    if (result.notebookId !== activeNotebookId.value) {
      activeNotebookId.value = result.notebookId;
    }
    activeTag.value = null;
    pinnedOnly.value = false;
    inChatSearchOpen.value = true;
    inChatQuery.value = globalSearchQuery.value.trim();
  };

  const handleUploadFiles = async (files: File[]) => {
    if (files.length === 0) return;
    const remaining = 9 - pendingAttachments.value.length;
    if (remaining <= 0) {
      showToast('单条笔记最多附加 9 张图片', true);
      return;
    }
    const batch = files.slice(0, remaining);
    uploadingImages.value = true;
    try {
      const uploaded = await api.uploadImages(batch);
      pendingAttachments.value = [...pendingAttachments.value, ...uploaded];
    } catch (err) {
      showToast(err instanceof Error ? err.message : '图片上传失败', true);
    } finally {
      uploadingImages.value = false;
    }
  };

  const handleRemovePendingAttachment = async (att: Attachment) => {
    pendingAttachments.value = pendingAttachments.value.filter((a) => a.id !== att.id);
    if (!att.noteId) {
      api.deleteAttachment(att.id).catch(() => {});
    }
  };

  const handleCancelComposerContext = () => {
    if (editingNote.value) {
      const newStaged = pendingAttachments.value.filter((a) => !a.noteId);
      for (const att of newStaged) {
        api.deleteAttachment(att.id).catch(() => {});
      }
      pendingAttachments.value = [];
    }
    replyToNote.value = null;
    editingNote.value = null;
  };

  const handleStartEdit = (note: Note) => {
    replyToNote.value = null;
    editingNote.value = note;
    pendingAttachments.value = [...note.attachments];
  };

  const handleStartReply = (note: Note) => {
    if (editingNote.value) {
      editingNote.value = null;
      pendingAttachments.value = [];
    }
    replyToNote.value = note;
  };

  const handleComposerSubmit = async (content: string): Promise<boolean> => {
    if (!activeNotebook.value) return false;
    try {
      if (editingNote.value) {
        const updated = await api.updateNote(editingNote.value.id, {
          content,
          attachmentIds: pendingAttachments.value.map((a) => a.id),
        });
        notes.value = notes.value.map((n) => (n.id === updated.id ? updated : n));
        channelPinnedNotes.value = channelPinnedNotes.value.map((n) =>
          n.id === updated.id ? updated : n
        );
        editingNote.value = null;
        pendingAttachments.value = [];
        await refreshNotebooksAndTags();
        showToast('笔记已更新');
        return true;
      }

      const created = await api.createNote({
        notebookId: activeNotebook.value.id,
        content,
        replyToId: replyToNote.value?.id ?? null,
        attachmentIds: pendingAttachments.value.map((a) => a.id),
      });

      replyToNote.value = null;
      pendingAttachments.value = [];

      const matchesTag =
        !activeTag.value ||
        created.tags.some((t) => t.toLowerCase() === activeTag.value!.toLowerCase());
      if (!matchesTag || pinnedOnly.value) {
        activeTag.value = null;
        pinnedOnly.value = false;
      } else {
        notes.value = [...notes.value, created];
        scrollTrigger.value += 1;
      }
      await refreshNotebooksAndTags();
      return true;
    } catch (err) {
      showToast(err instanceof Error ? err.message : '保存笔记失败', true);
      return false;
    }
  };

  const handleToggleCheckbox = async (noteId: string, taskIndex: number) => {
    try {
      const updated = await api.toggleCheckbox(noteId, taskIndex);
      notes.value = notes.value.map((n) => (n.id === updated.id ? updated : n));
      channelPinnedNotes.value = channelPinnedNotes.value.map((n) =>
        n.id === updated.id ? updated : n
      );
      await refreshNotebooksAndTags();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '更新待办失败', true);
    }
  };

  const handleTogglePinNote = async (note: Note) => {
    try {
      const updated = await api.togglePinNote(note.id, !note.isPinned);
      if (pinnedOnly.value && !updated.isPinned) {
        notes.value = notes.value.filter((n) => n.id !== updated.id);
      } else {
        notes.value = notes.value.map((n) => (n.id === updated.id ? updated : n));
      }
      channelPinnedNotes.value = updated.isPinned
        ? [...channelPinnedNotes.value.filter((n) => n.id !== updated.id), updated]
        : channelPinnedNotes.value.filter((n) => n.id !== updated.id);
      await refreshNotebooksAndTags();
      showToast(updated.isPinned ? '已置顶笔记' : '已取消置顶');
    } catch (err) {
      showToast(err instanceof Error ? err.message : '操作失败', true);
    }
  };

  const handleCopyMarkdown = async (note: Note) => {
    try {
      await navigator.clipboard.writeText(note.content);
      showToast('已复制 Markdown 原文');
    } catch {
      showToast('复制失败，请检查剪贴板权限', true);
    }
  };

  const handleDeleteNote = async (note: Note) => {
    if (!window.confirm('确定删除这条笔记吗？此操作无法撤销。')) return;
    try {
      await api.deleteNote(note.id);
      notes.value = notes.value.filter((n) => n.id !== note.id);
      channelPinnedNotes.value = channelPinnedNotes.value.filter((n) => n.id !== note.id);
      if (editingNote.value?.id === note.id) handleCancelComposerContext();
      if (replyToNote.value?.id === note.id) replyToNote.value = null;
      await refreshNotebooksAndTags();
      showToast('笔记已删除');
    } catch (err) {
      showToast(err instanceof Error ? err.message : '删除失败', true);
    }
  };

  const handleForwardNote = async (targetNotebookId: string, mode: 'copy' | 'move') => {
    if (!forwardingNote.value) return;
    await api.forwardNote(forwardingNote.value.id, targetNotebookId, mode);
    if (mode === 'move' && targetNotebookId !== activeNotebookId.value) {
      notes.value = notes.value.filter((n) => n.id !== forwardingNote.value!.id);
      channelPinnedNotes.value = channelPinnedNotes.value.filter(
        (n) => n.id !== forwardingNote.value!.id
      );
    } else if (mode === 'copy' && targetNotebookId === activeNotebookId.value) {
      await refreshNotes(activeNotebookId.value, activeTag.value, pinnedOnly.value, true);
    }
    const targetNb = notebooks.value.find((nb) => nb.id === targetNotebookId);
    await refreshNotebooksAndTags();
    showToast(
      mode === 'move'
        ? `已移动至「${targetNb?.name ?? '目标频道'}」`
        : `已转发至「${targetNb?.name ?? '目标频道'}」`
    );
  };

  const handleSaveNotebook = async (data: {
    name: string;
    description: string;
    icon: string;
    avatarColor: AvatarColor;
    isPinned: boolean;
  }) => {
    if (notebookModal.value.open && notebookModal.value.notebook) {
      await api.updateNotebook(notebookModal.value.notebook.id, data);
      await refreshNotebooksAndTags();
      showToast('笔记本信息已更新');
    } else {
      const created = await api.createNotebook(data);
      await refreshNotebooksAndTags();
      activeNotebookId.value = created.id;
      activeTag.value = null;
      pinnedOnly.value = false;
      showToast(`已创建笔记本「${created.name}」`);
    }
  };

  const handleTogglePinNotebook = async (notebook: Notebook) => {
    try {
      await api.updateNotebook(notebook.id, { isPinned: !notebook.isPinned });
      await refreshNotebooksAndTags();
      showToast(!notebook.isPinned ? '已置顶笔记本频道' : '已取消置顶');
    } catch (err) {
      showToast(err instanceof Error ? err.message : '操作失败', true);
    }
  };

  const handleDeleteNotebook = async (notebook: Notebook): Promise<boolean> => {
    if (!window.confirm(`确定删除笔记本「${notebook.name}」及其所有笔记？`)) return false;
    try {
      await api.deleteNotebook(notebook.id);
      const nbList = await refreshNotebooksAndTags();
      if (activeNotebookId.value === notebook.id && nbList.length > 0) {
        activeNotebookId.value = nbList[0].id;
      }
      showToast(`已删除笔记本「${notebook.name}」`);
      return true;
    } catch (err) {
      showToast(err instanceof Error ? err.message : '删除失败', true);
      return false;
    }
  };

  const handleNoteContextMenu = (e: MouseEvent, note: Note) => {
    e.preventDefault();
    e.stopPropagation();
    const x = Math.min(e.clientX, window.innerWidth - 210);
    const y = Math.min(e.clientY, window.innerHeight - 280);
    noteCtxMenu.value = { x, y, note };
  };

  const handleTagClick = (tag: string) => {
    activeTag.value = activeTag.value?.toLowerCase() === tag.toLowerCase() ? null : tag;
  };

  const handleBackupImported = async (summary: string) => {
    const nbList = await refreshNotebooksAndTags();
    const nextId = nbList.some((n) => n.id === activeNotebookId.value)
      ? activeNotebookId.value
      : nbList[0]?.id ?? 'saved-messages';
    activeNotebookId.value = nextId;
    activeTag.value = null;
    pinnedOnly.value = false;
    await refreshNotes(nextId, null, false, true);
    showToast(summary);
  };

  return {
    notebooks,
    activeNotebookId,
    activeNotebook,
    notes,
    channelPinnedNotes,
    notesLoading,
    tags,
    activeTag,
    pinnedOnly,
    globalSearchQuery,
    globalSearchResults,
    globalSearchLoading,
    inChatSearchOpen,
    inChatQuery,
    inChatMatchIdx,
    inChatMatches,
    activeHighlightQuery,
    replyToNote,
    editingNote,
    pendingAttachments,
    uploadingImages,
    mobileSidebarOpen,
    notebookModal,
    forwardingNote,
    backupModalOpen,
    lightbox,
    noteCtxMenu,
    scrollTrigger,
    highlightedNoteId,
    toasts,
    init,
    showToast,
    refreshNotebooksAndTags,
    refreshNotes,
    focusNoteElement,
    handleJumpToNote,
    handleInChatPrev,
    handleInChatNext,
    handleSelectNotebook,
    handleSelectSearchResult,
    handleUploadFiles,
    handleRemovePendingAttachment,
    handleCancelComposerContext,
    handleStartEdit,
    handleStartReply,
    handleComposerSubmit,
    handleToggleCheckbox,
    handleTogglePinNote,
    handleCopyMarkdown,
    handleDeleteNote,
    handleForwardNote,
    handleSaveNotebook,
    handleTogglePinNotebook,
    handleDeleteNotebook,
    handleNoteContextMenu,
    handleTagClick,
    handleBackupImported,
  };
});
