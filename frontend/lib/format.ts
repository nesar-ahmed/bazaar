import type { OrderStatus } from "@/lib/api-types";

const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY ?? "USD";
const LOCALE = "en-US";

const cash = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: CURRENCY,
  minimumFractionDigits: 2,
});

const cashCompact = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: CURRENCY,
  maximumFractionDigits: 0,
});

/** All money is integer cents on the wire. */
export function formatPrice(priceCents: number): string {
  return cash.format((priceCents || 0) / 100);
}

export function formatPriceCompact(priceCents: number): string {
  return cashCompact.format((priceCents || 0) / 100);
}

export function currencyCode(): string {
  return CURRENCY;
}

/** Parse a "42.00" style admin input into integer cents. */
export function toCents(value: string | number): number {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.round(numeric * 100);
}

export function toDecimalInput(priceCents: number): string {
  return (priceCents / 100).toFixed(2);
}

export function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(value: string): string {
  return new Date(value).toLocaleString(LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatRelative(value: string): string {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} d ago`;
  return formatDate(value);
}

/** Ledger-style order reference: 000042. */
export function orderRef(id: number): string {
  return `#${String(id).padStart(5, "0")}`;
}

export function skuRef(id: number): string {
  return `SKU ${String(id).padStart(4, "0")}`;
}

export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}

export function statusLabel(status: OrderStatus): string {
  return {
    pending: "Awaiting pick",
    processing: "Preparing",
    shipped: "Dispatched",
    delivered: "Delivered",
    cancelled: "Cancelled",
  }[status];
}

/** One verb per control, in the operator's language. */
export function statusActionLabel(status: OrderStatus): string {
  return {
    pending: "Start preparing",
    processing: "Mark dispatched",
    shipped: "Mark delivered",
    delivered: "Delivered",
    cancelled: "Cancel order",
  }[status];
}

export function stockTone(quantity: number): "out" | "low" | "ok" {
  if (quantity < 1) return "out";
  if (quantity <= 5) return "low";
  return "ok";
}

export function stockLabel(quantity: number): string {
  if (quantity < 1) return "Out of stock";
  if (quantity <= 5) return `Only ${quantity} left`;
  return `${quantity} in stock`;
}
