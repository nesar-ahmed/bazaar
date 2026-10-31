import { NextResponse } from "next/server";

import { revokeBackendSession } from "@/lib/backend-proxy";
import { isSameOriginRequest } from "@/lib/auth-response";
import { clearSessionCookies } from "@/lib/session-cookies";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  let revocationFailed = false;
  try {
    await revokeBackendSession();
  } catch {
    revocationFailed = true;
  }

  const response = NextResponse.json({
    ok: true,
    server_revocation_confirmed: !revocationFailed,
    ...(revocationFailed
      ? {
          warning:
            "You are signed out here, but Bazaar could not confirm the server-side revocation.",
        }
      : {}),
  });
  clearSessionCookies(response);
  return response;
}
