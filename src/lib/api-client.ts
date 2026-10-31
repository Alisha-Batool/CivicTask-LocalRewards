import { isDemoMode } from './demo-mode.ts';
import { runDemoApi } from './demo-data.ts';

export async function apiFetch<T = unknown>(endpoint: string, options: RequestInit = {}): Promise<T> {
  if (isDemoMode) {
    return runDemoApi(endpoint, options) as T;
  }

  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  const res = await fetch(endpoint, {
    ...options,
    headers,
  });

  const contentType = res.headers.get('content-type') || '';
  let data: unknown = null;
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  if (!res.ok) {
    let errorMsg = `Request failed with status ${res.status}`;
    if (res.status === 401) {
      errorMsg = 'Guest access is active. This operation requires a trusted server identity; no privileged data was changed.';
    }
    if (data && typeof data === 'object') {
      const errorData = data as { details?: unknown; error?: string };
      if (errorData.details) {
        if (Array.isArray(errorData.details)) {
          const detailStrings = errorData.details.map((detail: unknown) => {
            if (typeof detail === 'string') return detail;
            if (detail && typeof detail === 'object' && 'message' in detail) {
              const issue = detail as { message: string; path?: string[] };
              return issue.path?.length ? `[${issue.path.join('.')}] ${issue.message}` : issue.message;
            }
            return JSON.stringify(detail);
          });
          errorMsg = `${errorData.error || 'Validation error'}: ${detailStrings.join('; ')}`;
        } else if (typeof errorData.details === 'string') {
          errorMsg = `${errorData.error || 'Error'}: ${errorData.details}`;
        } else {
          errorMsg = errorData.error || errorMsg;
        }
      } else if (errorData.error && res.status !== 401) {
        errorMsg = errorData.error;
      }
    }
    throw new Error(errorMsg);
  }

  return data as T;
}
