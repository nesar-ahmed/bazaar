"use client";

import { useRef } from "react";
import type { ReactNode } from "react";

import { cx } from "@/lib/cx";

export type TabItem = {
  id: string;
  label: string;
  icon?: ReactNode;
  count?: number | string;
};

/** WAI-ARIA tablist with roving tabindex and arrow-key traversal. */
export function TabBar({
  items,
  value,
  onChange,
  label,
  className,
}: {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  label: string;
  className?: string;
}) {
  const refs = useRef(new Map<string, HTMLButtonElement>());

  function moveFocus(from: number, delta: number) {
    const next = (from + delta + items.length) % items.length;
    const item = items[next];
    onChange(item.id);
    refs.current.get(item.id)?.focus();
  }

  return (
    <div
      className={cx("tabs", className)}
      role="tablist"
      aria-label={label}
      onKeyDown={(event) => {
        const index = items.findIndex((item) => item.id === value);
        if (event.key === "ArrowRight" || event.key === "ArrowDown") {
          event.preventDefault();
          moveFocus(index, 1);
        } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
          event.preventDefault();
          moveFocus(index, -1);
        } else if (event.key === "Home") {
          event.preventDefault();
          moveFocus(index, -index);
        } else if (event.key === "End") {
          event.preventDefault();
          moveFocus(index, items.length - 1 - index);
        }
      }}
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          ref={(node) => {
            if (node) refs.current.set(item.id, node);
            else refs.current.delete(item.id);
          }}
          id={`tab-${item.id}`}
          className="tab"
          aria-selected={item.id === value}
          aria-controls={`panel-${item.id}`}
          tabIndex={item.id === value ? 0 : -1}
          onClick={() => onChange(item.id)}
        >
          {item.icon}
          {item.label}
          {item.count !== undefined ? <span className="tab__count">{item.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

export function TabPanel({
  id,
  active,
  children,
}: {
  id: string;
  active: boolean;
  children: ReactNode;
}) {
  if (!active) return null;
  return (
    <div
      role="tabpanel"
      id={`panel-${id}`}
      aria-labelledby={`tab-${id}`}
      tabIndex={-1}
    >
      {children}
    </div>
  );
}
