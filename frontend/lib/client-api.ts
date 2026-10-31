/** Browser-side client for the BFF (`/api/backend/*`, `/api/auth/*`, `/api/health`).
 *  The browser never talks to FastAPI directly. */

export class ApiError extends Error {
  status: number;
  fields: Record<string, string>;

  constructor(message: string, status = 0, fields: Record<string, string> = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fields = fields;
  }
}

export const CART_TOKEN_KEY = "bazaar_cart_token";

export function readCartToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(CART_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function writeCartToken(token: string) {
  try {
    window.localStorage.setItem(CART_TOKEN_KEY, token);
  } catch {
    /* private mode: the guest cart then only lives for this page view */
  }
}

export function clearCartToken() {
  try {
    window.localStorage.removeItem(CART_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | null | undefined>;
  cartToken?: string | null;
  signal?: AbortSignal;
};

function toQuery(query?: RequestOptions["query"]): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined || value === "") continue;
    params.set(key, String(value));
  }
  const encoded = params.toString();
  return encoded ? `?${encoded}` : "";
}

export async function apiRequest<T>(
  path: string,
  { method = "GET", body, query, cartToken, signal }: RequestOptions = {},
): Promise<T> {
  const token = cartToken ?? readCartToken();
  const response = await fetch(`/api/backend/${path}${toQuery(query)}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(token && path.startsWith("cart") ? { "X-Cart-Token": token } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    ...(signal ? { signal } : {}),
    cache: "no-store",
  });

  if (response.status === 204) return undefined as T;

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const record = (payload ?? {}) as { error?: string; fields?: Record<string, string> };
    throw new ApiError(
      record.error ||
        (response.status === 503
          ? "Bazaar is unreachable right now. Please try again."
          : "We could not complete that action."),
      response.status,
      record.fields ?? {},
    );
  }

  return payload as T;
}

export function apiGet<T>(path: string, query?: RequestOptions["query"]) {
  return apiRequest<T>(path, { query });
}

export function apiSend<T>(
  path: string,
  body?: unknown,
  method: "POST" | "PATCH" | "DELETE" = "POST",
) {
  return apiRequest<T>(path, { method, body });
}

/** Auth endpoints live outside the proxy allow-list and set HttpOnly cookies. */
export async function authRequest<T>(
  route: "login" | "register" | "logout",
  body?: unknown,
): Promise<T> {
  const token = readCartToken();
  const response = await fetch(`/api/auth/${route}`, {
    method: "POST",
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(token ? { "X-Cart-Token": token } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const record = (payload ?? {}) as { error?: string; fields?: Record<string, string> };
    throw new ApiError(record.error ?? "We could not complete that action.", response.status, record.fields ?? {});
  }
  return payload as T;
}

/** Broadcast an auth change so the cart re-reads the merged server cart. */
export function announceAuthChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("bazaar:auth-changed"));
}
