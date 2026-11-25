import { request } from '@/core/api/http';
import type { Note } from '@/modules/notes/types';

export const notesApi = {
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

  getExportUrl(id: string): string {
    return `/api/notes/${id}/export`;
  },
};
