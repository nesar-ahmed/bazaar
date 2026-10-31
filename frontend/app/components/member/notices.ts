/** Copy + URL helpers shared by the auth and account surfaces.
 *  Plain module: safe to import from server components and client components. */

import { safeRedirectTarget } from "@/lib/auth";

export type NoticeCode =
  | "signed-out"
  | "signed-out-unconfirmed"
  | "password-changed";

export type AuthNotice = {
  code: NoticeCode;
  tone: "success" | "warn" | "info";
  title: string;
  body: string;
};

const NOTICE_COPY: Record<NoticeCode, Omit<AuthNotice, "code">> = {
  "signed-out": {
    tone: "success",
    title: "You are signed out.",
    body: "Your bag on this device stays where it is until you sign back in.",
  },
  "signed-out-unconfirmed": {
    tone: "warn",
    title: "You are signed out of this browser.",
    body: "Bazaar could not confirm the server-side revocation. If you signed in on a shared device, sign in once more so the session can be closed properly.",
  },
  "password-changed": {
    tone: "success",
    title: "Your password is changed.",
    body: "Changing a password revokes every session on the account, so this browser signed you out. Use the new password to continue.",
  },
};

/** Resolve a `?notice=` value into authored copy. Unknown codes render nothing. */
export function noticeFromCode(value: string | string[] | null | undefined): AuthNotice | null {
  const code = single(value);
  if (!code) return null;
  const copy = NOTICE_COPY[code as NoticeCode];
  if (!copy) return null;
  return { code: code as NoticeCode, ...copy };
}

/** A `?next=` value only survives if it is a same-origin relative path. */
export function safeNextTarget(value: string | string[] | null | undefined): string | null {
  const raw = single(value);
  return safeRedirectTarget(raw);
}

/** Search params arrive as `string | string[] | undefined`. */
export function single(value: string | string[] | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const first = Array.isArray(value) ? value[0] : value;
  return first === undefined || first === "" ? null : first;
}

/** Where a finished sign-in or sign-up should land. */
export function afterAuthTarget(next?: string | string[] | null): string {
  return safeNextTarget(next) ?? "/account";
}

export function signInHref(options: { next?: string | null; notice?: NoticeCode | null } = {}): string {
  const params = new URLSearchParams();
  const next = safeNextTarget(options.next);
  if (next) params.set("next", next);
  if (options.notice) params.set("notice", options.notice);
  const query = params.toString();
  return query ? `/login?${query}` : "/login";
}

export function signUpHref(options: { next?: string | null } = {}): string {
  const params = new URLSearchParams();
  const next = safeNextTarget(options.next);
  if (next) params.set("next", next);
  const query = params.toString();
  return query ? `/register?${query}` : "/register";
}
