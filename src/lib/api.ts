import { getAuthToken } from "./auth";

const DEFAULT_API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5000/api";

function getApiBase() {
  if (typeof window === "undefined") return DEFAULT_API_BASE;
  const saved = window.localStorage.getItem("apiBaseUrl");
  return saved && saved.trim().length ? saved.trim() : DEFAULT_API_BASE;
}

type QueryValue = string | number | boolean | undefined | null;

function toQuery(params?: Record<string, QueryValue>) {
  if (!params) return "";
  const entries = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => [key, String(value)]);
  if (!entries.length) return "";
  return `?${new URLSearchParams(entries).toString()}`;
}

function authHeader() {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function parseDownloadFilename(contentDisposition: string | null) {
  if (!contentDisposition) return null;

  const utf8Match = contentDisposition.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
  if (utf8Match) {
    const encoded = utf8Match[1].trim().replace(/^"|"$/g, "");
    try {
      return decodeURIComponent(encoded);
    } catch {
      return encoded;
    }
  }

  const quotedMatch = contentDisposition.match(/filename\s*=\s*"([^"]+)"/i);
  if (quotedMatch) {
    return quotedMatch[1].trim();
  }

  const plainMatch = contentDisposition.match(/filename\s*=\s*([^;]+)/i);
  if (plainMatch) {
    return plainMatch[1].trim().replace(/^"|"$/g, "");
  }

  return null;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || `Request failed with ${res.status}`);
  }

  if (res.status === 204 || res.status === 205) {
    // No content responses produce empty body, so return undefined for generic handler
    return undefined as unknown as T;
  }

  const text = await res.text();
  if (!text) {
    return undefined as unknown as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch (err) {
    // When API returns text or no JSON body, fallback gracefully
    return text as unknown as T;
  }
}

export async function apiGet<T>(path: string, params?: Record<string, QueryValue>) {
  const res = await fetch(`${getApiBase()}${path}${toQuery(params)}`, {
    headers: authHeader()
  });
  return handleResponse<T>(res);
}

export async function apiPost<T>(path: string, body?: unknown) {
  const res = await fetch(`${getApiBase()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: body ? JSON.stringify(body) : undefined
  });
  return handleResponse<T>(res);
}

export async function apiPatch<T>(path: string, body?: unknown) {
  const res = await fetch(`${getApiBase()}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: body ? JSON.stringify(body) : undefined
  });
  return handleResponse<T>(res);
}

export async function apiDelete<T>(path: string) {
  const res = await fetch(`${getApiBase()}${path}`, { method: "DELETE", headers: authHeader() });
  return handleResponse<T>(res);
}

export async function apiPostForm<T>(path: string, form: FormData) {
  const res = await fetch(`${getApiBase()}${path}`, {
    method: "POST",
    headers: authHeader(),
    body: form
  });
  return handleResponse<T>(res);
}

export async function apiDownload(path: string, params?: Record<string, QueryValue>) {
  const res = await fetch(`${getApiBase()}${path}${toQuery(params)}`, {
    headers: authHeader()
  });
  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || `Request failed with ${res.status}`);
  }
  return res.blob();
}

export async function apiDownloadWithFilename(path: string, params?: Record<string, QueryValue>) {
  const res = await fetch(`${getApiBase()}${path}${toQuery(params)}`, {
    headers: authHeader()
  });
  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || `Request failed with ${res.status}`);
  }

  return {
    blob: await res.blob(),
    filename: parseDownloadFilename(res.headers.get("Content-Disposition"))
  };
}
