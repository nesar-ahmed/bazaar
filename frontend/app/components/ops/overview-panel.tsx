"use client";

import { useMemo } from "react";
import Link from "next/link";

import { Button, ButtonLink } from "@/app/components/ui/button";
import { EmptyState, Money, OrderStatusPill, Panel } from "@/app/components/ui/display";
import { Icon } from "@/app/components/ui/icons";
import { ORDER_STATUSES } from "@/lib/api-types";
import { orderRef, plural, statusLabel } from "@/lib/format";
import { cx } from "@/lib/cx";

import { attentionList, computeMetrics, pageCopy } from "./metrics";
import { ServiceStrip } from "./service-strip";
import type { ConsoleStore } from "./use-console-store";
import { LOW_STOCK } from "./types";

function Kpi({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  note?: React.ReactNode;
  tone?: "bad" | "warn";
}) {
  return (
    <div className={cx("ops-kpi", tone && `ops-kpi--${tone}`)}>
      <p className="label ops-kpi__label">{label}</p>
      <p className="ops-kpi__value">{value}</p>
      {note ? <p className="ops-kpi__note tiny muted">{note}</p> : null}
    </div>
  );
}

export function OpsOverview({ store }: { store: ConsoleStore }) {
  const metrics = useMemo(
    () => computeMetrics(store.products, store.orders),
    [store.products, store.orders],
  );
  const items = useMemo(
    () => attentionList(store.products, store.orders, store.categoryName),
    [store.products, store.orders, store.categoryName],
  );

  const waiting = metrics.byStatus.pending;
  const busy = store.page.loading;

  return (
    <div className="ops-stack">
      <ServiceStrip />

      <Panel
        id="ops-snapshot"
        title="Ledger snapshot"
        eyebrow="Counted from live reads"
        actions={
          <Button
            variant="outline"
            size="sm"
            icon={<Icon.Refresh size={15} />}
            loading={busy}
            onClick={store.reloadProducts}
          >
            Re-read rows
          </Button>
        }
        bodyClass="panel__body--tight"
        footer={
          <p className="tiny muted">
            Catalog tiles count the {plural(metrics.rows, "row")} this console holds.{" "}
            {pageCopy(store.products.length, store.page.filled)}; the list endpoint publishes no
            total. Order tiles count every order, because the admin queue is unpaginated.
          </p>
        }
      >
        <dl className="ops-kpis">
          <Kpi
            label="Pieces live"
            value={
              <span className="num">
                {metrics.live}
                <span className="ops-kpi__of"> / {metrics.rows}</span>
              </span>
            }
            note={
              metrics.hidden > 0
                ? `${plural(metrics.hidden, "row")} hidden from the storefront`
                : "every held row is on the storefront"
            }
          />
          <Kpi
            label="Out of stock"
            tone={metrics.outOfStock > 0 ? "bad" : undefined}
            value={<span className="num">{metrics.outOfStock}</span>}
            note="live pieces with no units"
          />
          <Kpi
            label={`Low stock (${LOW_STOCK} or fewer)`}
            tone={metrics.lowStock > 0 ? "warn" : undefined}
            value={<span className="num">{metrics.lowStock}</span>}
            note="worth a reorder"
          />
          <Kpi
            label="Inventory units"
            value={<span className="num">{metrics.units}</span>}
            note={`${plural(metrics.unfiled, "piece")} unfiled`}
          />
          <Kpi
            label="Shelf value"
            value={<Money cents={metrics.shelfCents} />}
            note="price times units on hand"
          />
          <Kpi
            label="Units sold"
            value={<span className="num">{metrics.unitsSold}</span>}
            note="cancelled orders excluded"
          />
          <Kpi
            label="Average order"
            value={<Money cents={metrics.aovCents} />}
            note={`across ${plural(metrics.orders - metrics.byStatus.cancelled, "uncancelled order")}`}
          />
          <div className="ops-kpi ops-kpi--wide">
            <p className="label ops-kpi__label">Orders by status</p>
            <ul className="ops-statuses">
              {ORDER_STATUSES.map((status) => (
                <li key={status}>
                  <OrderStatusPill status={status} />
                  <span className="num">{metrics.byStatus[status]}</span>
                  <span className="ops-statuses__label">{statusLabel(status)}</span>
                </li>
              ))}
            </ul>
          </div>
        </dl>
      </Panel>

      <Panel
        id="ops-attention"
        title="Needs attention"
        eyebrow="Five rows, ranked"
        bodyClass="panel__body--tight"
        footer={
          <p className="tiny muted">
            A stockout inside a waiting order outranks the order itself. Picking anything else
            first is your call.
          </p>
        }
      >
        {store.lastRow ? (
          <p className="ops-lastact">
            <span className="label">Last row you touched</span>
            <Button variant="quiet" size="sm" onClick={() => store.goTo(store.lastRow!)}>
              {store.lastRow.label}
            </Button>
            <span className="tiny muted">{store.lastRow.tab}</span>
          </p>
        ) : null}

        {items.length === 0 ? (
          <EmptyState
            icon={<Icon.CircleCheck size={22} />}
            title="Nothing is waiting on you"
            action={<ButtonLink href="/admin?tab=products" variant="outline" size="sm">File a product</ButtonLink>}
          >
            {waiting === 0
              ? "No orders are awaiting pick and no live piece is out of stock inside one."
              : "Orders are waiting, but every piece they need is on the shelf."}
          </EmptyState>
        ) : (
          <ol className="ops-attention">
            {items.map((item) => (
              <li key={item.key}>
                <button
                  type="button"
                  className={cx("ops-attention__row", `ops-attention__row--${item.tone}`)}
                  onClick={() => store.goTo(item.goto)}
                >
                  <span className="ops-attention__icon" aria-hidden="true">
                    {item.tone === "bad" ? (
                      <Icon.CircleX size={16} />
                    ) : item.tone === "warn" ? (
                      <Icon.Clock size={16} />
                    ) : (
                      <Icon.Alert size={16} />
                    )}
                  </span>
                  <span className="ops-attention__body">
                    <strong>{item.headline}</strong>
                    <span className="tiny muted">{item.detail}</span>
                  </span>
                  <span className="ops-attention__go">
                    <span className="tiny mono">{item.goto.tab}</span>
                    <Icon.ChevronRight size={16} />
                  </span>
                </button>
              </li>
            ))}
          </ol>
        )}
      </Panel>

      <p className="ops-footnote tiny">
        Order references look like <code className="mono">{orderRef(1)}</code> and count only what
        the fulfilment queue returns: no buyer details, no images, no pagination.{" "}
        <Link className="link" href="/discover">
          See the storefront
        </Link>
        .
      </p>
    </div>
  );
}
