import type { Category } from "@/lib/api-types";
import { PRICE_RE, SLUG_RE } from "./validate";

export const PRODUCT_NAME_MAX = 180;
export const CATEGORY_NAME_MAX = 120;
export const CATEGORY_DESCRIPTION_MAX = 500;
export const IMAGE_URL_MAX = 500;

export type DraftForm = {
  name: string;
  slug: string;
  price: string;
  stock: string;
  description: string;
  image: string;
  categoryId: number | null;
};

export type DraftErrors = Partial<
  Record<"name" | "slug" | "price" | "stock" | "description" | "image" | "categoryId", string>
>;

/** Client-side mirror of the server rules, so the fix is named before a round trip. */
export function validateDraft(draft: DraftForm): DraftErrors {
  const errors: DraftErrors = {};
  const name = draft.name.trim();
  const slug = draft.slug.trim();
  const price = draft.price.trim();
  const stock = draft.stock.trim();
  const image = draft.image.trim();

  if (!name) errors.name = "A name is required.";
  else if (name.length > PRODUCT_NAME_MAX) errors.name = `Keep the name to ${PRODUCT_NAME_MAX} characters.`;

  if (!slug) errors.slug = "A slug is required to publish the page.";
  else if (!SLUG_RE.test(slug)) errors.slug = "Use lowercase letters, numbers and single hyphens.";

  if (!price) errors.price = "Set a price, or 0 if the piece is not for sale.";
  else if (!PRICE_RE.test(price)) errors.price = "Use digits and up to two decimals, like 42.00.";

  if (stock === "") errors.stock = "Stock is required. Enter 0 if there are none.";
  else if (!/^\d+$/.test(stock)) errors.stock = "Whole units only, 0 or more.";

  if (image.length > IMAGE_URL_MAX) errors.image = `Keep the image URL to ${IMAGE_URL_MAX} characters.`;
  else if (image && !/^https?:\/\/\S+$/i.test(image)) errors.image = "Use a full http(s) URL.";

  return errors;
}

export function hasErrors(errors: Record<string, string | undefined>): boolean {
  return Object.values(errors).some(Boolean);
}

/** Puts the API's clash message under the field that most likely caused it. */
export function assignClash(message: string, errors: DraftErrors): DraftErrors {
  const lower = message.toLowerCase();
  if (lower.includes("slug")) return { ...errors, slug: message };
  if (lower.includes("name")) return { ...errors, name: message };
  return errors;
}

export function assignCategoryClash(
  message: string,
  errors: CategoryErrors,
): CategoryErrors {
  const lower = message.toLowerCase();
  if (lower.includes("slug")) return { ...errors, slug: message };
  if (lower.includes("name")) return { ...errors, name: message };
  return errors;
}

/* ---------------------------------------------------------------- categories */

export type CategoryForm = { name: string; slug: string; description: string };

export type CategoryErrors = Partial<Record<"name" | "slug" | "description", string>>;

export function validateCategory(form: CategoryForm): CategoryErrors {
  const errors: CategoryErrors = {};
  const name = form.name.trim();
  const slug = form.slug.trim();

  if (!name) errors.name = "Name the aisle.";
  else if (name.length > CATEGORY_NAME_MAX)
    errors.name = `Keep the name to ${CATEGORY_NAME_MAX} characters.`;

  if (!slug) errors.slug = "A slug is required.";
  else if (!SLUG_RE.test(slug)) errors.slug = "Use lowercase letters, numbers and single hyphens.";

  if (form.description.trim().length > CATEGORY_DESCRIPTION_MAX)
    errors.description = `Keep the note to ${CATEGORY_DESCRIPTION_MAX} characters.`;

  return errors;
}

export function createCategoryBody(form: CategoryForm) {
  return {
    name: form.name.trim(),
    slug: form.slug.trim(),
    description: form.description.trim() || null,
  };
}

/** PATCH partial body: only the keys the operator changed. */
export function changeCategoryBody(current: Category, form: CategoryForm) {
  const body: Record<string, string | null> = {};
  if (form.name.trim() !== current.name) body.name = form.name.trim();
  if (form.slug.trim() !== current.slug) body.slug = form.slug.trim();
  if (form.description.trim() !== (current.description ?? "")) {
    body.description = form.description.trim() || null;
  }
  return body;
}
