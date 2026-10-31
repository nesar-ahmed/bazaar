import { NextResponse } from "next/server";

import { getApiUrl } from "@/lib/auth";

/** Liveness of the FastAPI service, surfaced in the admin console and the
 *  storefront status rail. */
export async function GET() {
  try {
    const response = await fetch(`${getApiUrl()}/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    const body = (await response.json()) as { status?: string };
    return NextResponse.json({
      ok: response.ok && body.status === "ok",
      base_url: getApiUrl(),
      checked_at: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { ok: false, base_url: getApiUrl(), checked_at: new Date().toISOString() },
      { status: 503 },
    );
  }
}
