const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

let authToken: string | null = localStorage.getItem("aw_token");

export function setAuthToken(token: string | null) {
  authToken = token;
  if (token) localStorage.setItem("aw_token", token);
  else localStorage.removeItem("aw_token");
}

export function getAuthToken() {
  return authToken;
}

export class ApiClientError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (authToken) headers.set("Authorization", `Bearer ${authToken}`);

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

  if (res.status === 204) return undefined as T;

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    const message = typeof body === "object" && body?.message ? body.message : `Request failed (${res.status})`;
    throw new ApiClientError(res.status, message);
  }

  return body as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "POST", body: data instanceof FormData ? data : JSON.stringify(data) }),
  put: <T>(path: string, data?: unknown) => request<T>(path, { method: "PUT", body: JSON.stringify(data) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

// Downloads a file from an authenticated endpoint (plain <a href> can't send
// the Authorization header) by fetching it as a blob and triggering a save.
export async function downloadFile(path: string, filename: string) {
  const headers = new Headers();
  if (authToken) headers.set("Authorization", `Bearer ${authToken}`);
  const res = await fetch(`${API_BASE_URL}${path}`, { headers });
  if (!res.ok) throw new ApiClientError(res.status, `Download failed (${res.status})`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
