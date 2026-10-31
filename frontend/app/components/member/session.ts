"use client";

import { announceAuthChange, authRequest } from "@/lib/client-api";

import { signInHref, type NoticeCode } from "./notices";

export type LogoutResult = {
  ok: boolean;
  server_revocation_confirmed: boolean;
  warning?: string;
};

/** Only what the helpers below need, so a real Next router is accepted without
 *  reaching for internal type paths. */
export type SignOutRouter = {
  replace: (href: string) => void;
  refresh: () => void;
};

/**
 * Signs the account out through the BFF, tells the cart provider to drop the
 * merged bag, then returns to the storefront. A notice is only shown when a
 * security action explicitly needs one, such as a password change.
 */
export async function signOutAndRedirect(
  router: SignOutRouter,
  options: { notice?: NoticeCode } = {},
): Promise<LogoutResult> {
  const result = await authRequest<LogoutResult>("logout");
  announceAuthChange();

  const redirect =
    options.notice
      ? signInHref({ notice: options.notice })
      : !result.server_revocation_confirmed || result.warning
        ? signInHref({ notice: "signed-out-unconfirmed" })
        : "/";

  router.replace(redirect);
  router.refresh();
  return result;
}
