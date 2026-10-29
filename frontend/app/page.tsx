import Link from "next/link";

import SiteFooter from "@/app/components/site-footer";
import SiteHeader from "@/app/components/site-header";

type Product = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  price_cents: number;
  image_url: string | null;
  category_id: number | null;
};

async function getProducts(): Promise<Product[]> {
  const apiUrl = (process.env.API_URL ?? "http://localhost:8000").replace(/\/$/, "");
  const response = await fetch(`${apiUrl}/api/products`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Catalog API returned ${response.status}`);
  }
  return response.json();
}

function formatPrice(priceCents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(priceCents / 100);
}

export default async function Home() {
  let products: Product[] = [];
  let apiUnavailable = false;

  try {
    products = await getProducts();
  } catch {
    apiUnavailable = true;
  }

  return (
    <>
      <SiteHeader />
      <main>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">A THOUGHTFUL LITTLE MARKETPLACE</p>
            <h1>Find the good<br />in <em>everyday.</em></h1>
            <p className="hero-description">
              Considered pieces, useful things, and small joys for the spaces
              and moments you call your own.
            </p>
            <Link className="button button-dark hero-button" href="#collection">
              Explore the collection <span aria-hidden="true">↗</span>
            </Link>
            <div className="hero-note">
              <span className="note-star" aria-hidden="true">✳</span>
              <span>Good things, found slowly.</span>
            </div>
          </div>
          <div className="hero-art" role="img" aria-label="Abstract still life in warm, earthy colors">
            <div className="art-sun" />
            <div className="art-vase art-vase-large"><span /></div>
            <div className="art-vase art-vase-small"><span /></div>
            <div className="art-stem stem-one" />
            <div className="art-stem stem-two" />
            <div className="art-table" />
            <span className="art-label">THE EVERYDAY EDIT <b>—</b> Nº 01</span>
          </div>
          <span className="hero-index">01 <i /> 03</span>
        </section>

        <section className="promise-strip" aria-label="Our values">
          <p><span>✳</span> Thoughtfully selected</p>
          <i />
          <p><span>✳</span> Made for everyday living</p>
          <i />
          <p><span>✳</span> A little joy in every parcel</p>
        </section>

        <section className="collection section-wrap" id="collection">
          <div className="section-heading">
            <div>
              <p className="eyebrow">A FEW OF OUR FAVORITES</p>
              <h2>Meet your next <em>favorite.</em></h2>
            </div>
            <span className="result-count">
              {products.length > 0
                ? `${products.length.toString().padStart(2, "0")} FINDS`
                : "THE FIRST EDIT"}
            </span>
          </div>

          {apiUnavailable ? (
            <div className="catalog-empty">
              <span className="empty-flower" aria-hidden="true">✳</span>
              <div>
                <h3>We’re setting the shelves.</h3>
                <p>Our first collection is on its way. Come back soon for something good.</p>
              </div>
              <span className="empty-note">COMING SOON</span>
            </div>
          ) : products.length === 0 ? (
            <div className="catalog-empty">
              <span className="empty-flower" aria-hidden="true">✳</span>
              <div>
                <h3>The shelves are ready.</h3>
                <p>Our first collection is on its way. Come back soon for something good.</p>
              </div>
              <span className="empty-note">COMING SOON</span>
            </div>
          ) : (
            <div className="product-grid">
              {products.map((product) => (
                <article className="product-card" key={product.id}>
                  <div className="product-image">
                    {product.image_url ? (
                      // External catalog images are supplied by the API.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={product.image_url} alt={product.name} />
                    ) : (
                      <span>{product.name.slice(0, 1)}</span>
                    )}
                    <button type="button" aria-label={`Add ${product.name} to bag`} disabled>+</button>
                  </div>
                  <div className="product-info">
                    <h3>{product.name}</h3>
                    <span>{formatPrice(product.price_cents)}</span>
                  </div>
                  {product.description && <p className="product-description">{product.description}</p>}
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="newsletter-band">
          <span className="newsletter-mark" aria-hidden="true">b.</span>
          <div>
            <p className="eyebrow">A NOTE FROM THE MARKET</p>
            <h2>Good things are <em>growing.</em></h2>
            <p>We’re curating our first collection. The best finds are worth the wait.</p>
          </div>
          <Link className="text-link" href="/register">
            Be first to know <span aria-hidden="true">↗</span>
          </Link>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
