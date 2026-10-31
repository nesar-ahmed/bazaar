import { NextResponse } from "next/server";

import type { TokenPair, UserProfile } from "@/lib/api-types";
import { getApiUrl } from "@/lib/auth";
import {
  backendErrorMessage,
  backendFieldErrors,
  isSameOriginRequest,
} from "@/lib/auth-response";
import { applySessionCookies } from "@/lib/session-cookies";

type RegistrationInput = {
  email?: string;
  full_name?: string;
  password?: string;
};

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  let input: RegistrationInput;
  try {
    input = (await request.json()) as RegistrationInput;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const apiUrl = getApiUrl();
  try {
    const registration = await fetch(`${apiUrl}/api/v1/users/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!registration.ok) {
      const fields = await backendFieldErrors(registration);
      return NextResponse.json(
        {
          error: await backendErrorMessage(registration),
          fields,
        },
        { status: registration.status >= 500 ? 503 : registration.status },
      );
    }

    const user = (await registration.json()) as UserProfile;

    // Sign the new account straight in, merging any guest bag it carried.
    const cartToken = request.headers.get("x-cart-token");
    const login = await fetch(`${apiUrl}/api/v1/users/login`, {
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
        {
          error: "Your account was created, but sign-in failed. Please sign in.",
          created: true,
        },
        { status: 502 },
      );
    }

    const tokens = (await login.json()) as TokenPair;
    const response = NextResponse.json(
      { user, role: user.role, cart_merge_warnings: tokens.cart_merge_warnings },
      { status: 201 },
    );
    applySessionCookies(response, tokens, user.role);
    return response;
  } catch {
    return NextResponse.json(
      { error: "The account service is unreachable. Please try again." },
      { status: 503 },
    );
  }
}
