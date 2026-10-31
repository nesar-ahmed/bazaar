import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import type { UserProfile } from "@/lib/api-types";
import { backendErrorMessage, isSameOriginRequest } from "@/lib/auth-response";
import { callBackend, writeRoleHint } from "@/lib/backend-proxy";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

function isAllowed(path: string[], method: string): boolean {
  const key = path.join("/");
  if (key === "categories") return method === "GET" || method === "POST";
  if (key === "products") return method === "GET" || method === "POST";
  if (key === "cart") return method === "GET";
  if (key === "cart/items") return method === "POST";
  if (key === "orders") return method === "GET" || method === "POST";
  if (key === "admin/products") return method === "GET";
  if (key === "admin/orders") return method === "GET";
  if (key === "users/me") return method === "GET" || method === "PATCH";
  if (key === "users/change-password") return method === "POST";
  if (/^categories\/\d+$/.test(key)) {
    return method === "PATCH" || method === "DELETE";
  }
  if (path[0] === "products" && path.length === 2) {
    if (method === "GET") return true;
    return /^\d+$/.test(path[1]) && (method === "PATCH" || method === "DELETE");
  }
  if (/^cart\/items\/\d+$/.test(key)) {
    return method === "PATCH" || method === "DELETE";
  }
  if (/^orders\/\d+$/.test(key)) return method === "GET";
  if (/^orders\/\d+\/cancel$/.test(key)) return method === "POST";
  if (/^admin\/orders\/\d+\/status$/.test(key)) return method === "PATCH";
  return false;
}

/** Catalog edits invalidate the storefront's cached reads. */
function revalidateCatalog(path: string[]) {
  if (path[0] !== "products" && path[0] !== "categories") return;
  revalidatePath("/", "layout");
}

async function handle(request: Request, context: RouteContext) {
  const { path } = await context.params;
  const method = request.method.toUpperCase();
  if (!isAllowed(path, method)) {
    return NextResponse.json({ error: "API endpoint not found." }, { status: 404 });
  }
  if (method !== "GET" && !isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const query = new URL(request.url).search;
  const endpoint = `${path.map(encodeURIComponent).join("/")}${query}`;
  const body = method === "GET" ? undefined : await request.text();
  try {
    const backend = await callBackend({
      path: endpoint,
      method,
      body: body || undefined,
      cartToken: request.headers.get("x-cart-token"),
    });
    if (backend.status === 204) return new NextResponse(null, { status: 204 });

    const payload: unknown = await backend.json().catch(() => null);
    if (!backend.ok) {
      return NextResponse.json(
        { error: await backendErrorMessage(backend) },
        { status: backend.status >= 500 ? 503 : backend.status },
      );
    }

    // Warm the middleware's role hint from an authoritative read.
    if (path.join("/") === "users/me" && method === "GET") {
      const role = (payload as UserProfile)?.role;
      if (role) await writeRoleHint(role);
    }
    if (method !== "GET") revalidateCatalog(path);

    return NextResponse.json(payload, {
      status: backend.status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "The Bazaar service is unreachable. Please try again." },
      { status: 503 },
    );
  }
}

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const DELETE = handle;
