import "server-only";

import { cache } from "react";

import { backendJson, callBackend } from "@/lib/backend-proxy";
import { getApiUrl } from "@/lib/auth";
import { buildProductQuery } from "@/lib/catalog-utils";
import type {
  Category,
  Health,
  Order,
  Product,
  ProductQuery,
  UserProfile,
} from "@/lib/api-types";

/** Reads that never vary by cookie go straight to FastAPI and are revalidated
 *  when an admin mutates the catalog. Authenticated reads use the proxy. */
async function publicJson<T>(path: string, notFoundOk = false): Promise<T | null> {
  try {
    const response = await fetch(`${getApiUrl()}/api/v1/${path}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (response.status === 404 && notFoundOk) return null;
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function getProducts(
  query: ProductQuery = {},
): Promise<Product[]> {
  return (await publicJson<Product[]>(buildProductQuery(query))) ?? [];
}

export const getProduct = cache(async (slug: string): Promise<Product | null> =>
  publicJson<Product>(`products/${encodeURIComponent(slug)}`, true),
);

export const getCategories = cache(
  async (): Promise<Category[]> => (await publicJson<Category[]>("categories")) ?? [],
);

export async function getHealth(): Promise<Health | null> {
  try {
    const response = await fetch(`${getApiUrl()}/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) return null;
    const body: unknown = await response.json();
    return typeof body === "object" && body !== null && "status" in body && body.status === "ok"
      ? { status: "ok" }
      : null;
  } catch {
    return null;
  }
}

/** --- session-bound reads ------------------------------------------------ */

export const getProfile = cache(
  async (): Promise<UserProfile | null> => {
    try {
      return await backendJson<UserProfile>({ path: "users/me", allowRefresh: true });
    } catch {
      return null;
    }
  },
);

export async function getOrders(): Promise<Order[]> {
  try {
    return await backendJson<Order[]>({ path: "orders" });
  } catch {
    return [];
  }
}

export async function getOrder(id: string | number): Promise<Order | null> {
  try {
    return await backendJson<Order>({ path: `orders/${id}` });
  } catch {
    return null;
  }
}

export async function getAdminOrders(): Promise<Order[]> {
  try {
    return await backendJson<Order[]>({ path: "admin/orders" });
  } catch {
    return [];
  }
}

/** Admin lists must be live, never cached: an operator edits and reloads. */
export async function getAdminProducts(limit = 100): Promise<Product[]> {
  try {
    const response = await callBackend({
      path: `admin/products?limit=${Math.min(100, Math.max(1, limit))}`,
    });
    if (!response.ok) return [];
    return (await response.json()) as Product[];
  } catch {
    return [];
  }
}

export async function getAdminCategories(): Promise<Category[]> {
  try {
    const response = await callBackend({ path: "categories" });
    if (!response.ok) return [];
    return (await response.json()) as Category[];
  } catch {
    return [];
  }
}

/** The catalog list is a bare array with no total, so a full page means
 *  "there may be more". */
export const CATALOG_PAGE = 24;
