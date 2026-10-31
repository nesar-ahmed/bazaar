import { NextResponse } from "next/server";

import { callBackend } from "@/lib/backend-proxy";
import { backendErrorMessage, isSameOriginRequest } from "@/lib/auth-response";

export async function GET() {
  try {
    const response = await callBackend({ path: "users/me", method: "GET" });
    if (!response.ok) {
      return NextResponse.json(
        { error: await backendErrorMessage(response) },
        { status: response.status >= 500 ? 503 : response.status },
      );
    }
    return NextResponse.json(await response.json());
  } catch {
    return NextResponse.json(
      { error: "The account service is unreachable. Please try again." },
      { status: 503 },
    );
  }
}

export async function PATCH(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  let input: { full_name: string };
  try {
    input = (await request.json()) as { full_name: string };
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    const response = await callBackend({
      path: "users/me",
      method: "PATCH",
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      return NextResponse.json(
        { error: await backendErrorMessage(response) },
        { status: response.status >= 500 ? 503 : response.status },
      );
    }
    return NextResponse.json(await response.json());
  } catch {
    return NextResponse.json(
      { error: "The account service is unreachable. Please try again." },
      { status: 503 },
    );
  }
}
