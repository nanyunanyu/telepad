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
