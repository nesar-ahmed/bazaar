import { NextResponse } from "next/server";

import type { TokenPair } from "@/lib/api-types";
import { getApiUrl } from "@/lib/auth";
import { backendErrorMessage, isSameOriginRequest } from "@/lib/auth-response";
import { applySessionCookies, fetchRole } from "@/lib/session-cookies";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  let input: { email?: string; password?: string };
  try {
    input = (await request.json()) as { email?: string; password?: string };
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    const cartToken = request.headers.get("x-cart-token");
    const login = await fetch(`${getApiUrl()}/api/v1/users/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cartToken ? { "X-Cart-Token": cartToken } : {}),
      },
      body: JSON.stringify({ email: input.email, password: input.password }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!login.ok) {
      return NextResponse.json(
        { error: await backendErrorMessage(login) },
        { status: login.status >= 500 ? 503 : login.status },
      );
    }

    const tokens = (await login.json()) as TokenPair;
    const role = await fetchRole(tokens.access_token);
    const response = NextResponse.json({
      ok: true,
      role,
      cart_merge_warnings: tokens.cart_merge_warnings,
    });
    applySessionCookies(response, tokens, role);
    return response;
  } catch {
    return NextResponse.json(
      { error: "The account service is unreachable. Please try again." },
      { status: 503 },
    );
  }
}
