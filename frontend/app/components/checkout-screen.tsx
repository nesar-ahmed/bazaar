"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useCart } from "@/app/components/cart-provider";
import { MergeNotices } from "@/app/components/flow/merge-notices";
import { ProductImage } from "@/app/components/product-image";
import { Button, ButtonLink } from "@/app/components/ui/button";
import {
  Alert,
  Breadcrumbs,
  KeyValue,
  Money,
  Skeleton,
} from "@/app/components/ui/display";
import { Icon } from "@/app/components/ui/icons";
import type { CartLine, Order } from "@/lib/api-types";
import { ApiError, apiSend } from "@/lib/client-api";
import { formatPrice, plural } from "@/lib/format";

/** Checkout is member-only; middleware sends signed-out visitors to /login. */
const SIGN_IN_TO_CHECKOUT = "/login?next=%2Fcheckout";

type Failure = {
  title: string;
  body: string;
  /** A 401 needs a sign-in path, not another attempt. */
  signedOut: boolean;
};

/** Every failure names the next action. Nothing here is a dead end. */
function describeFailure(reason: unknown): Failure {
  if (reason instanceof ApiError) {
    if (reason.status === 401) {
      return {
        title: "Your session ended before we could file this",
        body: "Sign in again and return to this step. Your bag is kept for you.",
        signedOut: true,
      };
    }
    if (/cart is empty/i.test(reason.message)) {
      return {
        title: "There is nothing left to order",
        body: `${reason.message}. Add a piece to your bag and return to this step.`,
        signedOut: false,
      };
    }
    if (/no longer available in that quantity/i.test(reason.message)) {
      return {
        title: "The shelf moved while you were here",
        body: `${reason.message}. Lower the quantity in your bag, then place it again.`,
        signedOut: false,
      };
    }
    if (/could not be checked out/i.test(reason.message)) {
      return {
        title: "The order did not go through",
        body: `${reason.message}. Nothing was reserved, so you can place it again.`,
        signedOut: false,
      };
    }
    return {
      title: "We could not place that order",
      body: `${reason.message}. Nothing was reserved.`,
      signedOut: false,
    };
  }
  return {
    title: "We could not reach Bazaar",
    body: "The request did not complete and nothing was reserved. Place the order again when you are ready.",
    signedOut: false,
  };
}

function ReviewSkeleton() {
  return (
    <div className="co" aria-hidden="true">
      <div className="co__main">
        <div className="flow-skel">
          {[0, 1].map((key) => (
            <div className="flow-skel__line" key={key}>
              <Skeleton className="flow-skel__thumb" />
              <span className="flow-skel__copy">
                <Skeleton className="skeleton--title" />
                <Skeleton className="skeleton--text" style={{ width: "40%" }} />
              </span>
              <Skeleton className="flow-skel__num" />
            </div>
          ))}
        </div>
      </div>
      <aside className="co__rail">
        <div className="flow-skel__rail">
          <Skeleton className="skeleton--text" style={{ width: "55%" }} />
          <Skeleton className="skeleton--title" />
          <Skeleton className="skeleton--text" style={{ width: "100%", height: "2.875rem" }} />
        </div>
      </aside>
    </div>
  );
}

function CheckoutLine({ line }: { line: CartLine }) {
  return (
    <li className="co-line">
      <span className="flow-thumb co-line__media">
        <ProductImage
          src={line.image_url}
          name={line.product_name}
          alt=""
          sizes="(min-width: 700px) 88px, 64px"
        />
      </span>
      <span className="co-line__copy">
        <Link className="co-line__name" href={`/products/${encodeURIComponent(line.product_slug)}`}>
          {line.product_name}
        </Link>
        <span className="co-line__meta">Bazaar selection</span>
        <span className="co-line__price">
          {formatPrice(line.unit_price_cents)} <span aria-hidden="true">×</span> {line.quantity}
        </span>
      </span>
      <Money cents={line.line_total_cents} className="co-line__total" />
    </li>
  );
}

export function CheckoutScreen() {
  const router = useRouter();
  const { cart, lines, count, subtotalCents, isLoading, error: bagError, refresh } = useCart();
  const [failure, setFailure] = useState<Failure | null>(null);
  const [placing, setPlacing] = useState(false);

  async function placeOrder() {
    setPlacing(true);
    setFailure(null);
    try {
      // `POST orders` takes no body: the bag held on the server is the order.
      const order = await apiSend<Order>("orders", undefined, "POST");
      await refresh();
      router.push(`/orders/${order.id}`);
    } catch (reason) {
      setFailure(describeFailure(reason));
    } finally {
      setPlacing(false);
    }
  }

  const isIdle = !isLoading && lines.length === 0;

  return (
    <>
      <div className="flow-crumbs">
        <Breadcrumbs
          items={[
            { href: "/", label: "Home" },
            { href: "/cart", label: "Bag" },
            { label: "Checkout" },
          ]}
        />
      </div>

      <header className="flow-head flow-head--purchase flow-head--checkout">
        <div className="flow-head__copy">
          <p className="label label--signal">Final review</p>
          <h1>Review your order</h1>
          <p className="lede">Check your items and subtotal before placing the order.</p>
        </div>
        <div className="flow-head__aside">
          <p className="flow-status" role="status" aria-live="polite">
            {isLoading && !cart ? (
              <span>Reading your bag</span>
            ) : placing ? (
              <span>Placing your order</span>
            ) : failure ? (
              <span>Order not placed</span>
            ) : isIdle ? (
              <span>Bag is empty</span>
            ) : (
              <>
                <strong>{plural(count, "piece")}</strong>
                <span aria-hidden="true">·</span>
                <span className="num">{formatPrice(subtotalCents)}</span>
                <span>ready to place</span>
              </>
            )}
          </p>
        </div>
      </header>

      <MergeNotices />

      {bagError ? (
        <Alert
          tone="warn"
          title="Your bag may not match what is below"
          action={
            <Button variant="outline" size="sm" onClick={() => void refresh()}>
              <Icon.Refresh size={15} />
              Reload the bag
            </Button>
          }
        >
          {bagError}
        </Alert>
      ) : null}

      {isLoading && !cart ? (
        <ReviewSkeleton />
      ) : isIdle ? (
        <section className="panel co__guard" aria-labelledby="co-guard-title">
          <header className="panel__head">
            <div>
              <p className="label">Checkout</p>
              <h2 id="co-guard-title">There is nothing to place</h2>
            </div>
          </header>
          <div className="panel__body">
            <p className="lede">Add items to your bag before placing an order.</p>
          </div>
          <div className="panel__foot">
            <ButtonLink href="/discover" variant="cta">
              Browse the collection
              <Icon.ArrowRight size={16} />
            </ButtonLink>
            <ButtonLink href="/cart" variant="quiet">
              Open your bag
            </ButtonLink>
          </div>
        </section>
      ) : (
        <div className="co">
          <div className="co__main">
            <section className="co__stage co__stage--review" aria-labelledby="co-review-title">
              <div className="co__stage-head">
                <div>
                  <p className="label label--signal">Order summary</p>
                  <h2 id="co-review-title">Ready when you are</h2>
                </div>
                <Link className="co__edit link-arrow" href="/cart">
                  <Icon.ArrowLeft size={15} />
                  Edit bag
                </Link>
              </div>

              <ul className="co-lines">
                {lines.map((line) => (
                  <CheckoutLine line={line} key={line.product_id} />
                ))}
              </ul>
            </section>
          </div>

          <aside className="co__rail co__rail--checkout flow-rise" aria-labelledby="co-rail-title">
            <div className="co__rail-head">
              <div>
                <p className="label label--signal">Your total</p>
                <h2 id="co-rail-title">Order summary</h2>
              </div>
              <span className="bag__count co__count">
                <strong>{count}</strong> {count === 1 ? "piece" : "pieces"}
              </span>
            </div>

            <KeyValue
              rows={[
                { term: "Items", value: <span className="num">{lines.length}</span> },
                { term: "Quantity", value: <span className="num">{count}</span> },
              ]}
              total={{ term: "Subtotal", value: <Money cents={subtotalCents} size="lead" /> }}
            />

            <div className="co__place">
              <p className="co__place-note">
                Stock is confirmed when you place the order. Payment and delivery are arranged
                afterward.
              </p>
              <Button
                variant="cta"
                size="lg"
                block
                loading={placing}
                onClick={() => void placeOrder()}
              >
                Place order
                {!placing ? <Icon.ArrowRight size={17} /> : null}
              </Button>
              <Button
                variant="quiet"
                size="sm"
                block
                disabled={placing}
                onClick={() => void refresh()}
              >
                <Icon.Refresh size={15} />
                Re-read stock counts
              </Button>
            </div>

            {failure ? (
              <div className="co__fail">
                <Alert
                  tone="error"
                  title={failure.title}
                  action={
                    failure.signedOut ? (
                      <ButtonLink href={SIGN_IN_TO_CHECKOUT} variant="cta" size="sm">
                        <Icon.Key size={15} />
                        Sign in again
                      </ButtonLink>
                    ) : (
                      <>
                        <Button size="sm" loading={placing} onClick={() => void placeOrder()}>
                          Place the order again
                        </Button>
                        <ButtonLink href="/cart" variant="outline" size="sm">
                          Edit the bag
                        </ButtonLink>
                      </>
                    )
                  }
                >
                  {failure.body}
                </Alert>
              </div>
            ) : null}
          </aside>
        </div>
      )}
    </>
  );
}
