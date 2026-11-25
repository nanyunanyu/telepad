import type { AvatarColor } from '@/core/types/common';

export interface StorageInfo {
  dataDir: string;
  dbPath: string;
  uploadsDir: string;
  markdownDir: string;
  notebookCount: number;
  noteCount: number;
  attachmentCount: number;
}

export interface BackupAttachmentRecord {
  id: string;
  noteId: string | null;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  dataBase64?: string;
}

export interface BackupPayload {
  version: 1;
  app: 'telepad';
  exportedAt: string;
  notebooks: Array<{
    id: string;
    name: string;
    slug: string;
    description: string;
    icon: string;
    avatarColor: AvatarColor;
    isSystem: boolean;
    isPinned: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
  notes: Array<{
    id: string;
    notebookId: string;
    content: string;
    replyToId: string | null;
    isPinned: boolean;
    pinnedAt: string | null;
    createdAt: string;
    updatedAt: string;
    editedAt: string | null;
  }>;
  attachments: BackupAttachmentRecord[];
}

export interface BackupImportResult {
  success: boolean;
  importedNotebooks: number;
  importedNotes: number;
  importedAttachments: number;
}
