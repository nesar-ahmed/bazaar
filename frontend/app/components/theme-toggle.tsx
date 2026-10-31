"use client";

import { useSyncExternalStore } from "react";

import { Icon } from "@/app/components/ui/icons";

export const THEME_KEY = "bazaar_theme";
export type Theme = "light" | "dark";

const THEME_EVENT = "bazaar:theme-change";

function currentTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function subscribeTheme(onChange: () => void): () => void {
  window.addEventListener(THEME_EVENT, onChange);
  return () => window.removeEventListener(THEME_EVENT, onChange);
}

function serverTheme(): Theme {
  return "light";
}

export function systemTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Applies the stored (or system) theme before paint via the inline script in
 *  layout.tsx; this control only toggles and persists a manual choice. */
export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribeTheme, currentTheme, serverTheme);

  function flip() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    window.dispatchEvent(new Event(THEME_EVENT));
    try {
      window.localStorage.setItem(THEME_KEY, next);
    } catch {
      /* private mode: the choice lasts for this page view */
    }
  }

  return (
    <button
      type="button"
      className="icon-btn"
      onClick={flip}
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      aria-pressed={theme === "dark"}
      title={theme === "dark" ? "Light theme" : "Dark theme"}
    >
      {theme === "dark" ? <Icon.Sun size={19} /> : <Icon.Moon size={19} />}
    </button>
  );
}
