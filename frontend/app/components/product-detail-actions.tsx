"use client";

import { useState } from "react";

import { QuantityStepper } from "@/app/components/quantity-stepper";
import { useCart } from "@/app/components/cart-provider";
import { Button, ButtonLink } from "@/app/components/ui/button";
import { Alert } from "@/app/components/ui/display";
import { Icon } from "@/app/components/ui/icons";
import type { Product } from "@/lib/api-types";
import { formatPrice, stockLabel } from "@/lib/format";

/** Buy panel plus the thumb-zone bar that replaces it under 900px. */
export function ProductPurchase({ product }: { product: Product }) {
  const { addItem, isPending, open } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const soldOut = product.inventory_quantity < 1;
  const max = Math.min(Math.max(product.inventory_quantity, 1), 99);
  const busy = isPending(product.id);

  async function add() {
    const ok = await addItem({ id: product.id, name: product.name }, { quantity });
    setAdded(ok);
  }

  return (
    <>
      <div className="pdp__buy-stack">
        <div className="pdp__buy">
          {!soldOut ? (
            <QuantityStepper
              value={quantity}
              onChange={setQuantity}
              max={max}
              label={`Quantity of ${product.name}`}
            />
          ) : null}
          <Button
            variant={soldOut ? "outline" : "cta"}
            size="lg"
            disabled={soldOut}
            loading={busy}
            onClick={() => void add()}
          >
            {soldOut ? (
              <>
                <Icon.CircleX size={17} />
                Out of stock
              </>
            ) : busy ? (
              "Adding to bag"
            ) : (
              <>
                <Icon.Bag size={17} />
                Add to bag · {formatPrice(product.price_cents * quantity)}
              </>
            )}
          </Button>
          {added && !busy ? (
            <ButtonLink href="/cart" variant="quiet" size="lg" onClick={open}>
              View bag
              <Icon.ArrowRight size={16} />
            </ButtonLink>
          ) : null}
        </div>
        <p className="tiny muted">
          {soldOut
            ? "This piece is on back order. Stock counts are live, so it can come back at any time."
            : `Reserves ${quantity} of ${product.inventory_quantity} available units when you check out. Nothing is charged yet.`}
        </p>
      </div>

      {!soldOut ? (
        <div className="buybar">
          <div className="buybar__price">
            <span className="label">{product.name}</span>
            <span className="price price--lead">{formatPrice(product.price_cents * quantity)}</span>
          </div>
          <QuantityStepper
            value={quantity}
            onChange={setQuantity}
            max={max}
            label={`Quantity of ${product.name}`}
            size="sm"
          />
          <Button
            className="buybar__cta"
            variant="cta"
            loading={busy}
            onClick={() => void add()}
          >
            <Icon.Bag size={17} />
            Add to bag
          </Button>
        </div>
      ) : (
        <div className="buybar">
          <Alert tone="warn">{stockLabel(product.inventory_quantity)}</Alert>
        </div>
      )}
    </>
  );
}
