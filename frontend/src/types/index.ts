export type AvatarColor =
  | 'blue'
  | 'cyan'
  | 'green'
  | 'orange'
  | 'red'
  | 'violet'
  | 'pink';

export type ThemeMode = 'day' | 'night';

export type SendKeyMode = 'mod-enter' | 'enter';

export interface Notebook {
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
  noteCount: number;
  pinnedCount: number;
  lastNotePreview: string | null;
  lastNoteAt: string | null;
  lastNoteHasImages: boolean;
}

export interface Attachment {
  id: string;
  noteId: string | null;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  createdAt: string;
}

export interface ReplyPreview {
  id: string;
  content: string;
  hasImages: boolean;
  createdAt: string;
}

export interface Note {
  id: string;
  notebookId: string;
  content: string;
  replyToId: string | null;
  replyTo: ReplyPreview | null;
  isPinned: boolean;
  pinnedAt: string | null;
  createdAt: string;
  updatedAt: string;
  editedAt: string | null;
  tags: string[];
  attachments: Attachment[];
}

export interface TagSummary {
  tag: string;
  count: number;
}

export interface SearchResultItem {
  id: string;
  notebookId: string;
  notebookName: string;
  notebookIcon: string;
  notebookAvatarColor: AvatarColor;
  content: string;
  snippet: string;
  createdAt: string;
  isPinned: boolean;
  hasImages: boolean;
  tags: string[];
}

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
