export const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:4000';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

type Options = { method?: 'GET' | 'POST' | 'DELETE'; body?: unknown };

// turns the backend error shapes into one readable line
function readError(data: unknown): string {
  if (data && typeof data === 'object' && 'error' in data) {
    const { error, details } = data as {
      error?: string;
      details?: { field: string; message: string }[];
    };
    if (details?.length) return details.map((d) => `${d.field}: ${d.message}`).join(', ');
    if (error) return error;
  }
  return 'something went wrong';
}

export async function api<T>(path: string, { method = 'GET', body }: Options = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'cannot reach the server, is the api running?');
  }

  const data: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    // the cookie stopped working, let the app log the user out
    if (res.status === 401 && path !== '/api/auth/me') {
      window.dispatchEvent(new Event('session-expired'));
    }
    throw new ApiError(res.status, readError(data));
  }

  return data as T;
}