import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductCard } from "@/app/components/product-card";
import { ProductPurchase } from "@/app/components/product-detail-actions";
import { Breadcrumbs, StockNote } from "@/app/components/ui/display";
import { Icon } from "@/app/components/ui/icons";
import { currencyCode, formatDate, formatPrice, skuRef } from "@/lib/format";
import { getCategories, getProduct, getProducts } from "@/lib/catalog";
import { categoryNameById } from "@/lib/catalog-utils";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: "Piece not found" };
  return {
    title: product.name,
    description:
      product.description ??
      `${product.name} · ${formatDate(product.created_at)} listing at Bazaar.`,
    openGraph: {
      title: product.name,
      description: product.description ?? "A considered piece on the Bazaar shelf.",
      type: "article",
      images: product.image_url ? [{ url: product.image_url }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const categories = await getCategories();
  const aisle = categories.find((category) => category.id === product.category_id) ?? null;
  const related = (
    await getProducts({ categoryId: product.category_id ?? null, limit: 6 })
  ).filter((candidate) => candidate.id !== product.id).slice(0, 4);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? undefined,
    sku: String(product.id),
    image: product.image_url ? [product.image_url] : undefined,
    offers: {
      "@type": "Offer",
      price: (product.price_cents / 100).toFixed(2),
      priceCurrency: currencyCode(),
      availability:
        product.inventory_quantity > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      inventoryLevel: {
        "@type": "QuantitativeValue",
        value: product.inventory_quantity,
      },
    },
  };

  return (
    <div className="container">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="pdp">
        <div className="pdp__crumbs">
          <Breadcrumbs
            items={[
              { href: "/", label: "Market" },
              { href: "/discover", label: "Collection" },
              ...(aisle
                ? [{ href: `/discover?category=${aisle.slug}`, label: aisle.name }]
                : []),
              { label: product.name },
            ]}
          />
        </div>

        <figure className="pdp__media">
          <div className="pdp__frame">
            {product.image_url ? (
              <Image
                src={product.image_url}
                alt={`${product.name} at Bazaar`}
                fill
                priority
                sizes="(min-width: 900px) 46vw, 100vw"
                style={{ objectFit: "cover" }}
              />
            ) : (
              <span className="imgtile" aria-hidden="true">
                {product.name.slice(0, 1)}
              </span>
            )}
            <span className="pdp__ref">{skuRef(product.id)}</span>
          </div>
          <figcaption className="pdp__caption">
            <span className="mono">1 / 1 · listed {formatDate(product.created_at)}</span>
            <span>{aisle ? `Filed under ${aisle.name}` : "Unfiled piece"}</span>
          </figcaption>
        </figure>

        <div className="pdp__info">
          <div className="stack" style={{ gap: "var(--s-3)" }}>
            <p className="label label--signal">
              {aisle ? aisle.name : "Bazaar piece"} · Nº {String(product.id).padStart(3, "0")}
            </p>
            <h1 className="pdp__title">{product.name}</h1>
          </div>

          <div className="pdp__priceline">
            <span className="price price--lead">{formatPrice(product.price_cents)}</span>
            <StockNote quantity={product.inventory_quantity} meter />
          </div>

          <div className="pdp__desc">
            {product.description ? <p>{product.description}</p> : null}
            <p className="muted">
              Stock is counted live. When you place an order the units are reserved in the
              same transaction, so the number above is what we physically hold right now.
            </p>
          </div>

          <ProductPurchase product={product} />

          <dl className="kv pdp__specs">
            <div className="kv__row">
              <dt>
                <Icon.Tag size={15} />
                Aisle
              </dt>
              <dd>
                {aisle ? (
                  <Link className="link" href={`/discover?category=${aisle.slug}`}>
                    {aisle.name}
                  </Link>
                ) : (
                  categoryNameById(categories, product.category_id)
                )}
              </dd>
            </div>
            <div className="kv__row">
              <dt>
                <Icon.Box size={15} />
                Units held
              </dt>
              <dd className="num">{product.inventory_quantity}</dd>
            </div>
            <div className="kv__row">
              <dt>
                <Icon.Clock size={15} />
                Listed
              </dt>
              <dd className="num">{formatDate(product.created_at)}</dd>
            </div>
            <div className="kv__row">
              <dt>
                <Icon.Card size={15} />
                Payment
              </dt>
              <dd>Arranged after this step</dd>
            </div>
          </dl>

          <details className="pdp__accordion" open>
            <summary>
              Ordering and cancellation
              <Icon.ChevronDown size={17} />
            </summary>
            <p>
              Checkout creates a pending order and reserves the units. While the order is
              still awaiting pick you can cancel it from your ledger and the stock goes
              back on the shelf. Card payment is not connected on this storefront yet.
            </p>
          </details>

          <details className="pdp__accordion">
            <summary>
              Bag behaviour
              <Icon.ChevronDown size={17} />
            </summary>
            <p>
              Your bag is kept on this device until you sign in, then it is merged into
              your account. Anything that cannot be carried over, for example a piece that
              sold out meanwhile, is listed for you after sign-in.
            </p>
          </details>
        </div>

        {related.length > 0 ? (
          <section className="pdp__more" aria-labelledby="related-title">
            <div className="pdp__more-head">
              <div>
                <p className="label">{aisle ? `More in ${aisle.name}` : "Also on the shelf"}</p>
                <h2 id="related-title">Pieces near this one</h2>
              </div>
              <Link className="link-arrow" href={aisle ? `/discover?category=${aisle.slug}` : "/discover"}>
                See the whole aisle
                <Icon.ArrowRight size={16} />
              </Link>
            </div>
            <div className="showcase__grid">
              {related.map((candidate) => (
                <ProductCard
                  key={candidate.id}
                  product={candidate}
                  categoryName={aisle?.name ?? categoryNameById(categories, candidate.category_id)}
                />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
