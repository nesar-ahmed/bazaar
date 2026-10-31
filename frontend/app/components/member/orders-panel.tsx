"use client";

import Link from "next/link";
import { useState } from "react";

import { Button, ButtonLink } from "@/app/components/ui/button";
import { Alert, EmptyState, Money, OrderStatusPill, Skeleton } from "@/app/components/ui/display";
import { Icon } from "@/app/components/ui/icons";
import { ApiError, apiGet, apiSend } from "@/lib/client-api";
import { formatDate, orderRef, plural } from "@/lib/format";
import type { Order } from "@/lib/api-types";

/** The customer ledger: one hairline-ruled row per order, numbers aligned. */
export function OrdersPanel({ orders: incoming }: { orders: Order[] }) {
  const [orders, setOrders] = useState<Order[]>(incoming);
  const [isReloading, setReloading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [cancelId, setCancelId] = useState<number | null>(null);
  const [cancelError, setCancelError] = useState<{ id: number; message: string } | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const spent = orders.reduce((total, order) => total + order.subtotal_cents, 0);
  const pieces = orders.reduce(
    (total, order) => total + order.items.reduce((sum, item) => sum + item.quantity, 0),
    0,
  );

  async function reload() {
    setLoadError(null);
    setReloading(true);
    try {
      const fresh = await apiGet<Order[]>("orders");
      setOrders(Array.isArray(fresh) ? fresh : []);
    } catch (reason) {
      setLoadError(
        reason instanceof ApiError && reason.status === 503
          ? "The order service is not answering. The rows below are the last ones we read."
          : "We could not reload your orders. Check your connection and try again.",
      );
    } finally {
      setReloading(false);
    }
  }

  async function cancel(order: Order) {
    setCancelError(null);
    setDone(null);
    setCancelId(order.id);
    try {
      const updated = await apiSend<Order>(`orders/${order.id}/cancel`);
      setOrders((current) => current.map((entry) => (entry.id === updated.id ? updated : entry)));
      setDone(`Order ${orderRef(updated.id)} is cancelled and the pieces are back on the shelf.`);
    } catch (reason) {
      const message =
        reason instanceof ApiError
          ? reason.status === 409
            ? "This order is past the point where you can cancel it. It has already moved into preparation."
            : reason.message
          : "We could not reach Bazaar. The order is unchanged.";
      setCancelError({ id: order.id, message });
    } finally {
      setCancelId(null);
      setConfirmId(null);
    }
  }

  return (
    <div className="member-orders">
      <header className="member-orders__bar">
        <p className="member-orders__summary">
          <span className="num">{orders.length}</span> {orders.length === 1 ? "order" : "orders"}
          <span className="member-orders__sep" aria-hidden="true">/</span>
          <span className="num">{pieces}</span> pieces
          <span className="member-orders__sep" aria-hidden="true">/</span>
          <span className="member-orders__spent">
            <Money cents={spent} /> total filed
          </span>
        </p>
        <Button type="button" variant="quiet" size="sm" loading={isReloading} onClick={() => void reload()}>
          Reload
        </Button>
      </header>

      {loadError ? (
        <Alert tone="error" title={loadError} action={
          <Button type="button" variant="outline" size="sm" onClick={() => void reload()}>
            Try again
          </Button>
        } />
      ) : null}

      {done ? <Alert tone="success" live title={done} /> : null}

      {isReloading && orders.length === 0 ? (
        <div className="member-orders__skeletons" aria-hidden="true">
          {[0, 1, 2].map((row) => (
            <div className="member-orderskeleton" key={row}>
              <Skeleton className="member-orderskeleton__ref" />
              <Skeleton className="member-orderskeleton__line" />
              <Skeleton className="member-orderskeleton__pill" />
              <Skeleton className="member-orderskeleton__line" />
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          icon={<Icon.Package size={22} />}
          title="Nothing filed against this account yet"
          action={
            <ButtonLink href="/discover" variant="cta">
              Browse the market
            <Icon.ArrowRight size={17} />
          </ButtonLink>
          }
        >
          When you place an order it appears here with a reference like #00042, the date it was
          placed, the pieces it holds, and the total that was quoted. You can cancel while it is
          still awaiting pick.
        </EmptyState>
      ) : (
        <>
          <div className="member-orders__head" aria-hidden="true">
            <span>Ref</span>
            <span>Placed</span>
            <span className="member-orders__h-num">Pieces</span>
            <span className="member-orders__h-num">Total</span>
            <span>Status</span>
            <span className="member-orders__h-end">Order</span>
          </div>

          <ul className="member-orders__list">
            {orders.map((order) => {
              const linePieces = order.items.reduce((sum, item) => sum + item.quantity, 0);
              const cancellable = order.status === "pending";
              const isConfirming = confirmId === order.id;
              const busy = cancelId === order.id;
              const errorForOrder =
                cancelError !== null && cancelError.id === order.id ? cancelError.message : null;
              return (
                <li className="member-order" key={order.id} data-busy={busy || undefined}>
                  <p className="member-order__ref num">{orderRef(order.id)}</p>
                  <p className="member-order__date">{formatDate(order.created_at)}</p>
                  <p className="member-order__pieces num">{linePieces}</p>
                  <p className="member-order__total">
                    <Money cents={order.subtotal_cents} />
                  </p>
                  <p className="member-order__status">
                    <OrderStatusPill status={order.status} />
                  </p>
                  <p className="member-order__items">
                    {order.items
                      .map((item) => `${item.quantity} ${item.product_name}`)
                      .join(", ") || "No pieces recorded on this order."}
                    <span className="member-order__lines">{` · ${plural(order.items.length, "line")}`}</span>
                  </p>
                  <div className="member-order__actions">
                    {cancellable && !isConfirming ? (
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={() => setConfirmId(order.id)}
                      >
                        Cancel order
                      </Button>
                    ) : null}
                    {cancellable && isConfirming ? (
                      <span className="member-cancel" role="group" aria-label={`Confirm cancellation for order ${orderRef(order.id)}`}>
                        <span className="member-cancel__ask">Cancel {orderRef(order.id)}?</span>
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          loading={busy}
                          onClick={() => void cancel(order)}
                        >
                          Confirm cancel
                        </Button>
                        <Button
                          type="button"
                          variant="quiet"
                          size="sm"
                          onClick={() => setConfirmId(null)}
                        >
                          Keep order
                        </Button>
                      </span>
                    ) : null}
                    <Link className="member-order__open" href={`/orders/${order.id}`}>
                      Open order
                      <Icon.ArrowRight size={15} />
                    </Link>
                  </div>

                  {errorForOrder ? (
                    <p className="member-order__error" role="alert">
                      <Icon.Alert size={14} />
                      {errorForOrder}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </>
      )}

      <p className="member-orders__note">
        Order lines are stored without images, so this ledger lists names and quantities only.
        Prices are the ones recorded when each order was placed. Card payment is not connected yet,
        so every order starts as pending and reserves its stock in the same step.
      </p>
    </div>
  );
}
