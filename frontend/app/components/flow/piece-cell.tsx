"use client";

import Link from "next/link";

import { ProductImage } from "@/app/components/product-image";

/**
 * The piece cell shared by checkout review and the order line ledger: a thumb
 * (cover imagery when the caller has it, monogram when it does not), the name as
 * the link, and one mono note line.
 */
export function PieceCell({
  name,
  slug,
  src = null,
  note,
}: {
  name: string;
  slug: string;
  src?: string | null;
  note?: string;
}) {
  return (
    <Link className="order-piece" href={`/products/${encodeURIComponent(slug)}`}>
      <span className="flow-thumb order-piece__thumb">
        <ProductImage src={src} name={name} alt="" sizes="(min-width: 768px) 44px, 64px" />
      </span>
      <span className="order-piece__name">
        {name}
        {note ? <span className="order-piece__qty mono">{note}</span> : null}
      </span>
    </Link>
  );
}
