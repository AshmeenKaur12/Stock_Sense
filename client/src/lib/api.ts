import { api, type ApiEnvelope } from './axios';
import type { PageMeta, Paged } from './types';

type Params = Record<string, unknown> | undefined;

/** Drops empty values so URLs stay clean (and match the URL-state hooks). */
export function cleanParams(params: Params): Record<string, string | number | boolean> | undefined {
  if (!params) return undefined;
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    out[k] = v as string | number | boolean;
  }
  return out;
}

export async function getData<T>(url: string, params?: Params): Promise<T> {
  const res = await api.get<ApiEnvelope<T>>(url, { params: cleanParams(params) });
  return res.data.data;
}

export async function getPaged<T, M extends object = object>(url: string, params?: Params): Promise<Paged<T, M>> {
  const res = await api.get<ApiEnvelope<T[]>>(url, { params: cleanParams(params) });
  return { items: res.data.data, meta: (res.data.meta ?? { page: 1, limit: res.data.data.length, total: res.data.data.length }) as PageMeta & M };
}

export async function postData<T>(url: string, body?: unknown): Promise<{ data: T; message?: string }> {
  const res = await api.post<ApiEnvelope<T>>(url, body);
  return { data: res.data.data, message: res.data.message };
}

export async function patchData<T>(url: string, body?: unknown): Promise<{ data: T; message?: string }> {
  const res = await api.patch<ApiEnvelope<T>>(url, body);
  return { data: res.data.data, message: res.data.message };
}

export async function deleteData(url: string): Promise<{ message?: string }> {
  const res = await api.delete<ApiEnvelope<null>>(url);
  return { message: res.data.message };
}

/** Field-level errors from a 409/422 response, keyed by field path. */
export function fieldErrors(error: unknown): Record<string, string> {
  const errs = (error as { response?: { data?: { errors?: { field: string; message: string }[] } } })?.response?.data?.errors;
  return Object.fromEntries((errs ?? []).map((e) => [e.field, e.message]));
}

/** Opens a binary endpoint (PDF/CSV) using the session cookie. */
export async function downloadFile(url: string, params: Params, filename: string, open = false) {
  const res = await api.get<Blob>(url, { params: cleanParams(params), responseType: 'blob' });
  const href = URL.createObjectURL(res.data);
  if (open) {
    window.open(href, '_blank', 'noopener');
  } else {
    const a = document.createElement('a');
    a.href = href;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  setTimeout(() => URL.revokeObjectURL(href), 60_000);
}
