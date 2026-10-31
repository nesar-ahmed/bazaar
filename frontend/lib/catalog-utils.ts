import type { Category, ProductQuery } from "@/lib/api-types";

export function buildProductQuery({
  categoryId = null,
  search = null,
  offset = 0,
  limit = 24,
}: ProductQuery): string {
  const params = new URLSearchParams();
  if (categoryId && categoryId > 0) params.set("category_id", String(categoryId));
  const term = search?.trim();
  if (term) params.set("search", term.slice(0, 120));
  params.set("offset", String(Math.max(0, offset)));
  params.set("limit", String(Math.min(100, Math.max(1, limit))));
  return `products?${params.toString()}`;
}

export function categoryNameById(
  categories: Category[],
  categoryId: number | null,
): string {
  if (!categoryId) return "Unfiled";
  return categories.find((category) => category.id === categoryId)?.name ?? "Unfiled";
}

export function categoryBySlug(
  categories: Category[],
  slug: string | null | undefined,
): Category | undefined {
  if (!slug) return undefined;
  return categories.find((category) => category.slug === slug);
}
