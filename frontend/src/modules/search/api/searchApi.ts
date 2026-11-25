import { request } from '@/core/api/http';
import type { SearchResultItem } from '@/modules/search/types';

export const searchApi = {
  async searchNotes(q: string, notebookId?: string): Promise<SearchResultItem[]> {
    const params = new URLSearchParams({ q });
    if (notebookId) params.set('notebookId', notebookId);
    const data = await request<{ results: SearchResultItem[] }>(
      `/api/notes/search?${params.toString()}`
    );
    return data.results;
  },
};
