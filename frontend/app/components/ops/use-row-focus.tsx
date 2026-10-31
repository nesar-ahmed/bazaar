"use client";

import { useEffect, useRef } from "react";

import { IconBtn } from "@/app/components/ui/button";
import { Icon } from "@/app/components/ui/icons";
import { cx } from "@/lib/cx";
import type { ConsoleStore } from "./use-console-store";
import type { RowKind, RowTarget } from "./types";

export function rowDomId(kind: RowKind, id: number): string {
  return `ops-row--${kind}-${id}`;
}

/**
 * Brings the console to a row the operator just acted on, or was sent to from
 * another panel. Focus moves, the row is flagged, and nothing else is re-read.
 */
export function useRowFocus(
  store: ConsoleStore,
  tab: string,
  kind: RowKind,
  rows: Array<{ id: number }>,
) {
  const flagged = useRef<number | null>(null);

  useEffect(() => {
    const wanted = store.wanted;
    if (!wanted || wanted.tab !== tab || wanted.kind !== kind) return;
    if (!rows.some((row) => row.id === wanted.id)) return;
    if (flagged.current === wanted.id) return;
    flagged.current = wanted.id;

    const node = document.getElementById(rowDomId(kind, wanted.id));
    if (!node) return;
    node.scrollIntoView({ block: "center", behavior: "smooth" });
    node.focus({ preventScroll: true });
    store.clearWanted(wanted.id);
  }, [store, tab, kind, rows]);

  const isWanted = (id: number): boolean =>
    Boolean(store.wanted && store.wanted.tab === tab && store.wanted.kind === kind && store.wanted.id === id);

  const isLast = (id: number): boolean =>
    Boolean(store.lastRow && store.lastRow.kind === kind && store.lastRow.id === id);

  return { isWanted, isLast };
}

/** A row the operator can actually reach: ref target plus a jump affordance. */
export function RowJump({
  target,
  store,
  label,
  className,
}: {
  target: RowTarget;
  store: ConsoleStore;
  label: string;
  className?: string;
}) {
  return (
    <IconBtn
      label={label}
      size="sm"
      tone="edge"
      className={cx("ops-jump", className)}
      onClick={() => store.goTo(target)}
    >
      <Icon.ChevronRight size={15} />
    </IconBtn>
  );
}
