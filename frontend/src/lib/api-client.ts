const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function apiRequest<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  let token: string | null = null;
  
  if (typeof window !== "undefined") {
    token = localStorage.getItem("auth-token");
  }
  
  const headers = new Headers(options.headers);
  
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("auth-token");
        window.dispatchEvent(new CustomEvent("auth-unauthorized"));
      }
    }
    const errorData = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(errorData.detail || `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function getBaseUrl(): string {
  return BASE_URL;
}
