"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { MouseEvent } from "react";

import { signOutAndRedirect } from "@/app/components/member/session";
import { Icon } from "@/app/components/ui/icons";
import { signInUrl } from "@/lib/auth";

export function HeaderAccountLink({
  signedIn,
  fullName,
}: {
  signedIn: boolean;
  fullName: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    function closeOutside(event: PointerEvent) {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    }

    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  function signInFromCurrentPage(event: MouseEvent<HTMLAnchorElement>) {
    if (signedIn || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    event.preventDefault();
    const target = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    router.push(signInUrl(target));
  }

  async function signOut() {
    setError(null);
    setIsSigningOut(true);
    try {
      await signOutAndRedirect(router);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "We could not reach Bazaar to sign out. Try again.",
      );
    } finally {
      setIsSigningOut(false);
    }
  }

  if (signedIn) {
    return (
      <div className="account-menu" ref={root}>
        <button
          ref={trigger}
          type="button"
          className="header-link account-menu__trigger"
          aria-expanded={open}
          aria-controls="header-account-menu"
          onClick={() => setOpen((current) => !current)}
          disabled={isSigningOut}
        >
          <Icon.User size={19} />
          <span className="account-menu__name">{fullName || "Account"}</span>
          <Icon.ChevronDown className="account-menu__chevron" size={15} />
        </button>
        {open ? (
          <div className="account-menu__panel" id="header-account-menu">
            <Link
              href="/account"
              className="account-menu__item"
              onClick={() => setOpen(false)}
            >
              <Icon.User size={16} />
              Account
            </Link>
            <button
              type="button"
              className="account-menu__item account-menu__signout"
              onClick={() => void signOut()}
              disabled={isSigningOut}
            >
              {isSigningOut ? <Icon.Spinner size={16} /> : <Icon.LogOut size={16} />}
              {isSigningOut ? "Signing out…" : "Sign out"}
            </button>
            {error ? <p className="account-menu__error" role="alert">{error}</p> : null}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <Link
      className="header-link"
      href="/login"
      onClick={signInFromCurrentPage}
    >
      <Icon.User size={19} />
      <span>Sign in</span>
    </Link>
  );
}
