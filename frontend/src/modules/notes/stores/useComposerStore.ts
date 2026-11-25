import { ref } from 'vue';
import { defineStore } from 'pinia';
import { useUiStore } from '@/core/stores/useUiStore';
import { useNotebookStore } from '@/modules/notebooks/stores/useNotebookStore';
import { useNoteStore } from '@/modules/notes/stores/useNoteStore';
import { notesApi } from '@/modules/notes/api/notesApi';
import { uploadsApi } from '@/modules/notes/api/uploadsApi';
import type { Attachment, Note } from '@/modules/notes/types';

/** Manage composer reply/edit context, staged image uploads, and note submission. */
export const useComposerStore = defineStore('composer', () => {
  const ui = useUiStore();
  const notebookStore = useNotebookStore();
  const noteStore = useNoteStore();

  const replyToNote = ref<Note | null>(null);
  const editingNote = ref<Note | null>(null);
  const pendingAttachments = ref<Attachment[]>([]);
  const uploadingImages = ref(false);

  const uploadFiles = async (files: File[]) => {
    if (files.length === 0) return;
    const remaining = 9 - pendingAttachments.value.length;
    if (remaining <= 0) {
      ui.showToast('单条笔记最多附加 9 张图片', true);
      return;
    }
    const batch = files.slice(0, remaining);
    uploadingImages.value = true;
    try {
      const uploaded = await uploadsApi.uploadImages(batch);
      pendingAttachments.value = [...pendingAttachments.value, ...uploaded];
    } catch (err) {
      ui.showToast(err instanceof Error ? err.message : '图片上传失败', true);
    } finally {
      uploadingImages.value = false;
    }
  };

  const removePendingAttachment = async (att: Attachment) => {
    pendingAttachments.value = pendingAttachments.value.filter((a) => a.id !== att.id);
    if (!att.noteId) {
      uploadsApi.deleteAttachment(att.id).catch(() => {});
    }
  };

  const cancelContext = () => {
    if (editingNote.value) {
      const newStaged = pendingAttachments.value.filter((a) => !a.noteId);
      for (const att of newStaged) {
        uploadsApi.deleteAttachment(att.id).catch(() => {});
      }
      pendingAttachments.value = [];
    }
    replyToNote.value = null;
    editingNote.value = null;
  };

  const reset = () => {
    replyToNote.value = null;
    editingNote.value = null;
    pendingAttachments.value = [];
  };

  const startEdit = (note: Note) => {
    replyToNote.value = null;
    editingNote.value = note;
    pendingAttachments.value = [...note.attachments];
  };

  const startReply = (note: Note) => {
    if (editingNote.value) {
      editingNote.value = null;
      pendingAttachments.value = [];
    }
    replyToNote.value = note;
  };

  const submit = async (content: string): Promise<boolean> => {
    if (!notebookStore.activeNotebook) return false;
    try {
      if (editingNote.value) {
        const updated = await notesApi.updateNote(editingNote.value.id, {
          content,
          attachmentIds: pendingAttachments.value.map((a) => a.id),
        });
        noteStore.notes = noteStore.notes.map((n) => (n.id === updated.id ? updated : n));
        noteStore.channelPinnedNotes = noteStore.channelPinnedNotes.map((n) =>
          n.id === updated.id ? updated : n
        );
        editingNote.value = null;
        pendingAttachments.value = [];
        await notebookStore.refreshNotebooksAndTags();
        ui.showToast('笔记已更新');
        return true;
      }

      const created = await notesApi.createNote({
        notebookId: notebookStore.activeNotebook.id,
        content,
        replyToId: replyToNote.value?.id ?? null,
        attachmentIds: pendingAttachments.value.map((a) => a.id),
      });

      replyToNote.value = null;
      pendingAttachments.value = [];

      const matchesTag =
        !notebookStore.activeTag ||
        created.tags.some((t) => t.toLowerCase() === notebookStore.activeTag!.toLowerCase());
      if (!matchesTag || noteStore.pinnedOnly) {
        notebookStore.setActiveTag(null);
        noteStore.pinnedOnly = false;
      } else {
        noteStore.notes = [...noteStore.notes, created];
        noteStore.scrollTrigger += 1;
      }
      await notebookStore.refreshNotebooksAndTags();
      return true;
    } catch (err) {
      ui.showToast(err instanceof Error ? err.message : '保存笔记失败', true);
      return false;
    }
  };

  return {
    replyToNote,
    editingNote,
    pendingAttachments,
    uploadingImages,
    uploadFiles,
    removePendingAttachment,
    cancelContext,
    reset,
    startEdit,
    startReply,
    submit,
  };
});
