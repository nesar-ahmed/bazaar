"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ProductCard } from "@/app/components/product-card";
import { Button, ButtonLink } from "@/app/components/ui/button";
import { Alert, EmptyState, ProductCardSkeleton } from "@/app/components/ui/display";
import { SearchInput } from "@/app/components/ui/field";
import { Icon } from "@/app/components/ui/icons";
import { apiGet } from "@/lib/client-api";
import { buildProductQuery } from "@/lib/catalog-utils";
import { cx } from "@/lib/cx";
import type { Category, Product } from "@/lib/api-types";

export type SortKey = "newest" | "price-asc" | "price-desc" | "name-asc" | "stock-asc";

const SORTS: Array<{ value: SortKey; label: string; local: boolean }> = [
  { value: "newest", label: "Newest first", local: false },
  { value: "price-asc", label: "Price, low to high", local: true },
  { value: "price-desc", label: "Price, high to low", local: true },
  { value: "name-asc", label: "Name, A to Z", local: true },
  { value: "stock-asc", label: "Running low", local: true },
];

const LOCAL_SORTS = new Set(SORTS.filter((sort) => sort.local).map((sort) => sort.value));

/**
 * The first page arrives server-rendered; everything after is client-driven.
 * Search, aisle and layout live in the URL, so results are shareable,
 * bookmarkable and back-safe.
 */
export function CatalogView({
  categories,
  initialProducts,
  initialHasMore,
  pageLimit = 24,
}: {
  categories: Category[];
  initialProducts: Product[];
  initialHasMore: boolean;
  pageLimit?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const q = searchParams.get("q") ?? "";
  const categorySlug = searchParams.get("category") ?? "";
  const sortKey = (searchParams.get("sort") ?? "newest") as SortKey;
  const view = searchParams.get("view") === "list" ? "list" : "grid";

  const activeCategory = categories.find((category) => category.slug === categorySlug) ?? null;
  const serverKey = `${q}\u0000${categorySlug}`;

  const [items, setItems] = useState<Product[]>(initialProducts);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [status, setStatus] = useState<"idle" | "loading" | "loading-more" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState(q);
  const loadedKey = useRef(serverKey);
  const sentinel = useRef<HTMLDivElement | null>(null);

  const patchParams = useCallback(
    (changes: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [name, value] of Object.entries(changes)) {
        if (value === null || value === "") params.delete(name);
        else params.set(name, value);
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => setDraft(q), 0);
    return () => window.clearTimeout(timer);
  }, [q]);

  // Debounced so typing does not spam the API or the history stack.
  useEffect(() => {
    if (draft === q) return;
    const timer = window.setTimeout(
      () => patchParams({ q: draft.trim() || null }),
      350,
    );
    return () => window.clearTimeout(timer);
  }, [draft, patchParams, q]);

  // A server-side filter change re-reads page one.
  useEffect(() => {
    if (loadedKey.current === serverKey) return;
    loadedKey.current = serverKey;
    let cancelled = false;
    setStatus("loading");
    setError(null);
    void (async () => {
      try {
        const page = await apiGet<Product[]>(
          buildProductQuery({
            search: q || null,
            categoryId: activeCategory?.id ?? null,
            offset: 0,
            limit: pageLimit,
          }),
        );
        if (cancelled) return;
        setItems(page);
        setHasMore(page.length === pageLimit);
        setStatus("idle");
      } catch (reason) {
        if (cancelled) return;
        setError(reason instanceof Error ? reason.message : "The catalog could not be read.");
        setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeCategory, pageLimit, q, serverKey]);

  const loadMore = useCallback(async () => {
    if (!hasMore) return;
    setStatus("loading-more");
    setError(null);
    try {
      const page = await apiGet<Product[]>(
        buildProductQuery({
          search: q || null,
          categoryId: activeCategory?.id ?? null,
          offset: items.length,
          limit: pageLimit,
        }),
      );
      setItems((current) => {
        const seen = new Set(current.map((product) => product.id));
        return [...current, ...page.filter((product) => !seen.has(product.id))];
      });
      setHasMore(page.length === pageLimit);
      setStatus("idle");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The next page could not be read.");
      setStatus("error");
    }
  }, [activeCategory, hasMore, items.length, pageLimit, q]);

  // Cliffhanger: fetch the next page while the tail of this one is still visible.
  useEffect(() => {
    const node = sentinel.current;
    if (!node || !hasMore || items.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, items.length, loadMore]);

  const visible = useMemo(() => {
    if (!LOCAL_SORTS.has(sortKey)) return items;
    const sorted = [...items];
    if (sortKey === "price-asc") sorted.sort((a, b) => a.price_cents - b.price_cents);
    if (sortKey === "price-desc") sorted.sort((a, b) => b.price_cents - a.price_cents);
    if (sortKey === "name-asc") sorted.sort((a, b) => a.name.localeCompare(b.name));
    if (sortKey === "stock-asc") sorted.sort((a, b) => a.inventory_quantity - b.inventory_quantity);
    return sorted;
  }, [items, sortKey]);

  const hasFilters = Boolean(q || activeCategory);
  const sortIsLocal = LOCAL_SORTS.has(sortKey);

  return (
    <div className="browse">
      <div className="browse__main">
        <div className="browse__toolbar">
          <SearchInput
            label="Search pieces"
            value={draft}
            onChange={setDraft}
            placeholder="Search the collection"
            className="browse__search"
          />
          <p className="results" role="status" aria-live="polite">
            {status === "loading" ? (
              "Reading the shelf…"
            ) : (
              <>
                Showing <strong>{visible.length}</strong> of <strong>{items.length}</strong>{" "}
                {items.length === 1 ? "piece" : "pieces"}
                {hasMore ? ", more on the shelf" : ", everything we hold"}
              </>
            )}
          </p>
          <div className="browse__tools">
            <label className="row" htmlFor="sort-select" style={{ gap: "0.5rem" }}>
              <span className="label">Sort</span>
              <select
                id="sort-select"
                className="control"
                style={{ minWidth: "11rem" }}
                value={sortKey}
                onChange={(event) =>
                  patchParams({ sort: event.target.value === "newest" ? null : event.target.value })
                }
              >
                {SORTS.map((sort) => (
                  <option key={sort.value} value={sort.value}>
                    {sort.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="segmented" role="group" aria-label="Layout">
              <button
                type="button"
                className="segmented__btn"
                aria-pressed={view === "grid"}
                onClick={() => patchParams({ view: null })}
              >
                <Icon.Grid size={15} />
                Grid
              </button>
              <button
                type="button"
                className="segmented__btn"
                aria-pressed={view === "list"}
                onClick={() => patchParams({ view: "list" })}
              >
                <Icon.List size={15} />
                List
              </button>
            </div>
          </div>
        </div>

        {sortIsLocal ? (
          <p className="tiny muted" style={{ marginBlockEnd: "var(--s-4)" }}>
            {hasMore
              ? "This sort orders the pieces loaded so far, not the whole shelf."
              : "Sorted across everything we hold."}
          </p>
        ) : null}

        {error ? (
          <Alert
            tone="error"
            action={
              <Button variant="outline" size="sm" onClick={() => void loadMore()}>
                <Icon.Refresh size={15} />
                Try again
              </Button>
            }
          >
            {error}
          </Alert>
        ) : null}

        {status === "loading" ? (
          <div className="catalog-grid" aria-busy="true" aria-label="Loading pieces">
            {Array.from({ length: 8 }, (_, index) => (
              <ProductCardSkeleton key={index} />
            ))}
          </div>
        ) : visible.length === 0 ? (
          !hasFilters && items.length === 0 ? (
            <EmptyState
              icon={<Icon.Box size={22} />}
              title="The shelf is being set"
              action={
                <ButtonLink href="/" variant="outline">
                  Back to the market
                </ButtonLink>
              }
            >
              No pieces are listed yet. Staff can file new ones from the ops console.
            </EmptyState>
          ) : (
            <EmptyState
              icon={<Icon.Search size={22} />}
              title="Nothing matches this view"
              action={
                <Button
                  variant="cta"
                  onClick={() => {
                    setDraft("");
                    patchParams({ q: null, category: null });
                  }}
                >
                  Clear search
                </Button>
              }
            >
              {hasMore
                ? "There are more pieces on the shelf than we have loaded, and none of these match. Clear a filter to widen the search."
                : "Try a shorter search phrase."}
            </EmptyState>
          )
        ) : (
          <>
            <div className={cx(view === "list" ? "catalog-list" : "catalog-grid")}>
              {visible.map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  view={view}
                  priority={index < 2}
                  categoryName={
                    categories.find((category) => category.id === product.category_id)?.name
                  }
                />
              ))}
            </div>
            {hasMore ? (
              <div className="pager" ref={sentinel}>
                <Button
                  variant="outline"
                  onClick={() => void loadMore()}
                  loading={status === "loading-more"}
                >
                  {status === "loading-more" ? "Loading more" : "Load more"}
                </Button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
