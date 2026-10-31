import type { Product } from "@/lib/api-types";

export type SortKey = "name" | "price" | "stock" | "category" | "added";
export type SortDir = "asc" | "desc";

/** `null` means "leave the API order alone" (newest row first). */
export type SortState = { key: SortKey; dir: SortDir } | null;

export const SORT_LABELS: Record<SortKey, string> = {
  name: "Name",
  price: "Price",
  stock: "Stock",
  category: "Aisle",
  added: "Added",
};

/**
 * The list endpoint has no sort parameter, so this sorts the rows already
 * loaded in the console — a window sort over a page, never a claim about the
 * whole table. Captions say which rows are covered.
 */
export function sortProducts(
  rows: Product[],
  sort: SortState,
  categoryOf: (product: Product) => string,
): Product[] {
  if (!sort) return rows;
  const factor = sort.dir === "asc" ? 1 : -1;
  return [...rows].sort((left, right) => {
    switch (sort.key) {
      case "name":
        return factor * left.name.localeCompare(right.name, "en", { sensitivity: "base" });
      case "price":
        return factor * (left.price_cents - right.price_cents);
      case "stock":
        return factor * (left.inventory_quantity - right.inventory_quantity);
      case "category": {
        const a = categoryOf(left);
        const b = categoryOf(right);
        if (a === b) return left.id - right.id;
        return factor * a.localeCompare(b, "en", { sensitivity: "base" });
      }
      case "added":
      default:
        return factor * (left.id - right.id);
    }
  });
}

/** First click sorts, second flips, third returns to the API order. */
export function nextSort(current: SortState, key: SortKey): SortState {
  if (!current || current.key !== key) {
    return { key, dir: key === "name" || key === "category" ? "asc" : "desc" };
  }
  if (current.dir === "asc") return { key, dir: "desc" };
  return null;
}

export function ariaSort(current: SortState, key: SortKey): "ascending" | "descending" | "none" {
  if (!current || current.key !== key) return "none";
  return current.dir === "asc" ? "ascending" : "descending";
}
