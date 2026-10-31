"use client";

import Link from "next/link";

import { useCart } from "@/app/components/cart-provider";
import { ProductImage } from "@/app/components/product-image";
import { Icon } from "@/app/components/ui/icons";
import { cx } from "@/lib/cx";
import type { Product } from "@/lib/api-types";
import { formatPrice } from "@/lib/format";

/** The catalog tile. Quick-add is always reachable: on hover-capable devices it
 *  slides in, on touch it is permanently visible. */
export function ProductCard({
  product,
  categoryName,
  view = "grid",
  priority = false,
  sizes,
}: {
  product: Product;
  categoryName?: string;
  view?: "grid" | "list";
  priority?: boolean;
  sizes?: string;
}) {
  const { addItem, isPending } = useCart();
  const soldOut = product.inventory_quantity < 1;
  const busy = isPending(product.id);
  const href = `/products/${product.slug}`;

  return (
    <article className={cx("pcard", view === "list" && "pcard--list")}>
      <div className="pcard__media">
        <Link href={href} aria-label={`View ${product.name}`} tabIndex={-1}>
          <ProductImage
            src={product.image_url}
            name={product.name}
            alt=""
            priority={priority}
            sizes={sizes ?? "(min-width: 1100px) 320px, (min-width: 700px) 33vw, 46vw"}
          />
        </Link>
        <span className="pcard__price price price--tag">{formatPrice(product.price_cents)}</span>
        {soldOut ? (
          <span className="pcard__flag">
            <Icon.CircleX size={13} />
            Sold out
          </span>
        ) : product.inventory_quantity <= 5 ? (
          <span className="pcard__flag">
            <Icon.Clock size={13} />
            {product.inventory_quantity} left
          </span>
        ) : null}
        <button
          type="button"
          className={cx("btn pcard__add", soldOut ? "btn--outline" : "btn--cta", "btn--sm")}
          disabled={soldOut || busy}
          aria-label={`Add ${product.name} to bag`}
          onClick={() => void addItem({ id: product.id, name: product.name })}
        >
          {busy ? <Icon.Spinner /> : soldOut ? <Icon.CircleX size={15} /> : <Icon.Plus size={15} />}
          <span>{busy ? "Adding" : soldOut ? "Sold out" : "Add to bag"}</span>
        </button>
      </div>

      <div className="pcard__body">
        <div className="pcard__cat">
          <span className="label">{categoryName ?? "Unfiled"}</span>
          <span className="mono tiny muted">SKU {String(product.id).padStart(4, "0")}</span>
        </div>
        <h3 className="pcard__title">
          <Link href={href}>{product.name}</Link>
        </h3>
        {product.description ? (
          <p className="pcard__desc">{product.description}</p>
        ) : null}
        <div className="pcard__row">
          <span
            className={cx(
              "stock-note",
              soldOut ? "stock-note--out" : product.inventory_quantity <= 5 ? "stock-note--low" : "stock-note--ok",
            )}
          >
            {soldOut ? "Out of stock" : `${product.inventory_quantity} in stock`}
          </span>
          <span className="pcard__price-num">{formatPrice(product.price_cents)}</span>
        </div>
      </div>
    </article>
  );
}
