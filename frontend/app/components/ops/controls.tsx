"use client";

import { useId } from "react";
import type { FormHTMLAttributes, ReactNode } from "react";

import { Button, IconBtn } from "@/app/components/ui/button";
import { Field, Select, TextArea, TextInput } from "@/app/components/ui/field";
import type { Category } from "@/lib/api-types";
import { currencyCode } from "@/lib/format";
import { cx } from "@/lib/cx";
import { SLUG_HINT } from "./validate";

/** Slug input with "generate from name" beside it. The pattern the server
 *  enforces is stated in the hint, never left to a placeholder. */
export function SlugField({
  label,
  value,
  error,
  onChange,
  onGenerate,
  hint = SLUG_HINT,
  name,
}: {
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  onGenerate: () => void;
  hint?: string;
  name?: string;
}) {
  const id = useId();
  return (
    <Field label={label} id={id} hint={hint} error={error}>
      {(describedBy) => (
        <div className="ops-slug">
          <input
            id={id}
            name={name}
            className="control"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            spellCheck={false}
            autoComplete="off"
          />
          <Button variant="outline" size="sm" onClick={onGenerate}>
            Generate from name
          </Button>
        </div>
      )}
    </Field>
  );
}

/** Price entry stays in the operator's currency and decimal form; the console
 *  converts with `centsFrom` before the value leaves the browser. */
export function MoneyField({
  label,
  value,
  error,
  hint,
  onChange,
  name,
}: {
  label: string;
  value: string;
  error?: string;
  hint?: string;
  onChange: (value: string) => void;
  name?: string;
}) {
  const id = useId();
  return (
    <Field label={label} id={id} hint={hint ?? `Two decimals, ${currencyCode()}`} error={error}>
      {(describedBy) => (
        <div className="ops-money">
          <span className="ops-money__unit" aria-hidden="true">
            {currencyCode()}
          </span>
          <input
            id={id}
            name={name}
            className="control ops-money__input"
            value={value}
            inputMode="decimal"
            onChange={(event) => onChange(event.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            autoComplete="off"
          />
        </div>
      )}
    </Field>
  );
}

export function CategoryField({
  categories,
  value,
  onChange,
  error,
}: {
  categories: Category[];
  value: number | null;
  onChange: (value: number | null) => void;
  error?: string;
}) {
  return (
    <Select
      label="Aisle"
      optional
      error={error}
      value={value === null ? "" : String(value)}
      onChange={(event) =>
        onChange(event.target.value === "" ? null : Number(event.target.value))
      }
    >
      <option value="">Unfiled</option>
      {categories.map((category) => (
        <option key={category.id} value={category.id}>
          {category.name}
        </option>
      ))}
    </Select>
  );
}

export function NotesField({
  label = "Description",
  value,
  error,
  rows = 4,
  hint,
  onChange,
  name,
  maxLength,
}: {
  label?: string;
  value: string;
  error?: string;
  rows?: number;
  hint?: string;
  onChange: (value: string) => void;
  name?: string;
  maxLength?: number;
}) {
  return (
    <TextArea
      label={label}
      optional
      error={error}
      rows={rows}
      hint={hint}
      name={name}
      maxLength={maxLength}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

/** Stock in pieces, integer, never negative. */
export function StockField({
  label = "Stock on hand",
  value,
  error,
  onChange,
  name,
  required = true,
}: {
  label?: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  name?: string;
  required?: boolean;
}) {
  return (
    <TextInput
      label={label}
      required={required}
      error={error}
      type="number"
      min={0}
      step={1}
      name={name}
      value={value}
      className="ops-numfield"
      inputMode="numeric"
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

/** Two-step destructive control: idle, then a named consequence, then confirm. */
export function ConfirmInline({
  label,
  consequence,
  confirmLabel,
  onConfirm,
  onCancel,
  busy = false,
}: {
  label: string;
  consequence: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}) {
  return (
    <div className="ops-confirm" role="group" aria-label={`Confirm: ${label}`}>
      <p className="ops-confirm__text">{consequence}</p>
      <div className="cluster">
        <Button variant="danger" size="sm" loading={busy} onClick={onConfirm}>
          {confirmLabel}
        </Button>
        <Button variant="quiet" size="sm" disabled={busy} onClick={onCancel}>
          Keep it
        </Button>
      </div>
    </div>
  );
}

/** Compact icon action for a table row; `label` is the accessible name. */
export function RowIcon({
  label,
  onClick,
  children,
  disabled,
  className,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <IconBtn
      label={label}
      size="sm"
      tone="edge"
      disabled={disabled}
      className={className}
      onClick={onClick}
    >
      {children}
    </IconBtn>
  );
}

export function OpsForm({
  children,
  className,
  ...rest
}: { children: ReactNode } & FormHTMLAttributes<HTMLFormElement>) {
  return (
    <form {...rest} className={cx("ops-form", className)}>
      {children}
    </form>
  );
}
