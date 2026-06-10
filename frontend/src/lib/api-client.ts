const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export async function apiRequest<T = any>(
  path: string,
  options: RequestInit = {},
  retries = 12,
  delay = 1000
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

  let attempt = 0;
  while (attempt < retries) {
    try {
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

      return (await response.json()) as T;
    } catch (error: any) {
      attempt++;
      // fetch() throws a TypeError on network failures (like connection refused)
      if (attempt >= retries || !(error instanceof TypeError)) {
        throw error;
      }
      console.warn(`[api-client] Network error fetching ${path}. Retrying in ${delay}ms... (Attempt ${attempt}/${retries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.min(delay * 1.5, 3000); // Cap delay at 3 seconds to poll effectively
    }
  }

  throw new Error("API request failed");
}

export function getBaseUrl(): string {
  return BASE_URL;
}
