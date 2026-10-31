import type { SVGProps } from "react";

type Props = {
  size?: number;
  className?: string;
  strokeWidth?: number;
  /** Provide a label when the icon is the only content of a control. */
  title?: string;
} & Pick<SVGProps<SVGSVGElement>, "aria-hidden">;

function Svg({
  size = 20,
  className,
  strokeWidth = 1.5,
  title,
  children,
  ...rest
}: Props & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

export const Icon = {
  Search: (p: Props) => (
    <Svg {...p}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </Svg>
  ),
  Bag: (p: Props) => (
    <Svg {...p}>
      <path d="M5.5 8h13l1 11.5h-15z" />
      <path d="M9 8.5V6.2a3 3 0 0 1 6 0v2.3" />
    </Svg>
  ),
  User: (p: Props) => (
    <Svg {...p}>
      <circle cx="12" cy="8.5" r="3.6" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </Svg>
  ),
  Plus: (p: Props) => (
    <Svg {...p}>
      <path d="M12 5.5v13M5.5 12h13" />
    </Svg>
  ),
  Minus: (p: Props) => (
    <Svg {...p}>
      <path d="M5.5 12h13" />
    </Svg>
  ),
  Close: (p: Props) => (
    <Svg {...p}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  ),
  Check: (p: Props) => (
    <Svg {...p}>
      <path d="m4.5 12.5 5 5 10-11" />
    </Svg>
  ),
  ChevronDown: (p: Props) => (
    <Svg {...p}>
      <path d="m6 9.5 6 6 6-6" />
    </Svg>
  ),
  ChevronRight: (p: Props) => (
    <Svg {...p}>
      <path d="m9.5 5.5 6 6.5-6 6.5" />
    </Svg>
  ),
  ChevronLeft: (p: Props) => (
    <Svg {...p}>
      <path d="M14.5 5.5 8.5 12l6 6.5" />
    </Svg>
  ),
  ArrowRight: (p: Props) => (
    <Svg {...p}>
      <path d="M4.5 12h15M13.5 6l6 6-6 6" />
    </Svg>
  ),
  ArrowLeft: (p: Props) => (
    <Svg {...p}>
      <path d="M19.5 12h-15M10.5 6l-6 6 6 6" />
    </Svg>
  ),
  ArrowUpRight: (p: Props) => (
    <Svg {...p}>
      <path d="M7 17 17 7M8.5 7H17v8.5" />
    </Svg>
  ),
  ArrowUp: (p: Props) => (
    <Svg {...p}>
      <path d="M12 19.5v-15M6 11l6-6 6 6" />
    </Svg>
  ),
  Trash: (p: Props) => (
    <Svg {...p}>
      <path d="M4.5 7h15M9 7V4.5h6V7M6.5 7l1 13h9l1-13" />
    </Svg>
  ),
  Pencil: (p: Props) => (
    <Svg {...p}>
      <path d="M4.5 19.5h4L20 8a2.1 2.1 0 0 0-3-3L5.5 16.5z" />
      <path d="m14.5 6.5 3 3" />
    </Svg>
  ),
  Alert: (p: Props) => (
    <Svg {...p}>
      <path d="M12 4 2.8 20h18.4z" />
      <path d="M12 10v4.5" />
      <path d="M12 17.4h.01" />
    </Svg>
  ),
  Info: (p: Props) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5M12 7.6h.01" />
    </Svg>
  ),
  Clock: (p: Props) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3.2 2" />
    </Svg>
  ),
  Box: (p: Props) => (
    <Svg {...p}>
      <path d="M12 3.5 20.5 8v8L12 20.5 3.5 16V8z" />
      <path d="M3.5 8 12 12.5 20.5 8M12 12.5v8" />
    </Svg>
  ),
  Truck: (p: Props) => (
    <Svg {...p}>
      <path d="M2.5 7h10v9h-10zM12.5 11h4l3 3v2h-7z" />
      <circle cx="6" cy="18.5" r="1.8" />
      <circle cx="16.5" cy="18.5" r="1.8" />
    </Svg>
  ),
  Tag: (p: Props) => (
    <Svg {...p}>
      <path d="M4 4h8.5L20 11.5 12.5 19 4 11z" />
      <path d="M8.5 8.5h.01" />
    </Svg>
  ),
  Layers: (p: Props) => (
    <Svg {...p}>
      <path d="m12 3.5 8.5 4.5L12 12.5 3.5 8z" />
      <path d="m4 12.5 8 4.5 8-4.5M4 16.5 12 21l8-4.5" />
    </Svg>
  ),
  Grid: (p: Props) => (
    <Svg {...p}>
      <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />
    </Svg>
  ),
  List: (p: Props) => (
    <Svg {...p}>
      <path d="M4 6.5h16M4 12h16M4 17.5h16" />
    </Svg>
  ),
  Filter: (p: Props) => (
    <Svg {...p}>
      <path d="M3.5 6h17M6.5 12h11M10 18h4" />
    </Svg>
  ),
  Sliders: (p: Props) => (
    <Svg {...p}>
      <path d="M4 8h10M18 8h2M4 16h4M12 16h8" />
      <circle cx="16" cy="8" r="2" />
      <circle cx="10" cy="16" r="2" />
    </Svg>
  ),
  Sort: (p: Props) => (
    <Svg {...p}>
      <path d="M7 4.5v15M3.8 16.2 7 19.5l3.2-3.3M17 19.5v-15M13.8 7.8 17 4.5l3.2 3.3" />
    </Svg>
  ),
  Sun: (p: Props) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4" />
    </Svg>
  ),
  Moon: (p: Props) => (
    <Svg {...p}>
      <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />
    </Svg>
  ),
  LogOut: (p: Props) => (
    <Svg {...p}>
      <path d="M14 4.5H5.5v15H14" />
      <path d="M11 12h9M17 8.5 20.5 12 17 15.5" />
    </Svg>
  ),
  Key: (p: Props) => (
    <Svg {...p}>
      <circle cx="8" cy="8" r="4" />
      <path d="m11 11 8 8M16 16l2-2" />
    </Svg>
  ),
  Lock: (p: Props) => (
    <Svg {...p}>
      <path d="M6 11h12v9H6zM9 11V7.5a3 3 0 0 1 6 0V11" />
    </Svg>
  ),
  Mail: (p: Props) => (
    <Svg {...p}>
      <path d="M3.5 6h17v12h-17z" />
      <path d="m3.5 7 8.5 6 8.5-6" />
    </Svg>
  ),
  Eye: (p: Props) => (
    <Svg {...p}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12" />
      <circle cx="12" cy="12" r="3" />
    </Svg>
  ),
  EyeOff: (p: Props) => (
    <Svg {...p}>
      <path d="M4 4l16 16M9.5 9.6A3 3 0 0 0 12 15a3 3 0 0 0 2.4-1.3" />
      <path d="M6.4 6.7C4 8.4 2.5 12 2.5 12S6 18.5 12 18.5c2 0 3.7-.6 5-1.5M17.7 15c2.2-1.8 3.8-3 3.8-3S18 5.5 12 5.5c-1 0-2 .15-2.8.4" />
    </Svg>
  ),
  Refresh: (p: Props) => (
    <Svg {...p}>
      <path d="M20 12a8 8 0 1 1-2.4-5.7" />
      <path d="M20.5 4v4h-4" />
    </Svg>
  ),
  Undo: (p: Props) => (
    <Svg {...p}>
      <path d="M4 9h11a5 5 0 0 1 0 10H8" />
      <path d="M7.5 5.5 4 9l3.5 3.5" />
    </Svg>
  ),
  Chart: (p: Props) => (
    <Svg {...p}>
      <path d="M4 20V9M10 20V4M16 20v-8M21 20H3" />
    </Svg>
  ),
  Package: (p: Props) => (
    <Svg {...p}>
      <path d="M4 8h16v12H4zM8 8V5h8v3" />
      <path d="M4 12h16" />
    </Svg>
  ),
  Shield: (p: Props) => (
    <Svg {...p}>
      <path d="M12 3.5 20 6v6c0 4.5-3.4 7.4-8 8.5-4.6-1.1-8-4-8-8.5V6z" />
      <path d="m9 12 2 2 4-4" />
    </Svg>
  ),
  Pin: (p: Props) => (
    <Svg {...p}>
      <path d="M12 21s6.5-7 6.5-11A6.5 6.5 0 0 0 5.5 10c0 4 6.5 11 6.5 11" />
      <circle cx="12" cy="10" r="2.4" />
    </Svg>
  ),
  Home: (p: Props) => (
    <Svg {...p}>
      <path d="M4 10.5 12 4l8 6.5V20H4z" />
      <path d="M10 20v-6h4v6" />
    </Svg>
  ),
  Card: (p: Props) => (
    <Svg {...p}>
      <path d="M3.5 6.5h17v11h-17z" />
      <path d="M3.5 10.5h17M7 14h4" />
    </Svg>
  ),
  CircleCheck: (p: Props) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8 12.5 2.8 2.7L16.2 9.8" />
    </Svg>
  ),
  CircleX: (p: Props) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m9 9 6 6M15 9l-6 6" />
    </Svg>
  ),
  Sparkle: (p: Props) => (
    <Svg {...p}>
      <path d="M12 3.5 13.7 9l5.5 1.7-5.5 1.7L12 18l-1.7-5.6L4.8 10.7 10.3 9z" />
      <path d="M18.5 16.5 19.3 19l2.2.8-2.2.8-.8 2.2" />
    </Svg>
  ),
  Spinner: ({ size = 20, className }: Props) => (
    <span
      className={`spinner ${className ?? ""}`}
      role="status"
      aria-label="Loading"
      style={{ width: size, height: size }}
    />
  ),
};

export type IconName = keyof typeof Icon;
