import { ApiError } from "@/lib/client-api";
import { SLUG_PATTERN } from "@/lib/api-types";

/** The server enforces `^[a-z0-9]+(?:-[a-z0-9]+)*$`. The console checks first so
 *  the fix is named before a round trip, and the same pattern string is reused. */
export const SLUG_RE = new RegExp(`^${SLUG_PATTERN}$`);

export const PRICE_RE = /^\d{1,10}(\.\d{1,2})?$/;

export const SLUG_HINT = "Lowercase letters, numbers and single hyphens, like linen-throw-sand.";

/** Slug-safe reading of a name, behind "generate from name". */
export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180);
}

/** The message the API carried, or an honest fallback that says what to do. */
export function messageOf(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return "The console could not reach Bazaar. Nothing was saved. Try again in a moment.";
}
