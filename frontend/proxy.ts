import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  ROLE_COOKIE,
  safeRedirectTarget,
  signInUrl,
} from "@/lib/auth";

const PROTECTED = ["/account", "/checkout", "/orders"];
const MEMBER_ONLY_ROUTES = ["/login", "/register"];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const signedIn = Boolean(
    request.cookies.get(ACCESS_TOKEN_COOKIE)?.value ||
      request.cookies.get(REFRESH_TOKEN_COOKIE)?.value,
  );
  const role = request.cookies.get(ROLE_COOKIE)?.value ?? null;
  const target = request.nextUrl.searchParams.get("next");

  if (PROTECTED.some((route) => pathname.startsWith(route)) && !signedIn) {
    // Middleware only checks cookie presence; the backend is the authority on
    // every data read. This just avoids rendering a screen that cannot load.
    return NextResponse.redirect(new URL(signInUrl(target || `${pathname}${search}`), request.url));
  }

  if (MEMBER_ONLY_ROUTES.includes(pathname) && signedIn) {
    const onward = safeRedirectTarget(target);
    return NextResponse.redirect(new URL(onward ?? "/account", request.url));
  }

  if (pathname.startsWith("/admin")) {
    if (!signedIn) {
      return NextResponse.redirect(new URL(signInUrl(pathname), request.url));
    }
    if (role && role !== "admin") {
      return NextResponse.redirect(new URL("/account?error=not-admin", request.url));
    }
    // role hint missing: render, and let the server component verify for real.
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/account",
    "/checkout",
    "/orders/:path*",
    "/admin/:path*",
    "/login",
    "/register",
  ],
};
