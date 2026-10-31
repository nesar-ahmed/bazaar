import Link from "next/link";

import { CartButton } from "@/app/components/cart-provider";
import { HeaderAccountLink } from "@/app/components/header-account-link";
import { MobileNav } from "@/app/components/mobile-nav";
import { ThemeToggle } from "@/app/components/theme-toggle";
import { hasSessionTokens, readRoleHint } from "@/lib/server-session";
import { getProfile } from "@/lib/catalog";

export async function SiteHeader() {
  const [signedIn, role] = await Promise.all([hasSessionTokens(), readRoleHint()]);
  const profile = signedIn ? await getProfile() : null;

  return (
    <header className="masthead">
      <div className="site-header">
        <Link className="brand" href="/" aria-label="Bazaar home">
          bazaar<span className="brand__mark">.</span>
        </Link>

        <nav className="main-nav" aria-label="Main">
          <Link href="/discover">Discover</Link>
          {role === "admin" ? <Link href="/admin">Console</Link> : null}
        </nav>

        <div className="header-tools">
          <ThemeToggle />

          <CartButton />
          <HeaderAccountLink signedIn={signedIn} fullName={profile?.full_name ?? null} />
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
