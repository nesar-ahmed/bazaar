"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { useLineImages } from "@/app/components/flow/use-line-images";
import { PieceCell } from "@/app/components/flow/piece-cell";
import { ProductImage } from "@/app/components/product-image";
import { placedAt } from "@/app/components/flow/order-format";
import { Button, ButtonLink } from "@/app/components/ui/button";
import {
  Alert,
  Breadcrumbs,
  KeyValue,
  Money,
  OrderStatusPill,
} from "@/app/components/ui/display";
import { Icon } from "@/app/components/ui/icons";
import type { Order, OrderLine, OrderStatus } from "@/lib/api-types";
import { ApiError, apiSend } from "@/lib/client-api";
import { cx } from "@/lib/cx";
import { formatPrice, orderRef, plural, skuRef, statusLabel } from "@/lib/format";

/** The customer-facing linear path. Cancellation is a side exit, not a stage. */
const PATH: OrderStatus[] = ["pending", "processing", "shipped", "delivered"];

const STAGE_NOTE: Record<OrderStatus, string> = {
  pending:
    "Awaiting pick. Your units are reserved, and you can still cancel here while the order sits in this stage.",
  processing: "Being prepared. The pieces on this order are no longer cancellable by you.",
  shipped: "Dispatched. The order left the shelf and is on its way.",
  delivered: "Delivered. This order is complete and stays readable here.",
  cancelled:
    "Cancelled. The reservation on these pieces was released and they are back on the shelf.",
};

export function OrderDetail({ order: initial }: { order: Order }) {
  const [order, setOrder] = useState<Order>(initial);
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string>("");

  const question = useRef<HTMLParagraphElement | null>(null);

  // The trigger is replaced by the question, so hand focus to it.
  useEffect(() => {
    if (confirming) question.current?.focus();
  }, [confirming]);

  const slugs = order.items.map((line) => line.product_slug);
  const images = useLineImages(slugs);

  const units = order.items.reduce((total, line) => total + line.quantity, 0);
  const cancelled = order.status === "cancelled";
  const stageIndex = PATH.indexOf(order.status);
  const cancellable = order.status === "pending";

  async function cancelOrder() {
    setCancelling(true);
    setCancelError(null);
    try {
      const next = await apiSend<Order>(`orders/${order.id}/cancel`, undefined, "POST");
      setOrder(next);
      setConfirming(false);
      setNotice(`Order ${orderRef(next.id)} is cancelled.`);
    } catch (reason) {
      setCancelError(
        reason instanceof ApiError
          ? reason.message
          : "Bazaar did not accept the cancellation. Nothing was changed.",
      );
    } finally {
      setCancelling(false);
    }
  }

  return (
    <>
      <div className="flow-crumbs">
        <Breadcrumbs
          items={[
            { href: "/", label: "Home" },
            { href: "/account?tab=orders", label: "Order history" },
            { label: orderRef(order.id) },
          ]}
        />
      </div>

      <header className="flow-head flow-head--order">
        <div className="flow-head__copy">
          <p className="label label--signal">Order</p>
          <h1 className="order__ref">{orderRef(order.id)}</h1>
          <p className="order__meta">
            <OrderStatusPill status={order.status} />
            <span>
              Placed <span className="num">{placedAt(order.created_at)}</span>
            </span>
            <span>
              <span className="num">{units}</span> {units === 1 ? "unit" : "units"} across{" "}
              <span className="num">{order.items.length}</span>{" "}
              {order.items.length === 1 ? "line" : "lines"}
            </span>
          </p>
        </div>
        <div className="flow-head__aside">
          <p className="flow-status" role="status" aria-live="polite">
            {notice || `${statusLabel(order.status)} · ${orderRef(order.id)}`}
          </p>
          <Link className="link-arrow bag__edit" href="/account?tab=orders">
            Order history
            <Icon.ArrowLeft size={15} />
          </Link>
        </div>
      </header>

      <div className="order">
        <div className="order__main">
          <section className="order__stage order__stage--track" aria-labelledby="order-track-title">
            <div className="order__stage-head">
              <h2 id="order-track-title">Fulfilment</h2>
              <p className="label">{cancelled ? "Path not completed" : "Stage path"}</p>
            </div>

            <div className="order__track">
              <div className="order__track-steps">
                <ol
                  className={cx("steps order-steps", cancelled && "order-steps--gone")}
                  aria-label="Fulfilment stages"
                >
                  {PATH.map((stage, index) => {
                    const state = cancelled
                      ? "todo"
                      : index < stageIndex
                        ? "done"
                        : index === stageIndex
                          ? "current"
                          : "todo";
                    return (
                      <li
                        key={stage}
                        data-state={state}
                        aria-current={!cancelled && index === stageIndex ? "step" : undefined}
                      >
                        <span className="steps__num" aria-hidden="true">
                          {index + 1}
                        </span>
                        {statusLabel(stage)}
                        <span className="visually-hidden">
                          {state === "done"
                            ? ", reached"
                            : state === "current"
                              ? ", current stage"
                              : ", not reached"}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </div>
              <p className="order__track-now">
                <strong>{cancelled ? "Cancelled" : statusLabel(order.status)}</strong>
                <span>{STAGE_NOTE[order.status]}</span>
              </p>
            </div>

            {cancelled ? (
              <div className="order-cancel">
                <span className="order-cancel__mark" aria-hidden="true">
                  <Icon.CircleX size={18} />
                </span>
                <div className="order-cancel__body">
                  <h3>This order was cancelled</h3>
                  <p>
                    The units it held went back on the shelf, and nothing was charged. A cancelled
                    order keeps its reference and lines here for your records. To order any of it
                    again, add the pieces back to your bag and place a new order.
                  </p>
                  <div className="row">
                    <ButtonLink href="/discover" variant="outline" size="sm">
                      Find the piece again
                      <Icon.ArrowRight size={15} />
                    </ButtonLink>
                  </div>
                </div>
              </div>
            ) : null}
          </section>

          <section className="order__stage order__stage--lines" aria-labelledby="order-lines-title">
            <div className="order__stage-head">
              <h2 id="order-lines-title">What was ordered</h2>
              <p className="label">{plural(order.items.length, "line", "lines")}</p>
            </div>

            <div className="flow-desk">
              <div className="table-wrap">
                <table className="table">
                  <caption>
                    Lines as filed on {placedAt(order.created_at)}. Prices are the ones held on the
                    order, not the current listing.
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Piece</th>
                      <th scope="col" className="col-num">
                        Quantity
                      </th>
                      <th scope="col" className="col-num">
                        Unit
                      </th>
                      <th scope="col" className="col-num">
                        Line total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((line) => (
                      <tr key={`${line.product_id}-${line.product_slug}`}>
                        <td>
                          <PieceCell
                            name={line.product_name}
                            slug={line.product_slug}
                            src={images[line.product_slug] ?? null}
                            note={skuRef(line.product_id)}
                          />
                        </td>
                        <td className="col-num">
                          <span className="num">{line.quantity}</span>
                        </td>
                        <td className="col-num">
                          <Money cents={line.unit_price_cents} />
                        </td>
                        <td className="col-num">
                          <Money cents={line.line_total_cents} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <ul className="order-lines flow-rows">
              {order.items.map((line) => (
                <OrderEntry
                  line={line}
                  src={images[line.product_slug] ?? null}
                  key={line.product_id}
                />
              ))}
            </ul>
          </section>
        </div>

        <aside className="order__rail order__rail--summary flow-rise" aria-labelledby="order-rail-title">
          <div className="order__rail-head">
            <h2 id="order-rail-title" className="label">
              Amount
            </h2>
            <span className="bag__count">
              <strong>{units}</strong> {units === 1 ? "unit" : "units"}
            </span>
          </div>

          <KeyValue
            rows={[
              { term: "Pieces", value: <span className="num">{units}</span> },
              { term: "Lines", value: <span className="num">{order.items.length}</span> },
              { term: "Shipping", value: "Arranged after ordering" },
              { term: "Taxes", value: "Not included" },
              { term: "Payment", value: "Not taken online" },
            ]}
            total={{ term: "Subtotal", value: <Money cents={order.subtotal_cents} size="lead" /> }}
          />

          {cancellable ? (
            <div className="order__danger">
              <div className="order__danger-head">
                <p>
                  This order is still awaiting pick, so you can cancel it yourself. The action
                  cannot be undone.
                </p>
                {!confirming ? (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      setConfirming(true);
                      setCancelError(null);
                    }}
                  >
                    <Icon.CircleX size={15} />
                    Cancel order
                  </Button>
                ) : null}
              </div>

              {confirming ? (
                <div className="order-confirm" role="group" aria-labelledby="order-confirm-q">
                  <p
                    className="order-confirm__q"
                    id="order-confirm-q"
                    ref={question}
                    tabIndex={-1}
                  >
                    Cancel {orderRef(order.id)} and release its {units}{" "}
                    {units === 1 ? "unit" : "units"} back to the shelf?
                  </p>
                  <Button
                    variant="danger"
                    size="sm"
                    loading={cancelling}
                    onClick={() => void cancelOrder()}
                  >
                    Confirm cancel
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={cancelling}
                    onClick={() => {
                      setConfirming(false);
                      setCancelError(null);
                    }}
                  >
                    Keep order
                  </Button>
                </div>
              ) : null}

              {cancelError ? (
                <Alert tone="error" title="The order is still open">
                  {cancelError}
                </Alert>
              ) : null}
            </div>
          ) : null}

          <div className="order__links">
            <ButtonLink href="/account?tab=orders" variant="outline" size="sm" block>
              <Icon.List size={15} />
              Order history
            </ButtonLink>
            <ButtonLink href="/discover" variant="quiet" size="sm" block>
              Keep discovering
              <Icon.ArrowRight size={15} />
            </ButtonLink>
          </div>
        </aside>
      </div>
    </>
  );
}

/** Under 768px the line ledger recomposes into ruled rows with aligned figures. */
function OrderEntry({
  line,
  src,
}: {
  line: OrderLine;
  src: string | null;
}) {
  return (
    <li className="order-line">
      <span className="flow-thumb">
        <ProductImage src={src} name={line.product_name} alt="" sizes="72px" />
      </span>
      <span className="order-line__copy">
        <Link className="order-line__name" href={`/products/${encodeURIComponent(line.product_slug)}`}>
          {line.product_name}
        </Link>
        <span className="order-line__meta mono">{skuRef(line.product_id)}</span>
      </span>
      <span className="order-line__qty">{line.quantity}</span>
      <span className="order-line__unit">{formatPrice(line.unit_price_cents)}</span>
      <Money cents={line.line_total_cents} className="order-line__total" />
    </li>
  );
}
