import "server-only";

import { cookies } from "next/headers";

import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  ROLE_COOKIE,
} from "@/lib/auth";

/** Cookie presence is a navigation hint only, not an authenticated check. */
export async function hasSessionTokens(): Promise<boolean> {
  const store = await cookies();
  return Boolean(
    store.get(ACCESS_TOKEN_COOKIE)?.value ||
      store.get(REFRESH_TOKEN_COOKIE)?.value,
  );
}

export async function readRoleHint(): Promise<string | null> {
  const store = await cookies();
  return store.get(ROLE_COOKIE)?.value ?? null;
}
