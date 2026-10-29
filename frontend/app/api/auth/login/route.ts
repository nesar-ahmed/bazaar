import { NextResponse } from "next/server";

import { ACCESS_TOKEN_COOKIE, getApiUrl } from "@/lib/auth";
import { backendErrorMessage, isSameOriginRequest } from "@/lib/auth-response";

type LoginInput = {
  email: string;
  password: string;
};

type TokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  let input: LoginInput;
  try {
    input = (await request.json()) as LoginInput;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    const login = await fetch(`${getApiUrl()}/api/v1/users/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      cache: "no-store",
    });
    if (!login.ok) {
      return NextResponse.json(
        { error: await backendErrorMessage(login) },
        { status: login.status >= 500 ? 503 : login.status },
      );
    }

    const token = (await login.json()) as TokenResponse;
    const response = NextResponse.json({ ok: true });
    response.cookies.set(ACCESS_TOKEN_COOKIE, token.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: token.expires_in,
    });
    return response;
  } catch {
    return NextResponse.json(
      { error: "The account service is unreachable. Please try again." },
      { status: 503 },
    );
  }
}
