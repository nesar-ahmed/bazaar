import { NextResponse } from "next/server";

import { ACCESS_TOKEN_COOKIE, getApiUrl } from "@/lib/auth";
import { backendErrorMessage, isSameOriginRequest } from "@/lib/auth-response";

type RegistrationInput = {
  email: string;
  full_name: string;
  password: string;
};

type TokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

type UserProfile = {
  id: number;
  email: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
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

  try {
    const apiUrl = getApiUrl();
    const registration = await fetch(`${apiUrl}/api/v1/users/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      cache: "no-store",
    });
    if (!registration.ok) {
      return NextResponse.json(
        { error: await backendErrorMessage(registration) },
        { status: registration.status >= 500 ? 503 : registration.status },
      );
    }

    const login = await fetch(`${apiUrl}/api/v1/users/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: input.email, password: input.password }),
      cache: "no-store",
    });
    if (!login.ok) {
      return NextResponse.json(
        { error: "Your account was created, but sign-in failed. Please sign in." },
        { status: 502 },
      );
    }

    const [user, token] = (await Promise.all([
      registration.json(),
      login.json(),
    ])) as [UserProfile, TokenResponse];

    const response = NextResponse.json({ user }, { status: 201 });
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
