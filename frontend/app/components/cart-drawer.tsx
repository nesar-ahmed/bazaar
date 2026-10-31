"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import { useCart } from "@/app/components/cart-provider";
import { ProductImage } from "@/app/components/product-image";
import { QuantityStepper } from "@/app/components/quantity-stepper";
import { ButtonLink, IconBtn } from "@/app/components/ui/button";
import { Alert, Money, Skeleton } from "@/app/components/ui/display";
import { Icon } from "@/app/components/ui/icons";
import { formatPrice } from "@/lib/format";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])';

/** Slide-over bag. Focus moves in on open, returns to the trigger on close,
 *  Tab is contained, Escape dismisses, and the rest of the page is inert. */
export function CartDrawer() {
  const {
    lines,
    count,
    subtotalCents,
    isLoading,
    error,
    close,
    setQuantity,
    removeItem,
    isPending,
  } = useCart();
  const panel = useRef<HTMLDivElement | null>(null);
  const opener = useRef<Element | null>(null);

  useEffect(() => {
    opener.current = document.activeElement;
    const node = panel.current;
    node?.querySelector<HTMLElement>("[data-autofocus]")?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab" || !node) return;
      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null,
      );
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      (opener.current as HTMLElement | null)?.focus?.();
    };
  }, [close]);

  return (
    <>
      <div className="overlay" onClick={close} aria-hidden="true" />
      <div
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-label={`Shopping bag, ${count} item${count === 1 ? "" : "s"}`}
        ref={panel}
      >
        <header className="drawer__head">
          <div>
            <p className="label">Your bag</p>
            <h2>{isLoading ? "Loading" : count === 0 ? "Empty" : `${count} item${count === 1 ? "" : "s"}`}</h2>
          </div>
          <IconBtn label="Close shopping bag" onClick={close} data-autofocus>
            <Icon.Close size={18} />
          </IconBtn>
        </header>

        <div className="drawer__body">
          {error ? (
            <Alert tone="error">{error}</Alert>
          ) : isLoading ? (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "1rem" }}>
              {[0, 1].map((key) => (
                <li key={key} className="drawer-skeleton">
                  <Skeleton className="skeleton--thumb" />
                  <span>
                    <Skeleton className="skeleton--text" style={{ width: "60%" }} />
                    <Skeleton className="skeleton--text" style={{ width: "35%", marginTop: ".5rem" }} />
                  </span>
                </li>
              ))}
            </ul>
          ) : lines.length === 0 ? (
            <div className="empty">
              <span className="empty__icon" aria-hidden="true">
                <Icon.Bag size={22} />
              </span>
              <h3>Nothing gathered yet</h3>
              <p>
                Your bag is where finds wait while you keep looking. Start with the
                everyday edit.
              </p>
              <ButtonLink href="/discover" variant="cta" onClick={close}>
                Browse the collection
              </ButtonLink>
            </div>
          ) : (
            <ul className="drawer-lines">
              {lines.map((line) => (
                <li className="drawer-line" key={line.product_id}>
                  <Link
                    className="drawer-line__thumb"
                    href={`/products/${line.product_slug}`}
                    onClick={close}
                    aria-label={`View ${line.product_name}`}
                  >
                    <ProductImage
                      src={line.image_url}
                      name={line.product_name}
                      alt=""
                      sizes="88px"
                    />
                  </Link>
                  <div className="drawer-line__copy">
                    <Link href={`/products/${line.product_slug}`} onClick={close}>
                      <strong>{line.product_name}</strong>
                    </Link>
                    <span className="mono tiny muted">{formatPrice(line.unit_price_cents)} each</span>
                    <div className="row" style={{ marginTop: "0.5rem" }}>
                      <QuantityStepper
                        value={line.quantity}
                        label={`Quantity of ${line.product_name}`}
                        max={99}
                        busy={isPending(line.product_id)}
                        size="sm"
                        onChange={(next) => void setQuantity(line.product_id, next)}
                      />
                      <button
                        type="button"
                        className="btn btn--quiet btn--sm"
                        onClick={() => void removeItem(line.product_id)}
                        disabled={isPending(line.product_id)}
                      >
                        <Icon.Trash size={15} />
                        Remove
                      </button>
                    </div>
                  </div>
                  <Money cents={line.line_total_cents} className="drawer-line__total" />
                </li>
              ))}
            </ul>
          )}
        </div>

        {lines.length > 0 ? (
          <footer className="drawer__foot">
            <div className="spread">
              <span className="label">Subtotal</span>
              <Money cents={subtotalCents} size="lead" />
            </div>
            <div className="row" style={{ gap: "0.625rem" }}>
              <ButtonLink href="/discover" variant="outline" onClick={close} style={{ flex: 1 }}>
                Continue browsing
              </ButtonLink>
              <ButtonLink href="/cart" variant="cta" onClick={close} style={{ flex: 1.2 }}>
                Review bag
                <Icon.ArrowRight size={17} />
              </ButtonLink>
            </div>
          </footer>
        ) : null}
      </div>
    </>
  );
}
