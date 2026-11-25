import type { AvatarColor } from '@/core/types/common';

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

export interface TagSummary {
  tag: string;
  count: number;
}

export interface NotebookPayload {
  name: string;
  description?: string;
  icon?: string;
  avatarColor?: AvatarColor;
  isPinned?: boolean;
}
