"use client";

import Link from "next/link";

import { useCart } from "@/app/components/cart-provider";
import { MergeNotices } from "@/app/components/flow/merge-notices";
import { ProductImage } from "@/app/components/product-image";
import { QuantityStepper } from "@/app/components/quantity-stepper";
import { Button, ButtonLink } from "@/app/components/ui/button";
import {
  Alert,
  Breadcrumbs,
  EmptyState,
  KeyValue,
  Money,
  Skeleton,
} from "@/app/components/ui/display";
import { Icon } from "@/app/components/ui/icons";
import type { CartLine } from "@/lib/api-types";
import { formatPrice, plural, skuRef } from "@/lib/format";

/** Middleware gates `/checkout`; the bag stays open so guests can keep gathering. */
const SIGN_IN_TO_CHECKOUT = "/login?next=%2Fcheckout";

function BagLedgerSkeleton() {
  return (
    <div className="bag" aria-hidden="true">
      <div className="bag__main">
        <div className="flow-skel">
          {[0, 1, 2].map((key) => (
            <div className="flow-skel__line" key={key}>
              <Skeleton className="flow-skel__thumb" />
              <span className="flow-skel__copy">
                <Skeleton className="skeleton--title" />
                <Skeleton className="skeleton--text" style={{ width: "45%" }} />
                <Skeleton
                  className="skeleton--text"
                  style={{ width: "7rem", marginTop: "0.25rem" }}
                />
              </span>
              <Skeleton className="flow-skel__num" />
            </div>
          ))}
        </div>
      </div>
      <aside className="bag__rail">
        <div className="flow-skel__rail">
          <Skeleton className="skeleton--text" style={{ width: "55%" }} />
          <Skeleton className="skeleton--title" />
          <Skeleton className="skeleton--text" style={{ width: "70%" }} />
          <Skeleton className="skeleton--text" style={{ width: "100%", height: "2.875rem" }} />
        </div>
      </aside>
    </div>
  );
}

/** A bag we could not read is not an empty bag: name the failure and its fix. */
function BagLoadFailed({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <section className="bag__failed" aria-labelledby="bag-failed-title">
      <h2 id="bag-failed-title" className="label">
        Bag unavailable
      </h2>
      <Alert
        tone="error"
        title="We could not read your bag"
        action={
          <Button onClick={onRetry}>
            <Icon.Refresh size={16} />
            Try the bag again
          </Button>
        }
      >
        {message} Nothing was removed from it, and no piece was ordered. Reload to read it again,
        or keep browsing and come back.
      </Alert>
      <div className="row">
        <ButtonLink href="/discover" variant="outline">
          Browse the collection
          <Icon.ArrowRight size={16} />
        </ButtonLink>
      </div>
    </section>
  );
}

function BagLine({
  line,
  index,
  pending,
  onQuantity,
  onRemove,
}: {
  line: CartLine;
  index: number;
  pending: boolean;
  onQuantity: (quantity: number) => void;
  onRemove: () => void;
}) {
  const href = `/products/${encodeURIComponent(line.product_slug)}`;
  return (
    <li className="bag-line" data-busy={pending ? "true" : undefined}>
      <span className="bag-line__idx" aria-hidden="true">
        {String(index + 1).padStart(2, "0")}
      </span>
      <Link className="flow-thumb bag-line__media" href={href} tabIndex={-1} aria-hidden="true">
        <ProductImage
          src={line.image_url}
          name={line.product_name}
          alt=""
          sizes="(min-width: 1000px) 88px, (min-width: 700px) 80px, 72px"
        />
      </Link>
      <div className="bag-line__copy">
        <p className="bag-line__name">
          <Link href={href}>{line.product_name}</Link>
        </p>
        <p className="bag-line__meta">
          <span className="mono">{skuRef(line.product_id)}</span>
          <span className="bag-line__fold">
            {" · "}
            <span className="num">{line.quantity}</span> at{" "}
            <span className="num">{formatPrice(line.unit_price_cents)}</span>
          </span>
        </p>
      </div>
      <div className="bag-line__pick">
        <QuantityStepper
          value={line.quantity}
          label={`Quantity of ${line.product_name}`}
          max={99}
          min={1}
          busy={pending}
          size="sm"
          onChange={onQuantity}
        />
        <button
          type="button"
          className="btn btn--quiet btn--sm bag-line__remove"
          disabled={pending}
          onClick={onRemove}
        >
          {pending ? <Icon.Spinner size={15} /> : <Icon.Trash size={15} />}
          <span>Remove from bag</span>
          <span className="visually-hidden"> {line.product_name}</span>
        </button>
      </div>
      <Money cents={line.unit_price_cents} className="bag-line__unit" />
      <Money cents={line.line_total_cents} className="bag-line__total" />
    </li>
  );
}

export function BagScreen({ signedIn }: { signedIn: boolean }) {
  const {
    cart,
    lines,
    count,
    subtotalCents,
    isLoading,
    error,
    refresh,
    setQuantity,
    removeItem,
    isPending,
  } = useCart();

  const warnings = cart?.warnings ?? [];
  const loadFailed = Boolean(error) && !cart && !isLoading;
  const isIdle = !isLoading && Boolean(cart) && lines.length === 0;

  return (
    <>
      <div className="flow-crumbs">
        <Breadcrumbs
          items={[
            { href: "/", label: "Home" },
            { href: "/discover", label: "Discover" },
            { label: "Bag" },
          ]}
        />
      </div>

      <header className="flow-head flow-head--purchase flow-head--bag">
        <div className="flow-head__copy">
          <p className="label label--signal">Your bag</p>
          <h1>Your selected pieces</h1>
          <p className="lede">Review your items and update quantities before continuing.</p>
        </div>
        <div className="flow-head__aside">
          <p className="flow-status" role="status" aria-live="polite">
            {isLoading && !cart ? (
              <span>Reading your bag</span>
            ) : count === 0 ? (
              <span>Bag is empty</span>
            ) : (
              <>
                <strong>{plural(count, "piece")}</strong>
                <span aria-hidden="true">·</span>
                <span className="num">{formatPrice(subtotalCents)}</span>
                <span>subtotal</span>
              </>
            )}
          </p>
          <Link className="link-arrow bag__edit" href="/discover">
            Keep discovering
            <Icon.ArrowRight size={15} />
          </Link>
        </div>
      </header>

      <MergeNotices />

      {warnings.length > 0 ? (
        <div className="bag-warn">
          {warnings.map((warning, index) => (
            <Alert tone="warn" key={`${warning}-${index}`}>
              {warning}
            </Alert>
          ))}
        </div>
      ) : null}

      {error ? (
        <Alert
          tone="error"
          title={loadFailed ? "We could not read your bag" : "That change did not reach Bazaar"}
          action={
            <Button variant="outline" size="sm" onClick={() => void refresh()}>
              <Icon.Refresh size={15} />
              Reload the bag
            </Button>
          }
        >
          {error}
        </Alert>
      ) : null}

      {isLoading && !cart ? (
        <BagLedgerSkeleton />
      ) : loadFailed ? (
        <BagLoadFailed
          message={error ?? "Bazaar is unreachable right now."}
          onRetry={() => void refresh()}
        />
      ) : isIdle ? (
        <div className="bag__empty">
          <EmptyState
            icon={<Icon.Bag size={22} />}
            title="Your bag is empty"
            action={
              <ButtonLink href="/discover" variant="cta" size="lg">
                Browse the collection
                <Icon.ArrowRight size={17} />
              </ButtonLink>
            }
          >
            Find something you love and it will be waiting here.
          </EmptyState>
        </div>
      ) : (
        <div className="bag">
          <section className="bag__main" aria-labelledby="bag-lines-title">
            <div className="bag__top">
              <h2 id="bag-lines-title">In your bag</h2>
              <p className="bag__count">
                <strong>{count}</strong> {count === 1 ? "unit" : "units"} across{" "}
                {plural(lines.length, "line", "lines")}
              </p>
            </div>

            <div className="bag-head" aria-hidden="true">
              <span className="label">Piece</span>
              <span className="label">Quantity</span>
              <span className="label">Unit</span>
              <span className="label">Line total</span>
            </div>

            <ul className="bag-lines">
              {lines.map((line, index) => (
                <BagLine
                  key={line.product_id}
                  line={line}
                  index={index}
                  pending={isPending(line.product_id)}
                  onQuantity={(next) => void setQuantity(line.product_id, next)}
                  onRemove={() => void removeItem(line.product_id)}
                />
              ))}
            </ul>
          </section>

          <aside className="bag__rail flow-rise" aria-labelledby="bag-rail-title">
            <div className="bag__rail-head">
              <h2 id="bag-rail-title" className="label">
                Summary
              </h2>
              <span className="bag__count">
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

            <div className="bag__rail-cta">
              {signedIn ? (
                <ButtonLink href="/checkout" variant="cta" size="lg" block>
                  Continue to checkout
                  <Icon.ArrowRight size={17} />
                </ButtonLink>
              ) : (
                <ButtonLink href={SIGN_IN_TO_CHECKOUT} variant="cta" size="lg" block>
                  Sign in to check out
                  <Icon.ArrowRight size={17} />
                </ButtonLink>
              )}
              <Button variant="quiet" size="sm" block onClick={() => void refresh()}>
                <Icon.Refresh size={15} />
                Reload the bag
              </Button>
              {!signedIn ? (
                <p className="bag__rail-fine">
                  New to Bazaar?{" "}
                  <Link className="link" href="/register">
                    Create an account
                  </Link>{" "}
                  to continue.
                </p>
              ) : null}
            </div>

            <p className="bag__rail-fine">
              Stock is confirmed when you place the order. Payment and delivery are arranged later.
            </p>
          </aside>

          <div className="bag__bar">
            <div className="bag__bar-lead">
              <span className="label">Subtotal</span>
              <Money cents={subtotalCents} />
            </div>
            {signedIn ? (
              <ButtonLink href="/checkout" variant="cta" className="bag__bar-cta">
                Checkout
                <Icon.ArrowRight size={16} />
              </ButtonLink>
            ) : (
              <ButtonLink href={SIGN_IN_TO_CHECKOUT} variant="cta" className="bag__bar-cta">
                Sign in to check out
                <Icon.ArrowRight size={16} />
              </ButtonLink>
            )}
          </div>
        </div>
      )}
    </>
  );
}
