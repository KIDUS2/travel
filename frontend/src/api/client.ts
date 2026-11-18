import { getAccessToken } from '../auth/keycloak';
import { config } from '../config';
import type { ApiErrorBody } from './types';

export class ApiError extends Error {
  constructor(public status: number, message: string, public fields: Record<string, string> = {}) {
    super(message);
  }
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getAccessToken();
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');

  const res = await fetch(`${config.apiBase}${path}`, { ...init, headers });
  if (!res.ok) {
    let body: Partial<ApiErrorBody> = {};
    try {
      body = await res.json();
    } catch {
      /* not JSON */
    }
    throw new ApiError(res.status, body.message ?? `Request failed (${res.status})`, body.fields ?? {});
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
