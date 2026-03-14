export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

// Deduplicate concurrent refresh attempts
let refreshPromise: Promise<void> | null = null;

async function tryRefresh(): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error("refresh_failed");
}

export async function apiFetch(
  path: string,
  init: RequestInit = {},
  _retry = true
): Promise<any> {
  const url = `${API_BASE}${path}`;
  const headers = new Headers(init.headers || {});

  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, { ...init, headers, credentials: "include" });

  // On 401, attempt a token refresh once then retry the original request
  if (res.status === 401 && _retry && !path.startsWith("/auth/refresh")) {
    if (!refreshPromise) {
      refreshPromise = tryRefresh().finally(() => {
        refreshPromise = null;
      });
    }
    try {
      await refreshPromise;
      return apiFetch(path, init, false);
    } catch {
      window.location.href = "/login";
      throw new Error("Session expired");
    }
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}${text ? ` - ${text}` : ""}`);
  }

  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  return res.text();
}

export async function logout(): Promise<void> {
  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // Ignore network errors — still redirect
  }
  window.location.href = "/";
}
