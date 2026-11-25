import { request } from '@/core/api/http';
import type { Notebook, NotebookPayload, TagSummary } from '@/modules/notebooks/types';

export const notebooksApi = {
  async listNotebooks(): Promise<Notebook[]> {
    const data = await request<{ notebooks: Notebook[] }>('/api/notebooks');
    return data.notebooks;
  },

  async createNotebook(payload: NotebookPayload): Promise<Notebook> {
    const data = await request<{ notebook: Notebook }>('/api/notebooks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return data.notebook;
  },

  async updateNotebook(id: string, payload: Partial<NotebookPayload>): Promise<Notebook> {
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

  getExportUrl(id: string): string {
    return `/api/notebooks/${id}/export`;
  },

  async listTags(notebookId?: string): Promise<TagSummary[]> {
    const params = new URLSearchParams();
    if (notebookId) params.set('notebookId', notebookId);
    const qs = params.toString();
    const data = await request<{ tags: TagSummary[] }>(`/api/notes/tags${qs ? `?${qs}` : ''}`);
    return data.tags;
  },
};
