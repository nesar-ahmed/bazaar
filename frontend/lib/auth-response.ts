export async function backendErrorMessage(response: Response): Promise<string> {
  if (response.status >= 500) {
    return "The account service is temporarily unavailable. Please try again.";
  }

  const body: unknown = await response.json().catch(() => null);
  if (
    typeof body === "object" &&
    body !== null &&
    "detail" in body &&
    typeof body.detail === "string"
  ) {
    return body.detail;
  }

  if (response.status === 422) {
    return "Please check the information you entered and try again.";
  }
  if (response.status === 401) {
    return "The email or password is incorrect.";
  }
  if (response.status === 409) {
    return "An account with this email already exists.";
  }
  return "We could not complete your request. Please try again.";
}

export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) return false;

  const forwardedProtocol = request.headers.get("x-forwarded-proto");
  const protocol =
    forwardedProtocol?.split(",")[0]?.trim() ??
    new URL(request.url).protocol.replace(":", "");
  const expectedOrigin = process.env.APP_ORIGIN ?? `${protocol}://${host}`;
  try {
    return new URL(origin).origin === new URL(expectedOrigin).origin;
  } catch {
    return false;
  }
}
