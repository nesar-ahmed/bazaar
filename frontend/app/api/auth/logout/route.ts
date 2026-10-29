import { NextResponse } from "next/server";

import { ACCESS_TOKEN_COOKIE } from "@/lib/auth";
import { isSameOriginRequest } from "@/lib/auth-response";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ACCESS_TOKEN_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
