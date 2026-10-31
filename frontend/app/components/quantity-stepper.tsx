"use client";

import { useEffect, useRef, useState } from "react";

import { Icon } from "@/app/components/ui/icons";
import { cx } from "@/lib/cx";

/** Quantity control for cart lines and the product page. `max` is the caller's
 *  stock figure; the API additionally caps a line at 99 units. */
export function QuantityStepper({
  value,
  onChange,
  max = 99,
  min = 1,
  label,
  disabled,
  busy,
  size = "md",
}: {
  value: number;
  onChange: (next: number) => void;
  max?: number;
  min?: number;
  label: string;
  disabled?: boolean;
  busy?: boolean;
  size?: "sm" | "md";
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    if (document.activeElement !== inputRef.current) setDraft(String(value));
  }, [value]);

  function commit(raw: string) {
    const parsed = Number.parseInt(raw, 10);
    const next = Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : value;
    setDraft(String(next));
    if (next !== value) onChange(next);
  }

  return (
    <div className={cx("stepper", size === "sm" && "stepper--sm")}>
      <button
        type="button"
        aria-label={`Decrease ${label}`}
        disabled={disabled || busy || value <= min}
        onClick={() => commit(String(Math.max(min, value - 1)))}
      >
        <Icon.Minus size={16} />
      </button>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        aria-label={label}
        value={draft}
        disabled={disabled || busy}
        onChange={(event) => setDraft(event.target.value.replace(/[^0-9]/g, ""))}
        onBlur={(event) => commit(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") commit(event.currentTarget.value);
        }}
      />
      <button
        type="button"
        aria-label={`Increase ${label}`}
        disabled={disabled || busy || value >= max}
        onClick={() => commit(String(Math.min(max, value + 1)))}
      >
        <Icon.Plus size={16} />
      </button>
    </div>
  );
}
