/** Field-level messages for the browser, derived from FastAPI error bodies. */

export type FieldErrors = Record<string, string>;

export async function backendErrorMessage(response: Response): Promise<string> {
  if (response.status >= 500) {
    return "The Bazaar service is temporarily unavailable. Please try again.";
  }

  const body: unknown = await response.json().catch(() => null);
  const detail = (body as { detail?: unknown } | null)?.detail;

  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const first = detail[0] as { msg?: string } | undefined;
    if (first?.msg) return friendlyValidation(first.msg);
  }

  if (response.status === 422) {
    return "Please check the highlighted fields and try again.";
  }
  if (response.status === 401) {
    return "The email or password is incorrect.";
  }
  if (response.status === 409) {
    return "That record already exists.";
  }
  return "We could not complete your request. Please try again.";
}

/** Turn a Pydantic validation message into something a person can act on. */
export function friendlyValidation(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("field required")) return "This field is required.";
  if (lower.includes("string too short")) return "Too short.";
  if (lower.includes("string too long")) return "Too long.";
  if (lower.includes("invalid email")) return "Enter a valid email address.";
  if (lower.includes("not a valid")) return "Enter a valid value.";
  if (lower.includes("json")) return "The request could not be read.";
  return message;
}

/** Map `detail[{loc}]` onto our form field names. */
export async function backendFieldErrors(response: Response): Promise<FieldErrors> {
  const body: unknown = await response.json().catch(() => null);
  const detail = (body as { detail?: unknown } | null)?.detail;
  if (!Array.isArray(detail)) return {};

  const errors: FieldErrors = {};
  for (const issue of detail) {
    const entry = issue as { loc?: unknown[]; msg?: string };
    const name = entry.loc?.filter((part) => part !== "body").join(".");
    if (!name || errors[name] || !entry.msg) continue;
    errors[name] = friendlyValidation(entry.msg);
  }
  return errors;
}

/** CSRF-style guard for our own cookie-authenticated route handlers. */
export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
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
