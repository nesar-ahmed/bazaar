"use client";

import { useCallback, useRef, useState } from "react";

import type { Category, Order, OrderStatus, Product, UserProfile } from "@/lib/api-types";
import { apiGet, apiSend } from "@/lib/client-api";
import { categoryNameById } from "@/lib/catalog-utils";
import { orderRef } from "@/lib/format";
import { messageOf } from "./validate";
import type {
  CategoryPatch,
  OrderTarget,
  ProductFilters,
  ProductPatch,
  RowTarget,
  TabId,
} from "./types";

/** Page size the console asks the API for. The products endpoint has no total,
 *  so a page that comes back full is the only signal that more rows exist. */
export const PRODUCT_PAGE = 50;

export type NoticeScope = TabId | "global";

export type Notice = {
  id: number;
  scope: NoticeScope;
  tone: "ok" | "bad" | "info";
  text: string;
  action?: { label: string; run: () => void };
};

export type Seed = {
  profile: UserProfile;
  products: Product[];
  categories: Category[];
  orders: Order[];
};

/** Mutations answer with either the fresh row or the API's own reason. Panels
 *  need the reason to put it under the field that caused it. */
export type Result<T> = { ok: true; row: T } | { ok: false; message: string };

export type Done = { ok: true } | { ok: false; message: string };

/**
 * One copy of every list, plus in-flight keys, notices and the last row the
 * operator acted on. Rows are patched from the response payload: no panel
 * reloads the console, so scroll, filters and open editors survive a write.
 */
export function useConsoleStore(seed: Seed, navigate: (target: RowTarget) => void) {
  const [products, setProducts] = useState<Product[]>(seed.products);
  const [categories, setCategories] = useState<Category[]>(seed.categories);
  const [orders, setOrders] = useState<Order[]>(seed.orders);

  const [filters, setFilters] = useState<ProductFilters>({ search: "", categoryId: null });
  const [page, setPage] = useState({
    loading: false,
    paging: false,
    /** The last read filled the page, so more rows probably exist. */
    filled: seed.products.length >= PRODUCT_PAGE,
    error: null as string | null,
  });

  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [notices, setNotices] = useState<Notice[]>([]);
  const [lastRow, setLastRow] = useState<RowTarget | null>(null);
  const [wanted, setWanted] = useState<RowTarget | null>(null);

  const sequence = useRef(0);
  const readToken = useRef(0);
  const timers = useRef(new Map<number, number>());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
    setNotices((current) => current.filter((notice) => notice.id !== id));
  }, []);

  const notify = useCallback(
    (scope: NoticeScope, tone: Notice["tone"], text: string, action?: Notice["action"]) => {
      sequence.current += 1;
      const id = sequence.current;
      setNotices((current) => [...current, { id, scope, tone, text, action }].slice(-4));
      const life = tone === "ok" ? 7000 : tone === "info" ? 9000 : 0;
      if (life) timers.current.set(id, window.setTimeout(() => dismiss(id), life));
      return id;
    },
    [dismiss],
  );

  const mark = useCallback((key: string, on: boolean) => {
    setBusy((current) => {
      if (on) return { ...current, [key]: true };
      const next = { ...current };
      delete next[key];
      return next;
    });
  }, []);

  const remember = useCallback((target: RowTarget) => setLastRow(target), []);

  const goTo = useCallback(
    (target: RowTarget) => {
      setWanted(target);
      navigate(target);
    },
    [navigate],
  );

  const clearWanted = useCallback((id: number) => {
    setWanted((current) => (current && current.id === id ? null : current));
  }, []);

  /* ------------------------------------------------------------------ rows */

  const patchRow = useCallback((row: Product) => {
    setProducts((current) => current.map((product) => (product.id === row.id ? row : product)));
  }, []);

  /* -------------------------------------------------------------- products */

  const readProducts = useCallback(
    async (next: ProductFilters, offset: number, append: boolean) => {
      readToken.current += 1;
      const token = readToken.current;
      setPage((current) => ({
        ...current,
        loading: !append,
        paging: append,
        error: null,
      }));

      try {
        const rows = await apiGet<Product[]>("admin/products", {
          search: next.search || undefined,
          category_id: next.categoryId ?? undefined,
          offset,
          limit: PRODUCT_PAGE,
        });
        if (token !== readToken.current) return;
        setProducts((current) => {
          if (!append) return rows;
          const seen = new Set(current.map((product) => product.id));
          return [...current, ...rows.filter((product) => !seen.has(product.id))];
        });
        setPage((current) => ({
          ...current,
          loading: false,
          paging: false,
          filled: rows.length === PRODUCT_PAGE,
          error: null,
        }));
      } catch (error) {
        if (token !== readToken.current) return;
        const text = messageOf(error);
        setPage((current) => ({ ...current, loading: false, paging: false, error: text }));
        notify("products", "bad", `${text} The rows on screen are the last good read.`);
      }
    },
    [notify],
  );

  const applyFilters = useCallback(
    (next: ProductFilters) => {
      setFilters(next);
      void readProducts(next, 0, false);
    },
    [readProducts],
  );

  const loadMore = useCallback(() => {
    void readProducts(filters, products.length, true);
  }, [filters, products.length, readProducts]);

  const reloadProducts = useCallback(() => {
    void readProducts(filters, 0, false);
  }, [filters, readProducts]);

  const createProduct = useCallback(
    async (body: ProductPatch): Promise<Result<Product>> => {
      mark("product:create", true);
      try {
        const created = await apiSend<Product>("products", body);
        setProducts((current) => [created, ...current]);
        remember({ tab: "products", kind: "product", id: created.id, label: created.name });
        notify("products", "ok", `Filed ${created.name}. It is live on the storefront.`);
        return { ok: true, row: created };
      } catch (error) {
        return { ok: false, message: messageOf(error) };
      } finally {
        mark("product:create", false);
      }
    },
    [mark, notify, remember],
  );

  const saveProduct = useCallback(
    async (id: number, body: ProductPatch, detail: string): Promise<Result<Product>> => {
      mark(`product:${id}`, true);
      try {
        const row = await apiSend<Product>(`products/${id}`, body, "PATCH");
        patchRow(row);
        remember({ tab: "products", kind: "product", id, label: row.name });
        notify("products", "ok", `Saved ${row.name}. ${detail}`);
        return { ok: true, row };
      } catch (error) {
        return { ok: false, message: `${messageOf(error)} ${detail}` };
      } finally {
        mark(`product:${id}`, false);
      }
    },
    [mark, notify, patchRow, remember],
  );

  const reveal = useCallback(
    async (id: number, name: string): Promise<Done> => {
      mark(`product:${id}`, true);
      try {
        const row = await apiSend<Product>(`products/${id}`, { is_active: true }, "PATCH");
        patchRow(row);
        remember({ tab: "products", kind: "product", id, label: row.name });
        notify("products", "ok", `${name} is back on the storefront.`);
        return { ok: true };
      } catch (error) {
        notify("products", "bad", `${messageOf(error)} ${name} is still hidden.`);
        return { ok: false, message: messageOf(error) };
      } finally {
        mark(`product:${id}`, false);
      }
    },
    [mark, notify, patchRow, remember],
  );

  /** Soft delete. The row stays in the console with `is_active = false`, keeps
   *  its slug, and simply stops being served to the storefront. */
  const hideProduct = useCallback(
    async (id: number, name: string): Promise<Done> => {
      mark(`product:${id}`, true);
      try {
        await apiSend<void>(`products/${id}`, undefined, "DELETE");
        setProducts((current) =>
          current.map((product) =>
            product.id === id ? { ...product, is_active: false } : product,
          ),
        );
        remember({ tab: "products", kind: "product", id, label: name });
        notify(
          "products",
          "ok",
          `${name} is hidden from the storefront, not destroyed. Its slug stays reserved.`,
          { label: "Show it again", run: () => void reveal(id, name) },
        );
        return { ok: true };
      } catch (error) {
        return { ok: false, message: `${messageOf(error)} ${name} is still on the shelf.` };
      } finally {
        mark(`product:${id}`, false);
      }
    },
    [mark, notify, remember, reveal],
  );

  /* ------------------------------------------------------------ categories */

  const reloadCategories = useCallback(async (): Promise<Done> => {
    mark("categories:read", true);
    try {
      setCategories(await apiGet<Category[]>("categories"));
      return { ok: true };
    } catch (error) {
      notify("categories", "bad", `${messageOf(error)} The aisles on screen are the last good read.`);
      return { ok: false, message: messageOf(error) };
    } finally {
      mark("categories:read", false);
    }
  }, [mark, notify]);

  const createCategory = useCallback(
    async (body: { name: string; slug: string; description: string | null }): Promise<Result<Category>> => {
      mark("category:create", true);
      try {
        const created = await apiSend<Category>("categories", body);
        setCategories((current) =>
          [...current, created].sort((left, right) => left.name.localeCompare(right.name)),
        );
        remember({ tab: "categories", kind: "category", id: created.id, label: created.name });
        notify("categories", "ok", `Added ${created.name}.`);
        return { ok: true, row: created };
      } catch (error) {
        return { ok: false, message: messageOf(error) };
      } finally {
        mark("category:create", false);
      }
    },
    [mark, notify, remember],
  );

  const saveCategory = useCallback(
    async (id: number, body: CategoryPatch): Promise<Result<Category>> => {
      mark(`category:${id}`, true);
      try {
        const row = await apiSend<Category>(`categories/${id}`, body, "PATCH");
        setCategories((current) =>
          current
            .map((category) => (category.id === row.id ? row : category))
            .sort((left, right) => left.name.localeCompare(right.name)),
        );
        remember({ tab: "categories", kind: "category", id, label: row.name });
        notify("categories", "ok", `Saved ${row.name}.`);
        return { ok: true, row };
      } catch (error) {
        return { ok: false, message: messageOf(error) };
      } finally {
        mark(`category:${id}`, false);
      }
    },
    [mark, notify, remember],
  );

  const deleteCategory = useCallback(
    async (id: number, name: string): Promise<Done> => {
      mark(`category:${id}`, true);
      try {
        await apiSend<void>(`categories/${id}`, undefined, "DELETE");
        setCategories((current) => current.filter((category) => category.id !== id));
        notify("categories", "ok", `Removed ${name}. Pieces you filed here now read as unfiled.`);
        return { ok: true };
      } catch (error) {
        const message = messageOf(error);
        notify("categories", "bad", `${message} ${name} is still on the shelf.`, {
          label: `Show the pieces filed under ${name}`,
          run: () => {
            void applyFilters({ search: "", categoryId: id });
            goTo({ tab: "products", kind: "category", id, label: name });
          },
        });
        return { ok: false, message };
      } finally {
        mark(`category:${id}`, false);
      }
    },
    [applyFilters, goTo, mark, notify],
  );

  /* ---------------------------------------------------------------- orders */

  const reloadOrders = useCallback(async (): Promise<Done> => {
    mark("orders:read", true);
    try {
      const rows = await apiGet<Order[]>("admin/orders");
      setOrders(rows);
      notify("orders", "info", `Queue re-read. ${rows.length} order${rows.length === 1 ? "" : "s"} on file.`);
      return { ok: true };
    } catch (error) {
      notify("orders", "bad", `${messageOf(error)} The queue on screen is the last good read.`);
      return { ok: false, message: messageOf(error) };
    } finally {
      mark("orders:read", false);
    }
  }, [mark, notify]);

  /** Optimistic: the row moves now and snaps back with the API's own reason. */
  const moveOrder = useCallback(
    async (order: Order, target: OrderTarget): Promise<Result<Order>> => {
      const key = `order:${order.id}`;
      const before: OrderStatus = order.status;
      mark(key, true);
      setOrders((current) =>
        current.map((item) => (item.id === order.id ? { ...item, status: target } : item)),
      );
      try {
        const row = await apiSend<Order>(
          `admin/orders/${order.id}/status`,
          { status: target },
          "PATCH",
        );
        setOrders((current) => current.map((item) => (item.id === row.id ? row : item)));
        remember({ tab: "orders", kind: "order", id: row.id, label: orderRef(row.id) });
        notify(
          "orders",
          "ok",
          `Order ${orderRef(row.id)} is now ${row.status}.` +
            (target === "cancelled" ? " Stock for its lines went back on the shelf." : ""),
        );
        return { ok: true, row };
      } catch (error) {
        setOrders((current) =>
          current.map((item) => (item.id === order.id ? { ...item, status: before } : item)),
        );
        return {
          ok: false,
          message: `${messageOf(error)} Order ${orderRef(order.id)} is back to ${before}. Reload the queue if you think it moved under you.`,
        };
      } finally {
        mark(key, false);
      }
    },
    [mark, notify, remember],
  );

  return {
    profile: seed.profile,
    products,
    categories,
    orders,
    filters,
    page,
    busy,
    notices,
    noticesFor: (scope: NoticeScope) => notices.filter((notice) => notice.scope === scope),
    lastRow,
    wanted,
    isBusy: (key: string) => Boolean(busy[key]),
    busyCount: Object.keys(busy).length,
    notify,
    dismiss,
    mark,
    readProducts,
    applyFilters,
    loadMore,
    reloadProducts,
    createProduct,
    saveProduct,
    hideProduct,
    reveal,
    patchRow,
    reloadCategories,
    createCategory,
    saveCategory,
    deleteCategory,
    reloadOrders,
    moveOrder,
    remember,
    goTo,
    clearWanted,
    categoryName: (id: number | null) => categoryNameById(categories, id),
  };
}

export type ConsoleStore = ReturnType<typeof useConsoleStore>;
