"use client";

import { useEffect, useRef, useState } from "react";

import { apiGet } from "@/lib/client-api";
import type { Product } from "@/lib/api-types";

/** slug → image URL, once resolved. `null` means resolved with no imagery, so
 *  the caller keeps the monogram tile instead of a hole. */
export type LineImages = Record<string, string | null>;

/**
 * Order lines carry no `image_url`, so each distinct product slug is read once,
 * lazily, and cached in component state. The effect depends on the slug set only,
 * so a re-render (or a cancel that swaps the order) never re-fires a finished read.
 */
export function useLineImages(slugs: string[]): LineImages {
  const key = Array.from(new Set(slugs.filter(Boolean))).join("|");
  const [images, setImages] = useState<LineImages>({});
  const requested = useRef<Set<string>>(new Set());

  useEffect(() => {
    const seen = requested.current;
    const fresh = key ? key.split("|").filter((slug) => !seen.has(slug)) : [];
    if (fresh.length === 0) return;

    for (const slug of fresh) seen.add(slug);

    let alive = true;
    for (const slug of fresh) {
      apiGet<Product>(`products/${encodeURIComponent(slug)}`)
        .then((product) => {
          if (!alive) return;
          setImages((current) => ({ ...current, [slug]: product?.image_url ?? null }));
        })
        .catch(() => {
          if (!alive) return;
          setImages((current) => ({ ...current, [slug]: null }));
        });
    }

    return () => {
      alive = false;
      // Free the flags so a remount re-issues the read (dev StrictMode).
      for (const slug of fresh) seen.delete(slug);
    };
  }, [key]);

  return images;
}
