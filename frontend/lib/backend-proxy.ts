import "server-only";

import { cookies } from "next/headers";

import {
  ACCESS_TOKEN_COOKIE,
  cookieOptions,
  getApiUrl,
  REFRESH_TOKEN_COOKIE,
  ROLE_COOKIE,
} from "@/lib/auth";
import type { TokenPair, UserProfile } from "@/lib/api-types";

type RotatedTokens = Pick<
  TokenPair,
  "access_token" | "refresh_token" | "expires_in" | "refresh_expires_in"
>;

type BackendRequest = {
  /** Path after `/api/v1`, e.g. `products?limit=24`. */
  path: string;
  method?: string;
  body?: string;
  cartToken?: string | null;
  /** Skip the refresh-and-retry dance (used when probing an expired session). */
  allowRefresh?: boolean;
};

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** Concurrent 401s must not each replay the single-use refresh token —
 *  the backend revokes the whole session when that happens. */
const refreshFlights = new Map<
  string,
  { expiresAt: number; promise: Promise<RotatedTokens | null> }
>();

function saveTokens(
  store: Awaited<ReturnType<typeof cookies>>,
  tokens: RotatedTokens,
) {
  store.set(ACCESS_TOKEN_COOKIE, tokens.access_token, {
    ...cookieOptions(tokens.expires_in),
  });
  store.set(REFRESH_TOKEN_COOKIE, tokens.refresh_token, {
    ...cookieOptions(tokens.refresh_expires_in),
  });
}

function clearTokens(store: Awaited<ReturnType<typeof cookies>>) {
  store.set(ACCESS_TOKEN_COOKIE, "", cookieOptions(0));
  store.set(REFRESH_TOKEN_COOKIE, "", cookieOptions(0));
  store.set(ROLE_COOKIE, "", cookieOptions(0));
}

async function rotateTokens(
  store: Awaited<ReturnType<typeof cookies>>,
): Promise<RotatedTokens | null> {
  const refreshToken = store.get(REFRESH_TOKEN_COOKIE)?.value;
  if (!refreshToken) return null;

  const existing = refreshFlights.get(refreshToken);
  if (existing && existing.expiresAt > Date.now()) {
    const tokens = await existing.promise;
    if (tokens) saveTokens(store, tokens);
    else clearTokens(store);
    return tokens;
  }

  const promise = (async (): Promise<RotatedTokens | null> => {
    const response = await fetch(`${getApiUrl()}/api/v1/users/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: "no-store",
    });
    if (!response.ok) return null;
    return (await response.json()) as RotatedTokens;
  })();

  const entry = { expiresAt: Date.now() + 5000, promise };
  refreshFlights.set(refreshToken, entry);
  setTimeout(() => {
    if (refreshFlights.get(refreshToken) === entry) {
      refreshFlights.delete(refreshToken);
    }
  }, 5000).unref?.();

  const tokens = await promise;
  if (tokens) saveTokens(store, tokens);
  else clearTokens(store);
  return tokens;
}

export async function callBackend({
  path,
  method = "GET",
  body,
  cartToken,
  allowRefresh = true,
}: BackendRequest): Promise<Response> {
  const store = await cookies();
  let accessToken = store.get(ACCESS_TOKEN_COOKIE)?.value;

  if (!accessToken && allowRefresh && store.get(REFRESH_TOKEN_COOKIE)?.value) {
    accessToken = (await rotateTokens(store))?.access_token;
  }

  const send = (token?: string) => {
    const headers = new Headers();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    if (body !== undefined) headers.set("Content-Type", "application/json");
    if (cartToken) headers.set("X-Cart-Token", cartToken);
    return fetch(`${getApiUrl()}/api/v1/${path}`, {
      method,
      headers,
      body,
      cache: "no-store",
    });
  };

  let response = await send(accessToken);
  if (
    response.status === 401 &&
    allowRefresh &&
    store.get(REFRESH_TOKEN_COOKIE)?.value
  ) {
    const tokens = await rotateTokens(store);
    if (tokens) response = await send(tokens.access_token);
  }
  return response;
}

/** Server-component helper: returns parsed JSON or throws ApiError. */
export async function backendJson<T>(
  request: BackendRequest,
  fallback = "We could not reach the Bazaar service.",
): Promise<T> {
  let response: Response;
  try {
    response = await callBackend(request);
  } catch {
    throw new ApiError(fallback, 503);
  }
  if (response.status === 204) return undefined as T;
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(describeStatus(response.status, payload, fallback), response.status);
  }
  return payload as T;
}

export function describeStatus(
  status: number,
  payload: unknown,
  fallback = "We could not reach the Bazaar service.",
): string {
  const detail = extractDetail(payload);
  if (detail) return detail;
  if (status === 401) return "Your session has ended. Please sign in again.";
  if (status === 403) return "Administrator privileges are required.";
  if (status === 404) return "We could not find what you were looking for.";
  if (status >= 500) return fallback;
  return fallback;
}

function extractDetail(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) return null;
  const record = payload as Record<string, unknown>;
  if (typeof record.error === "string") return record.error;
  if (typeof record.detail === "string") return record.detail;
  return null;
}

export async function revokeBackendSession(): Promise<void> {
  const store = await cookies();
  const hasSession =
    store.get(ACCESS_TOKEN_COOKIE)?.value || store.get(REFRESH_TOKEN_COOKIE)?.value;
  if (hasSession) {
    try {
      await callBackend({ path: "users/logout", method: "POST" });
    } finally {
      clearTokens(store);
    }
  } else {
    clearTokens(store);
  }
}

/** Keeps the middleware role hint warm; the backend still authorizes every call. */
export async function writeRoleHint(role: UserProfile["role"] | string): Promise<void> {
  const store = await cookies();
  store.set(ROLE_COOKIE, role, cookieOptions(60 * 60 * 12));
}

export async function writeSessionCookies(tokens: TokenPair): Promise<void> {
  const store = await cookies();
  saveTokens(store, tokens);
}

export { clearTokens };
