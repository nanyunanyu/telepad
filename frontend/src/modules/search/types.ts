import type { AvatarColor } from '@/core/types/common';

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
