import Link from "next/link";

import { getAccessToken } from "@/lib/auth";

export default async function SiteHeader() {
  const signedIn = Boolean(await getAccessToken());

  return (
    <>
      <div className="announcement">
        A little more joy in the everyday <span>·</span> Thoughtfully picked, always
      </div>
      <header className="site-header">
        <Link className="brand" href="/" aria-label="Bazaar home">
          bazaar<span>.</span>
        </Link>
        <nav className="main-nav" aria-label="Main navigation">
          <Link href="/#collection">Discover</Link>
          <Link href="/#about">Our story</Link>
        </nav>
        <div className="header-actions">
          <Link className="account-link" href={signedIn ? "/account" : "/login"}>
            {signedIn ? "My account" : "Sign in"}
          </Link>
          <Link className="bag-link" href="/#collection" aria-label="Shopping bag">
            Bag <span>0</span>
          </Link>
        </div>
      </header>
    </>
  );
}
