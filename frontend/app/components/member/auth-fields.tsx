"use client";

import { useId } from "react";
import type { ReactNode, RefObject } from "react";

import { IconBtn } from "@/app/components/ui/button";
import { Field } from "@/app/components/ui/field";
import { Icon } from "@/app/components/ui/icons";
import { cx } from "@/lib/cx";

import type { RuleLine } from "./password-rules";

type SharedProps = {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  /** Every field declares what a password manager should fill. */
  autoComplete: string;
  placeholder?: string;
  error?: string;
  hint?: string;
  maxLength?: number;
  required?: boolean;
  disabled?: boolean;
  inputRef?: RefObject<HTMLInputElement | null>;
  className?: string;
  /** Extra node rendered after the control, inside the same field. */
  children?: ReactNode;
};

function ruleIcon(line: RuleLine) {
  if (line.state === "ok") return <Icon.CircleCheck size={14} />;
  if (line.state === "idle") return <Icon.Info size={14} />;
  return <Icon.CircleX size={14} />;
}

/** Labelled text field. The label is always visible, the placeholder never
 *  carries it, and the id/describedby pair is owned here. */
export function AuthTextField({
  label,
  name,
  value,
  onChange,
  autoComplete,
  placeholder,
  error,
  hint,
  maxLength,
  required = true,
  disabled,
  inputRef,
  className,
  type = "text",
  children,
}: SharedProps & { type?: "text" | "email" }) {
  const id = useId();
  return (
    <Field label={label} id={id} hint={hint} error={error} required={required} className={className}>
      {(describedBy) => (
        <>
          <input
            id={id}
            ref={inputRef}
            name={name}
            type={type}
            className="control"
            value={value}
            autoComplete={autoComplete}
            placeholder={placeholder}
            disabled={disabled}
            maxLength={maxLength}
            spellCheck={type === "email" ? false : undefined}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            onChange={(event) => onChange(event.target.value)}
          />
          {children}
        </>
      )}
    </Field>
  );
}

/** Password field with a real show/hide control and an optional live rule line. */
export function AuthPasswordField({
  label,
  name,
  value,
  onChange,
  autoComplete,
  placeholder,
  error,
  hint,
  maxLength = 128,
  required = true,
  disabled,
  inputRef,
  className,
  shown,
  onToggle,
  rule,
}: SharedProps & {
  shown: boolean;
  onToggle: () => void;
  rule?: RuleLine | null;
}) {
  const id = useId();
  const ruleId = `${id}-rule`;
  return (
    <Field label={label} id={id} hint={hint} error={error} required={required} className={className}>
      {(describedBy) => (
        <div className={cx("auth-control", rule && "auth-control--ruled")}>
          <div className="auth-control__input">
            <input
              id={id}
              ref={inputRef}
              name={name}
              type={shown ? "text" : "password"}
              className="control"
              value={value}
              autoComplete={autoComplete}
              placeholder={placeholder}
              disabled={disabled}
              maxLength={maxLength}
              aria-invalid={error ? true : undefined}
              aria-describedby={cx(describedBy, rule && ruleId) || undefined}
              onChange={(event) => onChange(event.target.value)}
            />
            <IconBtn
              label={shown ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
              className="auth-toggle"
              aria-pressed={shown}
              disabled={disabled}
              onClick={onToggle}
            >
              {shown ? <Icon.EyeOff size={18} /> : <Icon.Eye size={18} />}
            </IconBtn>
          </div>
          {rule ? (
            <p className="auth-req" id={ruleId} data-state={rule.state} aria-live="polite">
              {ruleIcon(rule)}
              {rule.text}
            </p>
          ) : null}
        </div>
      )}
    </Field>
  );
}
