import type { ComponentProps, CSSProperties, ReactNode } from "react";

import { cx } from "@/lib/cx";
import { formatPrice, stockLabel, statusLabel } from "@/lib/format";
import type { OrderStatus } from "@/lib/api-types";
import { Icon } from "./icons";

/** Money is integer cents on the wire; the display is always tabular mono. */
export function Money({
  cents,
  size,
  className,
}: {
  cents: number;
  size?: "lead" | "tag";
  className?: string;
}) {
  return (
    <span
      className={cx(
        "price",
        size === "lead" && "price--lead",
        size === "tag" && "price--tag",
        className,
      )}
    >
      {formatPrice(cents)}
    </span>
  );
}

const STATUS_ICON: Record<OrderStatus, ReactNode> = {
  pending: <Icon.Clock size={14} />,
  processing: <Icon.Box size={14} />,
  shipped: <Icon.Truck size={14} />,
  delivered: <Icon.CircleCheck size={14} />,
  cancelled: <Icon.CircleX size={14} />,
};

/** State is carried by icon + words, never colour alone. */
export function OrderStatusPill({
  status,
  className,
}: {
  status: OrderStatus;
  className?: string;
}) {
  return (
    <span className={cx("status", `status--${status}`, className)}>
      {STATUS_ICON[status]}
      {statusLabel(status)}
    </span>
  );
}

export function StockNote({
  quantity,
  meter = false,
  className,
}: {
  quantity: number;
  meter?: boolean;
  className?: string;
}) {
  const tone = quantity < 1 ? "out" : quantity <= 5 ? "low" : "ok";
  return (
    <span className={cx("stock-note", `stock-note--${tone}`, className)}>
      {stockLabel(quantity)}
      {meter ? (
        <span
          className={cx("meter", `meter--${tone}`)}
          role="presentation"
          aria-hidden="true"
        >
          <span
            className="meter__fill"
            style={{ width: `${Math.min(100, Math.max(quantity > 0 ? 8 : 0, (quantity / 40) * 100))}%` }}
          />
        </span>
      ) : null}
    </span>
  );
}

export function Alert({
  tone = "info",
  title,
  action,
  children,
  className,
  live = false,
}: {
  tone?: "error" | "success" | "warn" | "info";
  title?: string;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
  live?: boolean;
}) {
  const glyph =
    tone === "error" ? <Icon.Alert size={17} /> :
    tone === "success" ? <Icon.CircleCheck size={17} /> :
    tone === "warn" ? <Icon.Alert size={17} /> :
    <Icon.Info size={17} />;
  return (
    <div
      className={cx("alert", `alert--${tone}`, className)}
      role={live ? "status" : tone === "error" ? "alert" : "status"}
      aria-live={live ? "polite" : undefined}
    >
      {glyph}
      <div>
        {title ? <strong>{title}</strong> : null}
        {title && children ? <br /> : null}
        {children}
      </div>
      {action ? <div className="alert__actions">{action}</div> : null}
    </div>
  );
}

export function EmptyState({
  icon = <Icon.Box size={22} />,
  title,
  children,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("empty", className)}>
      <span className="empty__icon" aria-hidden="true">
        {icon}
      </span>
      <h3>{title}</h3>
      {children ? <p>{children}</p> : null}
      {action}
    </div>
  );
}

export function Panel({
  title,
  eyebrow,
  actions,
  footer,
  tone,
  bodyClass,
  id,
  children,
  ...rest
}: {
  title?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  tone?: "sunk" | "lifted" | "flush";
  bodyClass?: string;
  id?: string;
  children?: ReactNode;
} & ComponentProps<"section">) {
  return (
    <section
      id={id}
      className={cx(
        "panel",
        tone === "sunk" && "panel--sunk",
        tone === "lifted" && "panel--lifted",
        tone === "flush" && "panel--flush",
        rest.className,
      )}
      aria-labelledby={id ? `${id}-title` : undefined}
    >
      {title || actions ? (
        <header className="panel__head">
          <div>
            {eyebrow ? <p className="label">{eyebrow}</p> : null}
            {title ? (
              <h2 id={id ? `${id}-title` : undefined}>{title}</h2>
            ) : null}
          </div>
          {actions ? <div className="row">{actions}</div> : null}
        </header>
      ) : null}
      <div className={cx("panel__body", bodyClass)}>{children}</div>
      {footer ? <div className="panel__foot">{footer}</div> : null}
    </section>
  );
}

export function Skeleton({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return <span className={cx("skeleton", className)} style={style} aria-hidden="true" />;
}

export function ProductCardSkeleton() {
  return (
    <div className="pcard-skeleton" aria-hidden="true">
      <span className="skeleton skeleton--media" />
      <span className="skeleton skeleton--line" style={{ width: "40%" }} />
      <span className="skeleton skeleton--line" style={{ width: "80%" }} />
    </div>
  );
}

export function Breadcrumbs({
  items,
}: {
  items: Array<{ href?: string; label: string }>;
}) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <ol>
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`}>
            {item.href && index < items.length - 1 ? (
              <a href={item.href}>{item.label}</a>
            ) : (
              <span aria-current={index === items.length - 1 ? "page" : undefined}>
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function KeyValue({
  rows,
  total,
}: {
  rows: Array<{ term: ReactNode; value: ReactNode }>;
  total?: { term: ReactNode; value: ReactNode };
}) {
  return (
    <dl className="kv">
      {rows.map((row, index) => (
        <div className="kv__row" key={index}>
          <dt>{row.term}</dt>
          <dd>{row.value}</dd>
        </div>
      ))}
      {total ? (
        <div className="kv__row kv__row--total">
          <dt>{total.term}</dt>
          <dd>{total.value}</dd>
        </div>
      ) : null}
    </dl>
  );
}
