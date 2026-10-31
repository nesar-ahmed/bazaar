/**
 * Wire types for the Bazaar FastAPI backend. Field names mirror the API
 * exactly (snake_case) so responses can be cast straight from JSON.
 */

export type Role = "customer" | "admin";

export type OrderStatus =
  | "pending"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

export type CartStatus = "active" | "ordered" | "merged";

export type Health = { status: "ok" };

export type UserProfile = {
  id: number;
  email: string;
  full_name: string;
  role: Role;
  is_active: boolean;
  created_at: string;
};

export type TokenPair = {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
  expires_in: number;
  refresh_expires_in: number;
  cart_merge_warnings: string[];
};

export type Category = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
};

export type Product = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  price_cents: number;
  inventory_quantity: number;
  image_url: string | null;
  category_id: number | null;
  is_active: boolean;
  created_at: string;
};

export type CartLine = {
  product_id: number;
  product_name: string;
  product_slug: string;
  image_url: string | null;
  unit_price_cents: number;
  quantity: number;
  line_total_cents: number;
};

export type Cart = {
  id: number;
  items: CartLine[];
  subtotal_cents: number;
  /** Only non-null on the request that first creates a guest cart. */
  cart_token: string | null;
  warnings: string[];
};

export type OrderLine = {
  product_id: number;
  product_name: string;
  product_slug: string;
  unit_price_cents: number;
  quantity: number;
  line_total_cents: number;
};

export type Order = {
  id: number;
  status: OrderStatus;
  subtotal_cents: number;
  created_at: string;
  items: OrderLine[];
};

/** Admin-only order view: the API does not embed the buyer, so the console
 *  identifies orders by id, placed-at, value and lines. */
export type AdminOrder = Order;

export type ProductQuery = {
  categoryId?: number | null;
  search?: string | null;
  offset?: number;
  limit?: number;
};

export type ProductDraft = {
  name: string;
  slug: string;
  description: string | null;
  price_cents: number;
  inventory_quantity: number;
  image_url: string | null;
  category_id: number | null;
};

export type CategoryDraft = {
  name: string;
  slug: string;
  description: string | null;
};

/** Statuses an admin may move an order to (the API rejects `pending`). */
export const ORDER_FLOW: Record<OrderStatus, OrderStatus[]> = {
  pending: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

/** Statuses the customer may act on themselves. */
export const CUSTOMER_CANCELLABLE: OrderStatus[] = ["pending"];

export const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

export const SLUG_PATTERN = "[a-z0-9]+(?:-[a-z0-9]+)*";
