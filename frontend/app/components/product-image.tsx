"use client";

import Image from "next/image";
import { useState } from "react";

import { cx } from "@/lib/cx";

/** Catalog imagery arrives from the API (and from admin-pasted URLs, which can
 *  404), so a broken image degrades into the monogram tile instead of a hole. */
export function ProductImage({
  src,
  alt,
  name,
  sizes,
  priority,
  className,
  rounded,
}: {
  src: string | null;
  alt?: string;
  name: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
  rounded?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <span className={cx("imgtile", className)} aria-hidden="true">
        {name.slice(0, 1).toUpperCase()}
      </span>
    );
  }

  return (
    <Image
      src={src}
      alt={alt ?? name}
      fill
      sizes={sizes ?? "(min-width: 1100px) 320px, (min-width: 700px) 40vw, 45vw"}
      priority={priority}
      loading={priority ? undefined : "lazy"}
      onError={() => setFailed(true)}
      className={cx("object-cover", rounded && "radius", className)}
      style={{ objectFit: "cover" }}
    />
  );
}
