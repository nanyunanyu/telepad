import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, request } from '@/core/api/http';

describe('core/api/http request', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns parsed JSON for ok responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'ok' }),
      })
    );

    const res = await request<{ status: string }>('/api/health');
    expect(res).toEqual({ status: 'ok' });
  });

  it('extracts error field from non-ok response payload', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: '笔记本名称不能为空' }),
      })
    );

    await expect(request('/api/notebooks')).rejects.toMatchObject({
      name: 'ApiError',
      message: '笔记本名称不能为空',
      status: 400,
    });
  });

  it('falls back to detail field or status message when error is absent', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ detail: 'Not Found' }),
      }).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error('invalid json');
        },
      })
    );

    await expect(request('/api/notes/1')).rejects.toThrow(new ApiError('Not Found', 404));
    await expect(request('/api/notes/2')).rejects.toThrow('请求失败 (500)');
  });
});
