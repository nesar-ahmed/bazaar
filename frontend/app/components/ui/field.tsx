import { useId } from "react";
import type { ComponentProps, ReactNode } from "react";

import { cx } from "@/lib/cx";
import { Icon } from "./icons";

/** Always-visible label + hint + error wiring. Placeholders never label.
 *  `id` is owned by Field so the control and its description always match. */
export function Field({
  label,
  id,
  hint,
  error,
  required,
  optional,
  className,
  children,
}: {
  label: string;
  id: string;
  hint?: string;
  error?: string;
  required?: boolean;
  optional?: boolean;
  className?: string;
  children: (describedBy: string | undefined) => ReactNode;
}) {
  const describedBy = cx(hint && `${id}-hint`, error && `${id}-error`) || undefined;
  return (
    <div className={cx("field", className)}>
      <label className="field__label" htmlFor={id}>
        {label}
        {optional ? <span className="tag-optional">optional</span> : null}
        {required ? <span className="visually-hidden">required</span> : null}
      </label>
      {children(describedBy)}
      {hint && !error ? (
        <p className="field__hint" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="field__error" id={`${id}-error`} role="alert">
          <Icon.Alert size={14} />
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function TextInput({
  label,
  hint,
  error,
  optional,
  className,
  ...rest
}: { label: string; hint?: string; error?: string; optional?: boolean } & ComponentProps<"input">) {
  const id = useId();
  return (
    <Field label={label} id={id} hint={hint} error={error} required={rest.required} optional={optional}>
      {(describedBy) => (
        <input
          id={id}
          className={cx("control", className)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...rest}
        />
      )}
    </Field>
  );
}

export function TextArea({
  label,
  hint,
  error,
  optional,
  className,
  rows = 4,
  ...rest
}: { label: string; hint?: string; error?: string; optional?: boolean } & ComponentProps<"textarea">) {
  const id = useId();
  return (
    <Field label={label} id={id} hint={hint} error={error} required={rest.required} optional={optional}>
      {(describedBy) => (
        <textarea
          id={id}
          rows={rows}
          className={cx("control", "control--area", className)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...rest}
        />
      )}
    </Field>
  );
}

export function Select({
  label,
  hint,
  error,
  optional,
  className,
  children,
  ...rest
}: { label: string; hint?: string; error?: string; optional?: boolean } & ComponentProps<"select">) {
  const id = useId();
  return (
    <Field label={label} id={id} hint={hint} error={error} required={rest.required} optional={optional}>
      {(describedBy) => (
        <select
          id={id}
          className={cx("control", className)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...rest}
        >
          {children}
        </select>
      )}
    </Field>
  );
}

/** Search-style input with leading icon and a clear affordance. */
export function SearchInput({
  label,
  value,
  onChange,
  onClear,
  placeholder,
  className,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}) {
  const id = useId();
  return (
    <div className={cx("control-group", className)}>
      <Icon.Search size={17} className="control-group__icon" />
      <span className="visually-hidden" id={`${id}-label`}>
        {label}
      </span>
      <input
        id={id}
        type="search"
        value={value}
        aria-labelledby={`${id}-label`}
        placeholder={placeholder}
        autoComplete="off"
        autoFocus={autoFocus}
        onChange={(event) => onChange(event.target.value)}
      />
      {value ? (
        <button
          type="button"
          className="icon-btn icon-btn--sm control-group__clear"
          aria-label={`Clear ${label.toLowerCase()}`}
          onClick={() => {
            onChange("");
            onClear?.();
          }}
        >
          <Icon.Close size={15} />
        </button>
      ) : null}
    </div>
  );
}

export function Check({
  label,
  className,
  ...rest
}: { label: string } & ComponentProps<"input">) {
  const id = useId();
  return (
    <label className={cx("check", className)} htmlFor={id}>
      <input id={id} type="checkbox" {...rest} />
      <span className="check__box" aria-hidden="true">
        <Icon.Check size={12} strokeWidth={2.5} />
      </span>
      {label}
    </label>
  );
}
