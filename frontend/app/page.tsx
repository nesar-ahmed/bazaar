import Link from "next/link";

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
  const apiUrl = process.env.API_URL ?? "http://localhost:8000";
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
  let products: Product[];
  let apiUnavailable = false;

  try {
    products = await getProducts();
  } catch {
    products = [];
    apiUnavailable = true;
  }

  return (
    <main>
      <header className="site-header">
        <Link className="brand" href="/">bazaar<span>.</span></Link>
        <nav aria-label="Main navigation">
          <a href="#products">Shop</a>
          <a href="#about">Our story</a>
          <button className="cart-button" type="button" disabled aria-label="Cart">
            Bag <span>0</span>
          </button>
        </nav>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">GOOD FINDS, ALL IN ONE PLACE</p>
          <h1>Make room for<br />something <em>good.</em></h1>
          <p className="hero-description">
            Thoughtful everyday essentials, curious little discoveries, and
            things worth keeping.
          </p>
          <a className="primary-button" href="#products">Explore the collection <span>↗</span></a>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="sun" />
          <div className="art-shape shape-one" />
          <div className="art-shape shape-two" />
          <div className="art-shape shape-three" />
          <span className="art-caption">THE EVERYDAY EDIT — Nº 01</span>
        </div>
      </section>

      <section className="collection" id="products">
        <div className="section-heading">
          <div>
            <p className="eyebrow">A FEW OF OUR FAVORITES</p>
            <h2>Find your next <em>favorite.</em></h2>
          </div>
          <span className="result-count">{products.length.toString().padStart(2, "0")} ITEMS</span>
        </div>

        {apiUnavailable ? (
          <p className="notice">
              The backend catalog API is not implemented yet.
          </p>
        ) : products.length === 0 ? (
          <p className="notice">The shelves are ready. Products will appear here soon.</p>
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
                  <button type="button" aria-label={`Add ${product.name} to bag`} disabled>
                    +
                  </button>
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

      <footer id="about">
        <Link className="brand" href="/">bazaar<span>.</span></Link>
        <p>A little more joy in the everyday.</p>
        <span>© {new Date().getFullYear()} Bazaar</span>
      </footer>
    </main>
  );
}
