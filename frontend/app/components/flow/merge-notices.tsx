"use client";

import { useEffect, useState } from "react";

import { Button } from "@/app/components/ui/button";
import { Alert } from "@/app/components/ui/display";

/** The sign-in form stashes guest-cart merge notes here so the first screen the
 *  customer lands on can explain what happened to their bag. */
const WARNING_KEY = "bazaar_cart_warnings";

/** Reads and consumes the stash. Returns the notes, or nothing when there are
 *  none, when storage is unavailable, or when the JSON is not a list. */
function takeMergeWarnings(): string[] {
  let raw: string | null = null;
  try {
    raw = window.sessionStorage.getItem(WARNING_KEY);
    if (raw) window.sessionStorage.removeItem(WARNING_KEY);
  } catch {
    return [];
  }
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

/**
 * Dismissible notice for guest-cart merge warnings.
 *
 * The stash only exists in the browser, so it is read after mount (never during
 * the server render) and removed as it is read, which means the same notice is
 * shown once, on the first flow screen the customer reaches.
 */
export function MergeNotices() {
  const [warnings, setWarnings] = useState<string[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let alive = true;
    const read = window.setTimeout(() => {
      if (alive) setWarnings(takeMergeWarnings());
    }, 0);
    return () => {
      alive = false;
      window.clearTimeout(read);
    };
  }, []);

  if (dismissed || warnings.length === 0) return null;

  return (
    <Alert
      tone="info"
      title="Carried over when you signed in"
      action={
        <Button variant="quiet" size="sm" onClick={() => setDismissed(true)}>
          Dismiss notice
        </Button>
      }
    >
      <ul className="flow-list">
        {warnings.map((warning, index) => (
          <li key={`${warning}-${index}`}>{warning}</li>
        ))}
      </ul>
    </Alert>
  );
}
