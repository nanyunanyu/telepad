import { request } from '@/core/api/http';
import type { BackupImportResult, BackupPayload, StorageInfo } from '@/modules/backup/types';

export const backupApi = {
  async getStorageInfo(): Promise<StorageInfo> {
    return request<StorageInfo>('/api/backup/info');
  },

  getBackupExportUrl(includeImages = true): string {
    return `/api/backup/export?includeImages=${includeImages ? 'true' : 'false'}`;
  },

  async importBackup(
    payload: BackupPayload,
    mode: 'merge' | 'replace'
  ): Promise<BackupImportResult> {
    return request<BackupImportResult>('/api/backup/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, payload }),
    });
  },
};
