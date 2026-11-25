import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { useUiStore } from '@/core/stores/useUiStore';
import { notebooksApi } from '@/modules/notebooks/api/notebooksApi';
import type { Notebook, NotebookPayload, TagSummary } from '@/modules/notebooks/types';

export type NotebookModalState =
  | { open: false }
  | { open: true; notebook: Notebook | null };

/** Manage notebook channels, tag summaries, active channel selection, and notebook modal state. */
export const useNotebookStore = defineStore('notebooks', () => {
  const ui = useUiStore();

  const notebooks = ref<Notebook[]>([]);
  const activeNotebookId = ref<string>('saved-messages');
  const tags = ref<TagSummary[]>([]);
  const activeTag = ref<string | null>(null);
  const notebookModal = ref<NotebookModalState>({ open: false });

  const activeNotebook = computed<Notebook | null>(
    () => notebooks.value.find((nb) => nb.id === activeNotebookId.value) ?? notebooks.value[0] ?? null
  );

  const refreshNotebooksAndTags = async (notebookIdForTags?: string): Promise<Notebook[]> => {
    const [nbList, tagList] = await Promise.all([
      notebooksApi.listNotebooks(),
      notebooksApi.listTags(notebookIdForTags),
    ]);
    notebooks.value = nbList;
    tags.value = tagList;
    return nbList;
  };

  const setActiveTag = (tag: string | null) => {
    activeTag.value = tag;
  };

  const toggleTag = (tag: string) => {
    activeTag.value = activeTag.value?.toLowerCase() === tag.toLowerCase() ? null : tag;
  };

  const openCreateModal = () => {
    notebookModal.value = { open: true, notebook: null };
  };

  const openEditModal = (notebook: Notebook) => {
    notebookModal.value = { open: true, notebook };
  };

  const closeModal = () => {
    notebookModal.value = { open: false };
  };

  const saveNotebook = async (
    data: Required<NotebookPayload>
  ): Promise<{ created: Notebook | null }> => {
    if (notebookModal.value.open && notebookModal.value.notebook) {
      await notebooksApi.updateNotebook(notebookModal.value.notebook.id, data);
      await refreshNotebooksAndTags();
      ui.showToast('笔记本信息已更新');
      return { created: null };
    }
    const created = await notebooksApi.createNotebook(data);
    await refreshNotebooksAndTags();
    activeNotebookId.value = created.id;
    activeTag.value = null;
    ui.showToast(`已创建笔记本「${created.name}」`);
    return { created };
  };

  const togglePinNotebook = async (notebook: Notebook) => {
    try {
      await notebooksApi.updateNotebook(notebook.id, { isPinned: !notebook.isPinned });
      await refreshNotebooksAndTags();
      ui.showToast(!notebook.isPinned ? '已置顶笔记本频道' : '已取消置顶');
    } catch (err) {
      ui.showToast(err instanceof Error ? err.message : '操作失败', true);
    }
  };

  const deleteNotebook = async (notebook: Notebook): Promise<boolean> => {
    if (!window.confirm(`确定删除笔记本「${notebook.name}」及其所有笔记？`)) return false;
    try {
      await notebooksApi.deleteNotebook(notebook.id);
      const nbList = await refreshNotebooksAndTags();
      if (activeNotebookId.value === notebook.id && nbList.length > 0) {
        activeNotebookId.value = nbList[0].id;
      }
      ui.showToast(`已删除笔记本「${notebook.name}」`);
      return true;
    } catch (err) {
      ui.showToast(err instanceof Error ? err.message : '删除失败', true);
      return false;
    }
  };

  return {
    notebooks,
    activeNotebookId,
    activeNotebook,
    tags,
    activeTag,
    notebookModal,
    refreshNotebooksAndTags,
    setActiveTag,
    toggleTag,
    openCreateModal,
    openEditModal,
    closeModal,
    saveNotebook,
    togglePinNotebook,
    deleteNotebook,
  };
});
