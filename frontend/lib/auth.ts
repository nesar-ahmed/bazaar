export const ACCESS_TOKEN_COOKIE = "bazaar_access_token";
export const REFRESH_TOKEN_COOKIE = "bazaar_refresh_token";
/** Read-only hint used by middleware to gate the admin shell. The backend is
 *  always the authority: every admin screen re-verifies the role server-side. */
export const ROLE_COOKIE = "bazaar_role";
export const SIGN_IN_ROUTE = "/login";
export const SIGN_IN_FIELD = "next";

export function getApiUrl(): string {
  return (process.env.API_URL ?? "http://localhost:8000").replace(/\/$/, "");
}

export function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

/** Only `/login`'s own origin-relative paths survive, so `?next=` cannot
 *  become an open redirect. */
export function safeRedirectTarget(value: string | null | undefined): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return null;
  }

  try {
    const target = new URL(value, "https://bazaar.invalid");
    if (target.origin !== "https://bazaar.invalid") return null;
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return null;
  }
}

export function signInUrl(next?: string | null): string {
  const target = safeRedirectTarget(next);
  return target
    ? `${SIGN_IN_ROUTE}?${SIGN_IN_FIELD}=${encodeURIComponent(target)}`
    : SIGN_IN_ROUTE;
}
