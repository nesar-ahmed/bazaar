import { NextResponse } from "next/server";

import { getAccessToken, getApiUrl } from "@/lib/auth";
import { backendErrorMessage, isSameOriginRequest } from "@/lib/auth-response";

export async function GET() {
  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ error: "Sign in to view your profile." }, { status: 401 });
  }

  try {
    const response = await fetch(`${getApiUrl()}/api/v1/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
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

export async function PATCH(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ error: "Sign in to update your profile." }, { status: 401 });
  }

  let input: { full_name: string };
  try {
    input = (await request.json()) as { full_name: string };
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    const response = await fetch(`${getApiUrl()}/api/v1/users/me`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
      cache: "no-store",
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
