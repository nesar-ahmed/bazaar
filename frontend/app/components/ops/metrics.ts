import type { Order, OrderStatus, Product } from "@/lib/api-types";
import { orderRef } from "@/lib/format";
import { LOW_STOCK, type RowTarget, type TabId } from "./types";

export type CategoryPieces = {
  /** Live pieces filed under the category among the rows we hold. */
  live: number;
  /** Pieces hidden by a soft delete. The list endpoint never returns them,
   *  so this can only be counted from rows the console still holds in state. */
  hidden: number;
};

export type OpsMetrics = {
  rows: number;
  live: number;
  hidden: number;
  outOfStock: number;
  lowStock: number;
  unfiled: number;
  units: number;
  shelfCents: number;
  orders: number;
  byStatus: Record<OrderStatus, number>;
  unitsSold: number;
  soldCents: number;
  aovCents: number;
  pieces: Map<number, CategoryPieces>;
};

const EMPTY_COUNTS: Record<OrderStatus, number> = {
  pending: 0,
  processing: 0,
  shipped: 0,
  delivered: 0,
  cancelled: 0,
};

/** Everything below is computed over the rows the console holds, never a
 *  fabricated total: the products endpoint returns a bare page with no count. */
export function computeMetrics(products: Product[], orders: Order[]): OpsMetrics {
  const byStatus: Record<OrderStatus, number> = { ...EMPTY_COUNTS };
  let unitsSold = 0;
  let soldCents = 0;
  let paidOrders = 0;

  for (const order of orders) {
    byStatus[order.status] += 1;
    if (order.status === "cancelled") continue;
    paidOrders += 1;
    soldCents += order.subtotal_cents;
    for (const line of order.items) unitsSold += line.quantity;
  }

  const pieces = new Map<number, CategoryPieces>();
  let live = 0;
  let hidden = 0;
  let outOfStock = 0;
  let lowStock = 0;
  let unfiled = 0;
  let units = 0;
  let shelfCents = 0;

  for (const product of products) {
    const bucket = product.category_id;
    if (bucket !== null) {
      const entry = pieces.get(bucket) ?? { live: 0, hidden: 0 };
      if (product.is_active) entry.live += 1;
      else entry.hidden += 1;
      pieces.set(bucket, entry);
    }

    if (!product.is_active) {
      hidden += 1;
      continue;
    }

    live += 1;
    if (product.inventory_quantity < 1) outOfStock += 1;
    else if (product.inventory_quantity <= LOW_STOCK) lowStock += 1;
    if (product.category_id === null) unfiled += 1;
    units += product.inventory_quantity;
    shelfCents += product.price_cents * product.inventory_quantity;
  }

  return {
    rows: products.length,
    live,
    hidden,
    outOfStock,
    lowStock,
    unfiled,
    units,
    shelfCents,
    orders: orders.length,
    byStatus,
    unitsSold,
    soldCents,
    aovCents: paidOrders > 0 ? Math.round(soldCents / paidOrders) : 0,
    pieces,
  };
}

export type Attention = {
  key: string;
  headline: string;
  detail: string;
  tone: "bad" | "warn" | "info";
  goto: RowTarget;
};

/**
 * The pick list for the operator: stockouts that a pending order is already
 * sitting on first, then the orders waiting to be picked, oldest first.
 */
export function attentionList(
  products: Product[],
  orders: Order[],
  nameOf: (id: number | null) => string,
): Attention[] {
  const byId = new Map(products.map((product) => [product.id, product]));
  const pending = orders.filter((order) => order.status === "pending");
  const items: Attention[] = [];
  const seen = new Set<string>();

  for (const order of pending) {
    for (const line of order.items) {
      const product = byId.get(line.product_id);
      if (!product || product.inventory_quantity > 0) continue;
      const key = `stock-${product.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({
        key,
        headline: `${product.name} is out of stock`,
        detail: `Order ${orderRef(order.id)} still needs ${line.quantity}. Aisle: ${nameOf(
          product.category_id,
        )}.`,
        tone: "bad",
        goto: { tab: "products", kind: "product", id: product.id, label: product.name },
      });
    }
  }

  for (const order of pending) {
    const units = order.items.reduce((sum, line) => sum + line.quantity, 0);
    const key = `pick-${order.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({
      key,
      headline: `Order ${order.id} awaits pick`,
      detail: `${units} ${units === 1 ? "unit" : "units"} across ${
        order.items.length
      } ${order.items.length === 1 ? "line" : "lines"}.`,
      tone: "warn",
      goto: { tab: "orders", kind: "order", id: order.id, label: `Order ${order.id}` },
    });
  }

  for (const product of products) {
    if (!product.is_active) continue;
    if (product.inventory_quantity < 1 || product.inventory_quantity > LOW_STOCK) continue;
    const key = `low-${product.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({
      key,
      headline: `${product.name} is down to ${product.inventory_quantity}`,
      detail: `Aisle: ${nameOf(product.category_id)}.`,
      tone: "info",
      goto: { tab: "products", kind: "product", id: product.id, label: product.name },
    });
  }

  return items.slice(0, 5);
}

/** Honest page accounting: the API gives no total, only whether a page filled. */
export function pageCopy(loaded: number, filled: boolean): string {
  if (loaded === 0) return filled ? "no rows yet" : "no rows";
  return filled
    ? `showing ${loaded} of at least ${loaded + 1}`
    : `showing ${loaded} of ${loaded}`;
}

export type { TabId };
