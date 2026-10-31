import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { cx } from "@/lib/cx";
import { Icon } from "./icons";

export type ButtonVariant =
  | "cta"
  | "outline"
  | "quiet"
  | "danger"
  | "signal"
  | "ghost-light";
export type ButtonSize = "sm" | "md" | "lg";

function buttonClass(
  variant: ButtonVariant = "cta",
  size: ButtonSize = "md",
  block?: boolean,
  trailing?: boolean,
  className?: string,
) {
  return cx(
    "btn",
    `btn--${variant}`,
    size !== "md" && `btn--${size}`,
    block && "btn--block",
    trailing && "btn--trailing",
    className,
  );
}

type Shared = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  trailing?: boolean;
  icon?: ReactNode;
  className?: string;
};

export function Button({
  variant,
  size,
  block,
  trailing,
  icon,
  className,
  loading,
  disabled,
  children,
  ...rest
}: Shared & ComponentProps<"button"> & { loading?: boolean }) {
  return (
    <button
      type="button"
      className={buttonClass(variant, size, block, trailing, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Icon.Spinner /> : icon}
      {children}
    </button>
  );
}

export function ButtonLink({
  variant,
  size,
  block,
  trailing,
  icon,
  className,
  children,
  ...rest
}: Shared & ComponentProps<typeof Link>) {
  return (
    <Link className={buttonClass(variant, size, block, trailing, className)} {...rest}>
      {icon}
      {children}
    </Link>
  );
}

/** Icon-only control. `label` becomes the accessible name; hit area is 44px. */
export function IconBtn({
  label,
  tone,
  size = "md",
  className,
  children,
  ...rest
}: {
  label: string;
  tone?: "edge";
  size?: "sm" | "md";
  className?: string;
  children: ReactNode;
} & ComponentProps<"button">) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cx("icon-btn", size === "sm" && "icon-btn--sm", tone === "edge" && "icon-btn--edge", className)}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Quiet text-style action (row actions, undo). Still a real button. */
export function LinkAction({
  className,
  children,
  ...rest
}: ComponentProps<"button">) {
  return (
    <button type="button" className={cx("btn btn--quiet btn--sm", className)} {...rest}>
      {children}
    </button>
  );
}
