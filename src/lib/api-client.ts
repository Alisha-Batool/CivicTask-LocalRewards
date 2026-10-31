import { auth } from './firebase.ts';

export async function apiFetch<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  if (auth.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken();
      headers.set('Authorization', `Bearer ${token}`);
    } catch (err) {
      console.warn('Failed to get auth ID token:', err);
    }
  }

  const res = await fetch(endpoint, {
    ...options,
    headers,
  });

  const contentType = res.headers.get('content-type') || '';
  let data: any = null;
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  if (!res.ok) {
    let errorMsg = `Request failed with status ${res.status}`;
    if (data && typeof data === 'object') {
      if (data.details) {
        if (Array.isArray(data.details)) {
          const detailStrings = data.details.map((d: any) => {
            if (typeof d === 'string') return d;
            if (d && d.message) return d.path && d.path.length ? `[${d.path.join('.')}] ${d.message}` : d.message;
            return JSON.stringify(d);
          });
          errorMsg = `${data.error || 'Validation error'}: ${detailStrings.join('; ')}`;
        } else if (typeof data.details === 'string') {
          errorMsg = `${data.error || 'Error'}: ${data.details}`;
        } else {
          errorMsg = data.error || errorMsg;
        }
      } else if (data.error) {
        errorMsg = data.error;
      }
    }
    throw new Error(errorMsg);
  }

  return data as T;
}
