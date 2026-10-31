"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/app/components/ui/button";
import { Icon } from "@/app/components/ui/icons";
import { cx } from "@/lib/cx";
import { formatDateTime, formatRelative } from "@/lib/format";

type Probe = {
  state: "checking" | "ok" | "down";
  baseUrl: string | null;
  checkedAt: string | null;
  detail: string | null;
};

type Health = { ok?: boolean; base_url?: string; checked_at?: string };

/**
 * `/api/health` is the BFF's own route, not the proxy, so it is read with a
 * plain fetch. Nothing here is faked: down means the last probe failed.
 */
export function ServiceStrip({ className }: { className?: string }) {
  const [probe, setProbe] = useState<Probe>({
    state: "checking",
    baseUrl: null,
    checkedAt: null,
    detail: null,
  });
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const check = useCallback(async () => {
    setProbe((current) => ({ ...current, state: "checking", detail: null }));
    try {
      const response = await fetch("/api/health", { cache: "no-store" });
      const body = (await response.json().catch(() => null)) as Health | null;
      if (!mounted.current) return;
      setProbe({
        state: response.ok && body?.ok ? "ok" : "down",
        baseUrl: body?.base_url ?? null,
        checkedAt: body?.checked_at ?? new Date().toISOString(),
        detail: response.ok ? null : `The health route answered ${response.status}.`,
      });
    } catch {
      if (!mounted.current) return;
      setProbe({
        state: "down",
        baseUrl: null,
        checkedAt: new Date().toISOString(),
        detail: "The console could not reach its own server.",
      });
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void check(), 0);
    return () => window.clearTimeout(timer);
  }, [check]);

  const word =
    probe.state === "ok" ? "Backend answering" : probe.state === "down" ? "Backend down" : "Checking";

  return (
    <section className={cx("ops-svc", className)} aria-label="Service status">
      <p className="ops-svc__state">
        <span
          className={cx(
            "ops-svc__dot",
            probe.state === "ok" && "ops-svc__dot--ok",
            probe.state === "down" && "ops-svc__dot--down",
          )}
          aria-hidden="true"
        />
        {probe.state === "checking" ? <Icon.Spinner size={15} /> : null}
        {probe.state === "ok" ? <Icon.CircleCheck size={16} /> : null}
        {probe.state === "down" ? <Icon.CircleX size={16} /> : null}
        <strong>{word}</strong>
      </p>

      <dl className="ops-svc__meta">
        <div className="ops-svc__row">
          <dt>Service</dt>
          <dd className="mono">{probe.baseUrl ?? "unknown"}</dd>
        </div>
        <div className="ops-svc__row">
          <dt>Checked</dt>
          <dd className="num">
            {probe.checkedAt ? (
              <time dateTime={probe.checkedAt}>{formatRelative(probe.checkedAt)}</time>
            ) : (
              "not yet"
            )}
          </dd>
        </div>
      </dl>

      {probe.detail ? <p className="ops-svc__detail">{probe.detail}</p> : null}
      {probe.state === "ok" && probe.checkedAt ? (
        <p className="ops-svc__detail muted">
          Last probe {formatDateTime(probe.checkedAt)}.
        </p>
      ) : null}

      <Button
        variant="outline"
        size="sm"
        icon={<Icon.Refresh size={15} />}
        loading={probe.state === "checking"}
        onClick={() => void check()}
      >
        Refresh
      </Button>
    </section>
  );
}
