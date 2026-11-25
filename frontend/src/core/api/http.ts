/** HTTP error carrying server error message and HTTP status code. */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** Execute a JSON fetch request and normalize backend error payloads. */
export async function request<T>(input: string, init?: RequestInit): Promise<T> {
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
    throw new ApiError(message, res.status);
  }
  return (await res.json()) as T;
}
