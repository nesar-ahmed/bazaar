"use client";

import { Fragment, useMemo, useState } from "react";

import { Button } from "@/app/components/ui/button";
import { Alert, EmptyState, Money, OrderStatusPill, Panel } from "@/app/components/ui/display";
import { Icon } from "@/app/components/ui/icons";
import { ORDER_FLOW, ORDER_STATUSES } from "@/lib/api-types";
import type { Order, OrderStatus } from "@/lib/api-types";
import { cx } from "@/lib/cx";
import { formatDateTime, formatRelative, orderRef, plural, statusLabel } from "@/lib/format";

import { orderUnits } from "./types";
import type { OrderTarget } from "./types";
import { rowDomId, useRowFocus } from "./use-row-focus";
import type { ConsoleStore } from "./use-console-store";

/** Same vocabulary as `statusActionLabel`, but keyed by the status we move
 *  toward, because a row can offer more than one next step. */
const TARGET_LABEL: Record<OrderTarget, string> = {
  processing: "Start preparing",
  shipped: "Mark dispatched",
  delivered: "Mark delivered",
  cancelled: "Cancel order",
};

const TARGET_NOTE: Record<OrderTarget, string> = {
  processing: "The pick list opens for whoever takes it.",
  shipped: "This records the parcel as handed to the carrier.",
  delivered: "This closes the order. Nothing comes back.",
  cancelled: "Stock on every line goes back on the shelf. No later status unlocks it.",
};

function LineLedger({ order, store }: { order: Order; store: ConsoleStore }) {
  return (
    <div className="ops-expand">
      <div className="ops-expand__inner">
        <table className="table ops-ledger">
          <caption className="visually-hidden">
            Line ledger for order {orderRef(order.id)}
          </caption>
          <thead>
            <tr>
              <th scope="col">Piece</th>
              <th scope="col">Slug</th>
              <th scope="col" className="col-num">
                Each
              </th>
              <th scope="col" className="col-num">
                Units
              </th>
              <th scope="col" className="col-num">
                Line
              </th>
              <th scope="col" className="col-actions">
                <span className="visually-hidden">Row link</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((line) => (
              <tr key={`${order.id}-${line.product_id}`}>
                <th scope="row" className="ops-ledger__piece">
                  {line.product_name}
                </th>
                <td>
                  <span className="mono">{line.product_slug}</span>
                </td>
                <td className="col-num">
                  <Money cents={line.unit_price_cents} />
                </td>
                <td className="col-num">{line.quantity}</td>
                <td className="col-num">
                  <Money cents={line.line_total_cents} />
                </td>
                <td className="col-actions">
                  <Button
                    variant="quiet"
                    size="sm"
                    className="ops-tap"
                    onClick={() =>
                      store.goTo({
                        tab: "products",
                        kind: "product",
                        id: line.product_id,
                        label: line.product_name,
                      })
                    }
                  >
                    Open row
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="tiny muted ops-ledger__foot">
          The queue payload carries no buyer, no address and no image. That is the whole API.
        </p>
      </div>
    </div>
  );
}

function MoveRow({
  order,
  store,
  expanded,
  onToggle,
  isLast,
  isWanted,
}: {
  order: Order;
  store: ConsoleStore;
  expanded: boolean;
  onToggle: () => void;
  isLast: boolean;
  isWanted: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = store.isBusy(`order:${order.id}`);
  const next = ORDER_FLOW[order.status] as OrderTarget[];

  async function move(target: OrderTarget) {
    setError(null);
    setConfirming(false);
    const result = await store.moveOrder(order, target);
    if (!result.ok) setError(result.message);
  }

  return (
    <Fragment>
      <tr
        id={rowDomId("order", order.id)}
        tabIndex={-1}
        className={cx(
          "ops-row",
          busy && "ops-row--busy",
          isLast && "ops-row--last",
          isWanted && "ops-row--wanted",
        )}
        aria-label={`Order ${orderRef(order.id)}`}
      >
        <td data-label="Ref">
          <button
            type="button"
            className="ops-disclose"
            aria-expanded={expanded}
            aria-controls={`ops-lines-${order.id}`}
            onClick={onToggle}
          >
            <span className={cx("ops-disclose__mark", expanded && "is-open")} aria-hidden="true">
              <Icon.ChevronRight size={15} />
            </span>
            <span className="mono">{orderRef(order.id)}</span>
          </button>
        </td>
        <td data-label="Placed">
          <time dateTime={order.created_at}>{formatDateTime(order.created_at)}</time>
          <span className="ops-when tiny muted">{formatRelative(order.created_at)}</span>
        </td>
        <td className="col-num" data-label="Pieces">
          <span className="num">{plural(order.items.length, "line")}</span>
          <span className="ops-when tiny muted">{orderUnits(order)} units</span>
        </td>
        <td className="col-num" data-label="Value">
          <Money cents={order.subtotal_cents} />
        </td>
        <td data-label="Status">
          <OrderStatusPill status={order.status} />
        </td>
        <td className="col-actions" data-label="Next">
          {confirming ? (
            <span className="ops-confirm ops-confirm--inline">
              <span className="ops-confirm__text">
                {TARGET_NOTE.cancelled} Keep it if the parcel is already moving.
              </span>
              <span className="cluster">
                <Button variant="danger" size="sm" loading={busy} onClick={() => void move("cancelled")}>
                  Cancel order
                </Button>
                <Button variant="quiet" size="sm" disabled={busy} onClick={() => setConfirming(false)}>
                  Keep it
                </Button>
              </span>
            </span>
          ) : next.length === 0 ? (
            <span className="tiny muted">
              {order.status === "cancelled" ? "Closed as cancelled" : "Nothing further to do"}
            </span>
          ) : (
            next.map((target) =>
              target === "cancelled" ? (
                <Button
                  key={target}
                  variant="danger"
                  size="sm"
                  className="ops-tap"
                  disabled={busy}
                  loading={busy && order.status === "cancelled"}
                  onClick={() => setConfirming(true)}
                >
                  {TARGET_LABEL[target]}
                </Button>
              ) : (
                <Button
                  key={target}
                  variant={target === "processing" ? "cta" : "outline"}
                  size="sm"
                  className="ops-tap"
                  disabled={busy}
                  loading={busy}
                  onClick={() => void move(target)}
                >
                  {TARGET_LABEL[target]}
                </Button>
              ),
            )
          )}
        </td>
      </tr>

      <tr className="ops-lines-row" hidden={!expanded}>
        <td colSpan={6} id={`ops-lines-${order.id}`}>
          {expanded ? <LineLedger order={order} store={store} /> : null}
        </td>
      </tr>

      {error ? (
        <tr className="ops-editor">
          <td colSpan={6}>
            <Alert
              tone="error"
              title="That move was refused"
              action={
                <Button variant="outline" size="sm" onClick={() => void store.reloadOrders()}>
                  Reload the queue
                </Button>
              }
            >
              {error}
            </Alert>
          </td>
        </tr>
      ) : null}
    </Fragment>
  );
}

export function OpsOrders({ store }: { store: ConsoleStore }) {
  const [open, setOpen] = useState<number | null>(null);
  const [filter, setFilter] = useState<OrderStatus | "all">("all");

  const counts = useMemo(() => {
    const base: Record<OrderStatus | "all", number> = {
      all: store.orders.length,
      pending: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    };
    for (const order of store.orders) base[order.status] += 1;
    return base;
  }, [store.orders]);

  const rows = useMemo(
    () =>
      store.orders.filter((order) => filter === "all" || order.status === filter),
    [store.orders, filter],
  );

  const { isWanted, isLast } = useRowFocus(store, "orders", "order", store.orders);
  const reading = store.isBusy("orders:read");

  return (
    <div className="ops-stack">
      <Panel
        id="ops-queue"
        title="Fulfilment queue"
        eyebrow="Every order, no pagination"
        bodyClass="panel__body--flush"
        actions={
          <Button
            variant="outline"
            size="sm"
            icon={<Icon.Refresh size={15} />}
            loading={reading}
            onClick={() => void store.reloadOrders()}
          >
            Reload queue
          </Button>
        }
      >
        <div className="ops-toolbar">
          <div className="ops-chips" role="group" aria-label="Filter the queue by status">
            <button
              type="button"
              className="chip"
              aria-pressed={filter === "all"}
              onClick={() => setFilter("all")}
            >
              Every order
              <span className="chip__count">{counts.all}</span>
            </button>
            {ORDER_STATUSES.map((status) => (
              <button
                key={status}
                type="button"
                className="chip"
                aria-pressed={filter === status}
                onClick={() => setFilter(status)}
              >
                {statusLabel(status)}
                <span className="chip__count">{counts[status]}</span>
              </button>
            ))}
          </div>
          <p className="ops-count tiny" role="status" aria-live="polite">
            {plural(rows.length, "order")} shown
            {filter === "all" ? "" : ` in ${statusLabel(filter)}`}
            {store.busyCount > 0 ? " · a write is in flight" : ""}
          </p>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon={<Icon.Box size={22} />}
            title={store.orders.length === 0 ? "No orders have landed yet" : "Nothing in that state"}
            action={
              filter !== "all" ? (
                <Button variant="outline" onClick={() => setFilter("all")}>
                  Show every order
                </Button>
              ) : undefined
            }
          >
            {store.orders.length === 0
              ? "Checkout creates a pending order and reserves stock, so the queue fills the moment someone buys."
              : "Switch the filter, or reload the queue in case another operator moved these rows."}
          </EmptyState>
        ) : (
          <div className="table-wrap ops-scroll">
            <table className="table ops-table">
              <caption>
                Oldest first is how the queue reads best, so rows are listed newest first as the
                API returns them. Open a row for its line ledger. Only legal next statuses are
                offered; delivered and cancelled rows are terminal.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Ref</th>
                  <th scope="col">Placed</th>
                  <th scope="col" className="col-num">
                    Pieces
                  </th>
                  <th scope="col" className="col-num">
                    Value
                  </th>
                  <th scope="col">Status</th>
                  <th scope="col" className="col-actions">
                    Next
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((order) => (
                  <MoveRow
                    key={order.id}
                    order={order}
                    store={store}
                    expanded={open === order.id}
                    onToggle={() => setOpen((current) => (current === order.id ? null : order.id))}
                    isLast={isLast(order.id)}
                    isWanted={isWanted(order.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
