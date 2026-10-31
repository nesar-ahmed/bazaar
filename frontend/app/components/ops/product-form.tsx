"use client";

import { useState } from "react";
import type { FormEvent } from "react";

import { Button } from "@/app/components/ui/button";
import { Check, TextInput } from "@/app/components/ui/field";
import { Alert } from "@/app/components/ui/display";
import { Icon } from "@/app/components/ui/icons";
import type { Category, Product } from "@/lib/api-types";
import { toCents, toDecimalInput } from "@/lib/format";

import { CategoryField, MoneyField, NotesField, SlugField, StockField } from "./controls";
import {
  assignClash,
  hasErrors,
  IMAGE_URL_MAX,
  PRODUCT_NAME_MAX,
  validateDraft,
  type DraftErrors,
  type DraftForm,
} from "./forms";
import type { ProductPatch } from "./types";
import type { Done } from "./use-console-store";
import { slugify } from "./validate";

export type FormValues = DraftForm & { isActive: boolean };

export function valuesFromProduct(product: Product): FormValues {
  return {
    name: product.name,
    slug: product.slug,
    price: toDecimalInput(product.price_cents),
    stock: String(product.inventory_quantity),
    description: product.description ?? "",
    image: product.image_url ?? "",
    categoryId: product.category_id,
    isActive: product.is_active,
  };
}

export const EMPTY_VALUES: FormValues = {
  name: "",
  slug: "",
  price: "",
  stock: "",
  description: "",
  image: "",
  categoryId: null,
  isActive: true,
};

function createBody(values: FormValues): ProductPatch {
  return {
    name: values.name.trim(),
    slug: values.slug.trim(),
    description: values.description.trim() || null,
    price_cents: toCents(values.price.trim()),
    inventory_quantity: Number(values.stock.trim()),
    image_url: values.image.trim() || null,
    category_id: values.categoryId,
  };
}

/** PATCH body: only the keys the operator actually changed. */
function changeBody(original: Product, values: FormValues): ProductPatch {
  const body: ProductPatch = {};
  const name = values.name.trim();
  const slug = values.slug.trim();
  const description = values.description.trim();
  const image = values.image.trim();

  if (name !== original.name) body.name = name;
  if (slug !== original.slug) body.slug = slug;
  if (description !== (original.description ?? "")) body.description = description || null;
  if (values.price.trim() && toCents(values.price.trim()) !== original.price_cents) {
    body.price_cents = toCents(values.price.trim());
  }
  if (values.stock.trim() !== "" && Number(values.stock.trim()) !== original.inventory_quantity) {
    body.inventory_quantity = Number(values.stock.trim());
  }
  if (image !== (original.image_url ?? "")) body.image_url = image || null;
  if (values.categoryId !== original.category_id) body.category_id = values.categoryId;
  if (values.isActive !== original.is_active) body.is_active = values.isActive;

  return body;
}

/**
 * One form for both jobs: filing a new piece and editing a held row. It
 * validates before the network, keeps every value when the write fails, and
 * only clears itself after a successful create has resolved.
 */
export function ProductForm({
  categories,
  original = null,
  submitLabel,
  onSubmit,
  onCancel,
  busy = false,
  className,
}: {
  categories: Category[];
  original?: Product | null;
  submitLabel: string;
  onSubmit: (body: ProductPatch) => Promise<Done>;
  onCancel?: () => void;
  busy?: boolean;
  className?: string;
}) {
  const [values, setValues] = useState<FormValues>(
    original ? valuesFromProduct(original) : EMPTY_VALUES,
  );
  const [errors, setErrors] = useState<DraftErrors>({});
  const [clash, setClash] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  function set<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    if (key !== "isActive") setErrors((current) => ({ ...current, [key]: undefined }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setClash(null);

    const found = validateDraft(values);
    setErrors(found);
    if (hasErrors(found)) return;

    const body = original ? changeBody(original, values) : createBody(values);
    if (original && Object.keys(body).length === 0) {
      setClash("Nothing changed yet. Edit a field first.");
      return;
    }

    setSending(true);
    const result = await onSubmit(body);
    setSending(false);

    if (result.ok) {
      // Cleared only after the write resolved, so a failure never costs typing.
      if (!original) {
        setValues(EMPTY_VALUES);
        setErrors({});
      }
      return;
    }

    setClash(result.message);
    setErrors((current) => assignClash(result.message, current));
  }

  const disabled = busy || sending;

  return (
    <form className={className} noValidate onSubmit={(event) => void submit(event)}>
      <div className="ops-form">
        <TextInput
          label="Name"
          required
          value={values.name}
          maxLength={PRODUCT_NAME_MAX}
          error={errors.name}
          disabled={disabled}
          onChange={(event) => set("name", event.target.value)}
        />

        <SlugField
          label="Slug"
          value={values.slug}
          error={errors.slug}
          onChange={(value) => set("slug", value)}
          onGenerate={() => set("slug", slugify(values.name))}
        />

        <MoneyField
          label="Price"
          value={values.price}
          error={errors.price}
          hint="Two decimals. Converted to integer cents on the way to the API."
          onChange={(value) => set("price", value)}
        />

        <StockField
          value={values.stock}
          error={errors.stock}
          onChange={(value) => set("stock", value)}
        />

        <CategoryField
          categories={categories}
          value={values.categoryId}
          error={errors.categoryId}
          onChange={(value) => set("categoryId", value)}
        />

        <TextInput
          label="Image URL"
          optional
          className="ops-field--wide"
          inputMode="url"
          maxLength={IMAGE_URL_MAX}
          placeholder="https://…"
          error={errors.image}
          hint="A full http(s) link. Leave empty for the monogram tile."
          disabled={disabled}
          value={values.image}
          onChange={(event) => set("image", event.target.value)}
        />

        <div className="ops-field--wide">
          <NotesField
            value={values.description}
            error={errors.description}
            hint="Plain text. Sold-out copy is a stock problem, not a description problem."
            onChange={(value) => set("description", value)}
          />
        </div>

        {original ? (
          <div className="ops-field--wide ops-switch">
            <Check
              label="Visible on the storefront"
              checked={values.isActive}
              disabled={disabled}
              onChange={(event) => set("isActive", event.target.checked)}
            />
            <span className="tiny muted">
              Turning this off is what “remove” does. The row, its stock and its slug all stay.
            </span>
          </div>
        ) : null}
      </div>

      {clash ? (
        <Alert tone="error" className="ops-form__alert">
          {clash}
        </Alert>
      ) : null}

      <div className="ops-form__foot">
        <Button type="submit" variant="cta" loading={sending} disabled={busy}>
          {submitLabel}
        </Button>
        {onCancel ? (
          <Button variant="quiet" onClick={onCancel} disabled={sending}>
            Cancel
          </Button>
        ) : null}
        <p className="ops-form__hint tiny muted">
          <Icon.Info size={14} /> Required: name, slug, price, stock. Aisle may stay unfiled.
        </p>
      </div>
    </form>
  );
}
