"use client";

import { Button, IconBtn } from "@/app/components/ui/button";
import { Icon } from "@/app/components/ui/icons";
import { cx } from "@/lib/cx";
import type { Notice } from "./use-console-store";

const TONE: Record<Notice["tone"], string> = {
  ok: "alert--success",
  bad: "alert--error",
  info: "alert--info",
};

/**
 * Every mutation lands here. The region is mounted once per panel and keeps its
 * `role="status"` live semantics across re-renders, so the operator hears the
 * outcome of a write even while the table repaints underneath it.
 */
export function NoticeRegion({
  notices,
  dismiss,
  className,
}: {
  notices: Notice[];
  dismiss: (id: number) => void;
  className?: string;
}) {
  return (
    <div className={cx("ops-live", className)} role="status" aria-live="polite">
      {notices.map((notice) => (
        <div key={notice.id} className={cx("alert", TONE[notice.tone])}>
          {notice.tone === "ok" ? (
            <Icon.CircleCheck size={17} />
          ) : notice.tone === "bad" ? (
            <Icon.Alert size={17} />
          ) : (
            <Icon.Info size={17} />
          )}
          <div>{notice.text}</div>
          <div className="alert__actions">
            {notice.action ? (
              <Button variant="outline" size="sm" onClick={notice.action.run}>
                {notice.action.label}
              </Button>
            ) : null}
            <IconBtn label="Dismiss notice" size="sm" tone="edge" onClick={() => dismiss(notice.id)}>
              <Icon.Close size={14} />
            </IconBtn>
          </div>
        </div>
      ))}
    </div>
  );
}
