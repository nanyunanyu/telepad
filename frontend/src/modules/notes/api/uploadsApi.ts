import { request } from '@/core/api/http';
import type { Attachment } from '@/modules/notes/types';

export const uploadsApi = {
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
};
