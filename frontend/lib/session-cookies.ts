import { NextResponse } from "next/server";

import type { TokenPair, UserProfile } from "@/lib/api-types";
import {
  ACCESS_TOKEN_COOKIE,
  cookieOptions,
  getApiUrl,
  REFRESH_TOKEN_COOKIE,
  ROLE_COOKIE,
} from "@/lib/auth";

export function applySessionCookies(
  response: NextResponse,
  tokens: TokenPair,
  role?: string | null,
) {
  response.cookies.set(
    ACCESS_TOKEN_COOKIE,
    tokens.access_token,
    cookieOptions(tokens.expires_in),
  );
  response.cookies.set(
    REFRESH_TOKEN_COOKIE,
    tokens.refresh_token,
    cookieOptions(tokens.refresh_expires_in),
  );
  response.cookies.set(ROLE_COOKIE, role ?? "", cookieOptions(role ? 60 * 60 * 12 : 0));
}

export function clearSessionCookies(response: NextResponse) {
  response.cookies.set(ACCESS_TOKEN_COOKIE, "", cookieOptions(0));
  response.cookies.set(REFRESH_TOKEN_COOKIE, "", cookieOptions(0));
  response.cookies.set(ROLE_COOKIE, "", cookieOptions(0));
}

/** The token payload carries no role, so read it once from the API to warm
 *  the middleware hint. Never fatal: a missing hint just falls back to the
 *  authoritative server-side check. */
export async function fetchRole(accessToken: string): Promise<string | null> {
  try {
    const response = await fetch(`${getApiUrl()}/api/v1/users/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) return null;
    return ((await response.json()) as UserProfile).role ?? null;
  } catch {
    return null;
  }
}
