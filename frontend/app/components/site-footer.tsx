import Link from "next/link";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div className="footer-brand">
          <Link className="brand" href="/">
            bazaar<span className="brand__mark">.</span>
          </Link>
          <p>A thoughtful market for everyday living.</p>
        </div>

        <div className="footer-col">
          <h3>Shop</h3>
          <ul>
            <li>
              <Link href="/discover">All pieces</Link>
            </li>
            <li>
              <Link href="/cart">Your bag</Link>
            </li>
          </ul>
        </div>

        <div className="footer-col">
          <h3>Account</h3>
          <ul>
            <li>
              <Link href="/account">Profile</Link>
            </li>
            <li>
              <Link href="/account?tab=orders">Order history</Link>
            </li>
            <li>
              <Link href="/register">Create an account</Link>
            </li>
            <li>
              <Link href="/login">Sign in</Link>
            </li>
          </ul>
        </div>

        <div className="footer-col">
          <h3>How this works</h3>
          <ul>
            <li><Link href="/discover">Discover the collection</Link></li>
            <li><Link href="/#our-approach">Our approach</Link></li>
            <li>
              <Link href="/admin">Ops console (staff)</Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="footer-meta">
        <span>© {year} Bazaar market</span>
        <Link href="/api/health" prefetch={false}>
          Service status
        </Link>
      </div>
    </footer>
  );
}
