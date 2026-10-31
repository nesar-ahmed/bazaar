"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Icon } from "@/app/components/ui/icons";

/** Off-canvas nav for narrow screens. Search lives here rather than in the
 *  masthead, because a 40px icon field is useless with a keyboard. */
export function MobileNav() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="icon-btn burger"
        aria-expanded={open}
        aria-controls="mobile-sheet"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((current) => !current)}
      >
        <span aria-hidden="true" />
        <span aria-hidden="true" />
      </button>

      {open ? (
        <>
          <div className="overlay" onClick={() => setOpen(false)} aria-hidden="true" />
          <nav className="sheet" id="mobile-sheet" aria-label="Menu">
            <form action="/discover" method="get" className="control-group" role="search">
              <Icon.Search size={17} className="control-group__icon" />
              <input
                type="search"
                name="q"
                placeholder="Search pieces"
                aria-label="Search pieces"
                autoComplete="off"
                maxLength={120}
              />
              <button type="submit" className="icon-btn icon-btn--sm" aria-label="Run search">
                <Icon.ArrowRight size={16} />
              </button>
            </form>
            <Link href="/discover">Shop all pieces</Link>
            <Link href="/cart">Your bag</Link>
            <Link href="/account">Account</Link>
            <Link href="/admin">Ops console</Link>
          </nav>
        </>
      ) : null}
    </>
  );
}
