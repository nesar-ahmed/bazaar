"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/app/components/ui/button";
import { SearchInput } from "@/app/components/ui/field";
import {
  EmptyState,
  Money,
  Panel,
  Skeleton,
  StockNote,
} from "@/app/components/ui/display";
import { Icon } from "@/app/components/ui/icons";
import { ProductImage } from "@/app/components/product-image";
import type { Product } from "@/lib/api-types";
import { cx } from "@/lib/cx";
import { formatDate, plural, skuRef } from "@/lib/format";

import { ConfirmInline } from "./controls";
import { ProductForm } from "./product-form";
import { ariaSort, nextSort, sortProducts, SORT_LABELS, type SortKey, type SortState } from "./sorting";
import { pageCopy } from "./metrics";
import { rowDomId, useRowFocus } from "./use-row-focus";
import type { ConsoleStore } from "./use-console-store";
import type { ProductPatch } from "./types";

const HEADINGS: Array<{ key: SortKey; numeric?: boolean }> = [
  { key: "name" },
  { key: "price", numeric: true },
  { key: "stock", numeric: true },
  { key: "category" },
  { key: "added", numeric: true },
];

/** Inline stock write: the cell owns the draft value, reverts on failure and
 *  names what happened. Save on blur, Enter, or the explicit button. */
function StockCell({ product, store }: { product: Product; store: ConsoleStore }) {
  const [value, setValue] = useState(String(product.inventory_quantity));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const statusId = `${rowDomId("product", product.id)}-stock-status`;

  async function commit() {
    if (saving) return;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 0) {
      setError("Whole units, zero or more.");
      setValue(String(product.inventory_quantity));
      return;
    }
    if (parsed === product.inventory_quantity) {
      setError(null);
      return;
    }

    setSaving(true);
    setError(null);
    const result = await store.saveProduct(
      product.id,
      { inventory_quantity: parsed },
      `Stock for ${product.name} moved from ${product.inventory_quantity} to ${parsed}.`,
    );
    setSaving(false);

    if (result.ok) {
      setValue(String(result.row.inventory_quantity));
    } else {
      setValue(String(product.inventory_quantity));
      setError(result.message);
    }
  }

  return (
    <span className="ops-stock">
      <label className="visually-hidden" htmlFor={`${statusId}-input`}>
        Stock on hand for {product.name}
      </label>
      <input
        id={`${statusId}-input`}
        className="control ops-stock__input"
        type="number"
        min={0}
        step={1}
        inputMode="numeric"
        value={value}
        disabled={saving}
        aria-describedby={statusId}
        aria-busy={saving || undefined}
        onChange={(event) => setValue(event.target.value)}
        onBlur={() => void commit()}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.blur();
            void commit();
          }
        }}
      />
      <Button
        variant="quiet"
        size="sm"
        className="ops-tap"
        loading={saving}
        onClick={() => void commit()}
      >
        Save stock
      </Button>
      <span id={statusId} className="ops-stock__state" role="status" aria-live="polite">
        {error ? (
          <span className="ops-stock__error">{error}</span>
        ) : saving ? (
          <span>Saving</span>
        ) : Number(value) !== product.inventory_quantity ? (
          <span>Unsaved</span>
        ) : (
          <StockNote quantity={product.inventory_quantity} />
        )}
      </span>
    </span>
  );
}

function SortHead({
  sort,
  onSort,
  item,
}: {
  sort: SortState;
  onSort: (key: SortKey) => void;
  item: { key: SortKey; numeric?: boolean };
}) {
  const active = sort?.key === item.key;
  return (
    <th
      scope="col"
      className={cx("is-sortable", item.numeric && "col-num")}
      aria-sort={ariaSort(sort, item.key)}
    >
      <button type="button" className="ops-sort" onClick={() => onSort(item.key)}>
        {SORT_LABELS[item.key]}
        <span className={cx("ops-sort__mark", active && "ops-sort__mark--on")} aria-hidden="true">
          {active && sort && sort.dir === "asc" ? (
            <Icon.ArrowUp size={13} />
          ) : (
            <Icon.ChevronDown size={13} />
          )}
        </span>
      </button>
    </th>
  );
}

/** Removing a piece is a soft delete. Say so, twice, before it happens. */
function RemoveConfirm({
  product,
  store,
  onCancel,
}: {
  product: Product;
  store: ConsoleStore;
  onCancel: () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    await store.hideProduct(product.id, product.name);
    setBusy(false);
  }

  return (
    <ConfirmInline
      label={`Hide ${product.name}`}
      busy={busy}
      confirmLabel="Hide from the storefront"
      onCancel={onCancel}
      onConfirm={() => void confirm()}
      consequence={
        <>
          <strong>{product.name}</strong> leaves the storefront and stops appearing in search.
          Its price, stock and slug stay on the row, and that slug cannot be reused by a new
          product. Cancelling an order that holds it is the other fix.
        </>
      }
    />
  );
}

export function OpsProducts({ store }: { store: ConsoleStore }) {
  const [search, setSearch] = useState(store.filters.search);
  const [sort, setSort] = useState<SortState>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [confirming, setConfirming] = useState<number | null>(null);
  const searchBox = useRef<HTMLDivElement | null>(null);
  const timer = useRef<number | null>(null);
  const appliedSearch = store.filters.search;
  const categoryId = store.filters.categoryId;
  const applyFilters = store.applyFilters;

  const { isWanted, isLast } = useRowFocus(store, "products", "product", store.products);

  // Debounced server read: typing stays local for 300ms before it costs a request.
  useEffect(() => {
    if (timer.current) window.clearTimeout(timer.current);
    if (search === appliedSearch) return;
    timer.current = window.setTimeout(() => {
      applyFilters({ search, categoryId });
    }, 300);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [search, appliedSearch, applyFilters, categoryId]);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(store.filters.search), 0);
    return () => window.clearTimeout(timer);
  }, [store.filters.search]);

  const products = store.products;
  const categoryName = store.categoryName;
  const rows = useMemo(
    () => sortProducts(products, sort, (product) => categoryName(product.category_id)),
    [products, sort, categoryName],
  );

  const filtersOn = store.filters.search !== "" || store.filters.categoryId !== null;

  const live = store.products.filter((product) => product.is_active).length;

  async function saveRow(id: number, name: string, body: ProductPatch) {
    const result = await store.saveProduct(id, body, `Changes to ${name} are on the row.`);
    if (result.ok) setEditing(null);
    return result.ok ? { ok: true as const } : { ok: false as const, message: result.message };
  }

  return (
    <div className="ops-stack">
      <Panel
        id="ops-file"
        title="File a new piece"
        eyebrow="Creates one product row"
        bodyClass="panel__body--tight"
        tone="sunk"
      >
        <ProductForm
          categories={store.categories}
          submitLabel="File product"
          onSubmit={async (body) => {
            const result = await store.createProduct(body);
            if (result.ok) return { ok: true as const };
            return { ok: false as const, message: result.message };
          }}
        />
      </Panel>

      <Panel
        id="ops-products"
        title="Products"
        eyebrow="Table first"
        actions={
          <div className="row">
            <Button
              variant="outline"
              size="sm"
              icon={<Icon.Refresh size={15} />}
              loading={store.page.loading}
              onClick={store.reloadProducts}
            >
              Re-read
            </Button>
          </div>
        }
        bodyClass="panel__body--flush"
      >
        <div className="ops-toolbar">
          <div className="ops-toolbar__search" ref={searchBox}>
            <SearchInput
              label="Search pieces"
              value={search}
              onChange={setSearch}
              placeholder="Name or description"
            />
          </div>

          <details className="ops-filters" open>
            <summary className="ops-filters__summary">
              <Icon.Filter size={15} />
              Aisles
              {store.filters.categoryId !== null ? <span className="badge">1</span> : null}
            </summary>
            <div className="ops-filters__body">
              <div className="ops-chips" role="group" aria-label="Filter by aisle">
                <button
                  type="button"
                  className="chip"
                  aria-pressed={store.filters.categoryId === null}
                  onClick={() =>
                    store.applyFilters({ search: store.filters.search, categoryId: null })
                  }
                >
                  All
                  <span className="chip__count">{store.products.length}</span>
                </button>
                {store.categories.map((category) => {
                  const count = store.products.filter(
                    (product) => product.category_id === category.id && product.is_active,
                  ).length;
                  return (
                    <button
                      key={category.id}
                      type="button"
                      className="chip"
                      aria-pressed={store.filters.categoryId === category.id}
                      onClick={() =>
                        store.applyFilters({
                          search: store.filters.search,
                          categoryId: category.id,
                        })
                      }
                    >
                      {category.name}
                      <span className="chip__count">{count}</span>
                    </button>
                  );
                })}
              </div>
              {filtersOn ? (
                <Button
                  variant="quiet"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    store.applyFilters({ search: "", categoryId: null });
                  }}
                >
                  Clear filters
                </Button>
              ) : null}
            </div>
          </details>

          <p className="ops-count tiny" role="status" aria-live="polite">
            {store.page.error
              ? "Last read failed. Rows below are from the previous read."
              : `${pageCopy(store.products.length, store.page.filled)} · ${plural(live, "live piece")}`}
          </p>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon={<Icon.Package size={22} />}
            title={filtersOn ? "No rows answer that filter" : "The shelf is empty"}
            action={
              filtersOn ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearch("");
                    store.applyFilters({ search: "", categoryId: null });
                  }}
                >
                  Clear filters
                </Button>
              ) : (
                <Button variant="outline" onClick={() => document.getElementById("ops-file-title")?.focus()}>
                  File the first piece
                </Button>
              )
            }
          >
            {filtersOn
              ? "The search runs server-side over names and descriptions, so this is what the API answered."
              : "File a piece above. Stock is required, so a row without units still exists and reads as sold out."}
          </EmptyState>
        ) : (
          <div className="table-wrap ops-scroll">
            <table className="table ops-table">
              <caption>
                {sort
                  ? `Sorted by ${SORT_LABELS[sort.key].toLowerCase()}, ${
                      sort.dir === "asc" ? "lowest or A first" : "highest or Z first"
                    }, over the rows loaded here. `
                  : "Newest row first, as the API returns it. "}
                {pageCopy(store.products.length, store.page.filled)}. Select a column to re-sort
                these rows; sorting does not ask the server for another page.
              </caption>
              <thead>
                <tr>
                  <th scope="col" className="ops-col--thumb">
                    <span className="visually-hidden">Photo</span>
                  </th>
                  {HEADINGS.map((item) => (
                    <SortHead
                      key={item.key}
                      item={item}
                      sort={sort}
                      onSort={(key) => setSort((current) => nextSort(current, key))}
                    />
                  ))}
                  <th scope="col" className="col-actions">
                    Row actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((product) => (
                  <Fragment key={product.id}>
                    <tr
                      id={rowDomId("product", product.id)}
                      tabIndex={-1}
                      className={cx(
                        "ops-row",
                        !product.is_active && "ops-row--off",
                        isLast(product.id) && "ops-row--last",
                        isWanted(product.id) && "ops-row--wanted",
                      )}
                      aria-label={product.name}
                    >
                      <td className="ops-col--thumb">
                        <span className="ops-thumb">
                          <ProductImage src={product.image_url} name={product.name} sizes="40px" />
                        </span>
                      </td>
                      <td data-label="Name">
                        <span className="ops-piece">
                          <strong className="ops-piece__name">{product.name}</strong>
                          <span className="ops-piece__meta">
                            <span className="mono">{product.slug}</span>
                            <span aria-hidden="true">·</span>
                            <span className="mono">{skuRef(product.id)}</span>
                            {!product.is_active ? <span className="ops-flag">Hidden</span> : null}
                          </span>
                        </span>
                      </td>
                      <td className="col-num" data-label="Price">
                        <Money cents={product.price_cents} />
                      </td>
                      <td className="col-num" data-label="Stock">
                        <StockCell
                          key={`${product.id}:${product.inventory_quantity}`}
                          product={product}
                          store={store}
                        />
                      </td>
                      <td data-label="Aisle">
                        <span className={cx(!product.category_id && "muted")}>
                          {store.categoryName(product.category_id)}
                        </span>
                      </td>
                      <td className="col-num" data-label="Added">
                        <time dateTime={product.created_at}>{formatDate(product.created_at)}</time>
                      </td>
                      <td className="col-actions" data-label="Actions">
                        {confirming === product.id ? (
                          <RemoveConfirm
                            product={product}
                            store={store}
                            onCancel={() => setConfirming(null)}
                          />
                        ) : (
                          <>
                            <Button
                              variant="quiet"
                              size="sm"
                              className="ops-tap"
                              icon={<Icon.Pencil size={14} />}
                              aria-expanded={editing === product.id}
                              disabled={store.isBusy(`product:${product.id}`)}
                              onClick={() =>
                                setEditing((current) => (current === product.id ? null : product.id))
                              }
                            >
                              Edit
                            </Button>
                            {product.is_active ? (
                              <Button
                                variant="danger"
                                size="sm"
                                className="ops-tap"
                                icon={<Icon.Trash size={14} />}
                                disabled={store.isBusy(`product:${product.id}`)}
                                onClick={() => {
                                  setEditing(null);
                                  setConfirming(product.id);
                                }}
                              >
                                Remove
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                className="ops-tap"
                                icon={<Icon.Eye size={14} />}
                                loading={store.isBusy(`product:${product.id}`)}
                                onClick={() => void store.reveal(product.id, product.name)}
                              >
                                Show again
                              </Button>
                            )}
                          </>
                        )}
                      </td>
                    </tr>

                    {editing === product.id ? (
                      <tr className="ops-editor">
                        <td colSpan={7}>
                          <div className="ops-editor__inner">
                            <p className="label ops-editor__eyebrow">
                              Editing {product.name} · {skuRef(product.id)}
                            </p>
                            <ProductForm
                              key={product.id}
                              categories={store.categories}
                              original={product}
                              submitLabel="Save changes"
                              busy={store.isBusy(`product:${product.id}`)}
                              onCancel={() => setEditing(null)}
                              onSubmit={(body) => saveRow(product.id, product.name, body)}
                            />
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="ops-foot">
          <p className="tiny muted" role="status">
            {store.page.error ? store.page.error : null}
          </p>
          {store.page.filled ? (
            <Button
              variant="outline"
              size="sm"
              icon={<Icon.Plus size={15} />}
              loading={store.page.paging}
              onClick={store.loadMore}
            >
              Load more rows
            </Button>
          ) : (
            <span className="tiny muted">That was the last page.</span>
          )}
        </div>
      </Panel>

      {store.page.loading ? (
        <p className="ops-loading" aria-hidden="true">
          <Skeleton className="skeleton--text" style={{ width: "40%" }} />
        </p>
      ) : null}
    </div>
  );
}
