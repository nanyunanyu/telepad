import type {
  Attachment,
  AvatarColor,
  BackupPayload,
  Note,
  Notebook,
  SearchResultItem,
  StorageInfo,
  TagSummary,
} from '../types';

async function request<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  if (!res.ok) {
    let message = `请求失败 (${res.status})`;
    try {
      const data = (await res.json()) as { error?: string; detail?: string };
      if (data.error) message = data.error;
      else if (typeof data.detail === 'string') message = data.detail;
    } catch {
      // keep default
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

export const api = {
  // Notebooks
  async listNotebooks(): Promise<Notebook[]> {
    const data = await request<{ notebooks: Notebook[] }>('/api/notebooks');
    return data.notebooks;
  },

  async createNotebook(payload: {
    name: string;
    description?: string;
    icon?: string;
    avatarColor?: AvatarColor;
    isPinned?: boolean;
  }): Promise<Notebook> {
    const data = await request<{ notebook: Notebook }>('/api/notebooks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return data.notebook;
  },

  async updateNotebook(
    id: string,
    payload: {
      name?: string;
      description?: string;
      icon?: string;
      avatarColor?: AvatarColor;
      isPinned?: boolean;
    }
  ): Promise<Notebook> {
    const data = await request<{ notebook: Notebook }>(`/api/notebooks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return data.notebook;
  },

  async deleteNotebook(id: string): Promise<void> {
    await request(`/api/notebooks/${id}`, { method: 'DELETE' });
  },

  getNotebookExportUrl(id: string): string {
    return `/api/notebooks/${id}/export`;
  },

  // Notes
  async listNotes(
    notebookId: string,
    options?: { tag?: string; pinnedOnly?: boolean }
  ): Promise<Note[]> {
    const params = new URLSearchParams({ notebookId });
    if (options?.tag) params.set('tag', options.tag);
    if (options?.pinnedOnly) params.set('pinnedOnly', 'true');
    const data = await request<{ notes: Note[] }>(`/api/notes?${params.toString()}`);
    return data.notes;
  },

  async createNote(payload: {
    notebookId: string;
    content: string;
    replyToId?: string | null;
    attachmentIds?: string[];
  }): Promise<Note> {
    const data = await request<{ note: Note }>('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return data.note;
  },

  async updateNote(
    id: string,
    payload: { content?: string; attachmentIds?: string[] }
  ): Promise<Note> {
    const data = await request<{ note: Note }>(`/api/notes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return data.note;
  },

  async togglePinNote(id: string, isPinned: boolean): Promise<Note> {
    const data = await request<{ note: Note }>(`/api/notes/${id}/pin`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPinned }),
    });
    return data.note;
  },

  async toggleCheckbox(id: string, taskIndex: number): Promise<Note> {
    const data = await request<{ note: Note }>(`/api/notes/${id}/checkbox`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskIndex }),
    });
    return data.note;
  },

  async forwardNote(
    id: string,
    targetNotebookId: string,
    mode: 'copy' | 'move'
  ): Promise<Note> {
    const data = await request<{ note: Note }>(`/api/notes/${id}/forward`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetNotebookId, mode }),
    });
    return data.note;
  },

  async deleteNote(id: string): Promise<void> {
    await request(`/api/notes/${id}`, { method: 'DELETE' });
  },

  getNoteExportUrl(id: string): string {
    return `/api/notes/${id}/export`;
  },

  async searchNotes(q: string, notebookId?: string): Promise<SearchResultItem[]> {
    const params = new URLSearchParams({ q });
    if (notebookId) params.set('notebookId', notebookId);
    const data = await request<{ results: SearchResultItem[] }>(
      `/api/notes/search?${params.toString()}`
    );
    return data.results;
  },

  async listTags(notebookId?: string): Promise<TagSummary[]> {
    const params = new URLSearchParams();
    if (notebookId) params.set('notebookId', notebookId);
    const qs = params.toString();
    const data = await request<{ tags: TagSummary[] }>(`/api/notes/tags${qs ? `?${qs}` : ''}`);
    return data.tags;
  },

  // Uploads
  async uploadImages(files: File[]): Promise<Attachment[]> {
    const formData = new FormData();
    for (const file of files) {
      formData.append('files', file);
    }
    const data = await request<{ attachments: Attachment[] }>('/api/uploads', {
      method: 'POST',
      body: formData,
    });
    return data.attachments;
  },

  async deleteAttachment(id: string): Promise<void> {
    await request(`/api/uploads/${id}`, { method: 'DELETE' });
  },

  // Backup
  async getStorageInfo(): Promise<StorageInfo> {
    return request<StorageInfo>('/api/backup/info');
  },

  getBackupExportUrl(includeImages = true): string {
    return `/api/backup/export?includeImages=${includeImages ? 'true' : 'false'}`;
  },

  async importBackup(
    payload: BackupPayload,
    mode: 'merge' | 'replace'
  ): Promise<{
    success: boolean;
    importedNotebooks: number;
    importedNotes: number;
    importedAttachments: number;
  }> {
    return request('/api/backup/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, payload }),
    });
  },
};
