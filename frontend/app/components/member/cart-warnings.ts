"use client";

/** Guest-bag merge warnings written by the auth flow into sessionStorage
 *  (`bazaar_cart_warnings`) and consumed exactly once here.
 *
 *  Reading a browser store without a hydration mismatch is what
 *  `useSyncExternalStore` is for: the server snapshot is always empty, the
 *  client snapshot is read once and then held in module state so re-renders
 *  (tab switches, router refreshes) keep showing the same list. */

const KEY = "bazaar_cart_warnings";

const EMPTY: string[] = [];

let snapshot: string[] = EMPTY;
let consumed = false;

export function warningsSubscribe(): () => void {
  return () => {};
}

export function cartWarningsServerSnapshot(): string[] {
  return EMPTY;
}

export function cartWarningsSnapshot(): string[] {
  if (consumed) return snapshot;
  consumed = true;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return (snapshot = EMPTY);
    window.sessionStorage.removeItem(KEY);
    const parsed: unknown = JSON.parse(raw);
    snapshot = Array.isArray(parsed) ? parsed.map((entry) => String(entry)) : EMPTY;
  } catch {
    snapshot = EMPTY;
  }
  return snapshot;
}
