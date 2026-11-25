import { ref } from 'vue';
import { defineStore } from 'pinia';
import { backupApi } from '@/modules/backup/api/backupApi';
import type { BackupPayload, StorageInfo } from '@/modules/backup/types';

/** Manage backup modal state, storage statistics, and JSON backup import/export. */
export const useBackupStore = defineStore('backup', () => {
  const modalOpen = ref(false);
  const storageInfo = ref<StorageInfo | null>(null);
  const importing = ref(false);
  const statusMsg = ref('');
  const error = ref('');

  const loadStorageInfo = async () => {
    try {
      storageInfo.value = await backupApi.getStorageInfo();
    } catch {
      // ignore transient errors when opening modal
    }
  };

  const openModal = () => {
    statusMsg.value = '';
    error.value = '';
    modalOpen.value = true;
    void loadStorageInfo();
  };

  const closeModal = () => {
    modalOpen.value = false;
  };

  const importBackupFile = async (
    file: File,
    mode: 'merge' | 'replace',
    onImported: (summary: string) => Promise<void>
  ) => {
    if (
      mode === 'replace' &&
      !window.confirm('覆盖恢复将清空现有全部笔记本与笔记并替换为备份内容，确定继续？')
    ) {
      return;
    }

    importing.value = true;
    error.value = '';
    statusMsg.value = '';
    try {
      const text = await file.text();
      const payload = JSON.parse(text) as BackupPayload;
      const result = await backupApi.importBackup(payload, mode);
      const summary = `导入完成：${result.importedNotebooks} 个笔记本、${result.importedNotes} 条笔记、${result.importedAttachments} 张图片`;
      statusMsg.value = summary;
      await onImported(summary);
      await loadStorageInfo();
    } catch (err) {
      error.value = err instanceof Error ? err.message : '导入失败，请确认 JSON 备份文件格式';
    } finally {
      importing.value = false;
    }
  };

  return {
    modalOpen,
    storageInfo,
    importing,
    statusMsg,
    error,
    openModal,
    closeModal,
    loadStorageInfo,
    importBackupFile,
  };
});
