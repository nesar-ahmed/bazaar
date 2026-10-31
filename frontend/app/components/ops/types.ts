import type { Category, Order, OrderStatus, Product } from "@/lib/api-types";

/** The four console panels, mirrored in the `?tab=` deep link. */
export type TabId = "overview" | "products" | "categories" | "orders";

export const TAB_IDS: TabId[] = ["overview", "products", "categories", "orders"];

export const DEFAULT_TAB: TabId = "overview";

export function readTabId(value: string | null | undefined): TabId {
  return TAB_IDS.includes((value ?? "") as TabId) ? (value as TabId) : DEFAULT_TAB;
}

export type RowKind = "product" | "category" | "order";

/** A row the operator acted on, or wants to reach. Kept so the console can
 *  re-open a tab on the same row instead of dumping them at the top. */
export type RowTarget = {
  tab: TabId;
  kind: RowKind;
  id: number;
  label: string;
};

export type ProductFilters = {
  search: string;
  categoryId: number | null;
};

/** Everything the admin may PATCH on a product row. */
export type ProductPatch = Partial<Omit<Product, "id" | "created_at">>;

/** Everything the admin may PATCH on a category row. */
export type CategoryPatch = Partial<Omit<Category, "id">>;

/** `pending` is never a legal target, so the machine's targets are the rest. */
export type OrderTarget = Exclude<OrderStatus, "pending">;

/** One verb per action, in the operator's language. The same wording as
 *  `statusActionLabel` in `@/lib/format`, keyed by the status we move toward. */
export const ORDER_ACTION: Record<OrderTarget, string> = {
  processing: "Start preparing",
  shipped: "Mark dispatched",
  delivered: "Mark delivered",
  cancelled: "Cancel order",
};

/** Consequences named in plain words before an action that is not obvious. */
export const ORDER_EFFECT: Record<OrderTarget, string> = {
  processing: "The piece moves into the picking queue.",
  shipped: "This records the parcel as handed to the carrier.",
  delivered: "This closes the order as received.",
  cancelled: "Stock for every line goes back on the shelf.",
};

/** Stock at or below this reads as "reorder soon" across the console. */
export const LOW_STOCK = 5;

/** Products carry only `category_id`; the console joins the name itself. */
export function categoryNameOf(
  categories: Category[],
  categoryId: number | null,
): string {
  if (categoryId === null) return "Unfiled";
  return categories.find((category) => category.id === categoryId)?.name ?? "Unfiled";
}

export function orderUnits(order: Order): number {
  return order.items.reduce((sum, line) => sum + line.quantity, 0);
}

export function isLive(product: Product): boolean {
  return product.is_active;
}
