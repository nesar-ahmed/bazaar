import Link from "next/link";
import { redirect } from "next/navigation";

import AuthForm from "@/app/components/auth-form";
import SiteHeader from "@/app/components/site-header";
import { getCurrentProfile } from "@/lib/auth";

export const metadata = {
  title: "Sign in | Bazaar",
};

export default async function LoginPage() {
  if (await getCurrentProfile()) redirect("/account");

  return (
    <>
      <SiteHeader />
      <main className="auth-page">
        <div className="auth-art">
          <span className="auth-art-sun" />
          <span className="auth-art-vase" />
          <span className="auth-art-stem" />
          <p>GOOD THINGS<br />ARE WAITING.</p>
          <span className="auth-art-caption">A BAZAAR MOMENT · Nº 01</span>
        </div>
        <section className="auth-content">
          <Link className="back-link" href="/">← Back to the market</Link>
          <p className="eyebrow">WELCOME BACK</p>
          <h1>Come on <em>in.</em></h1>
          <p className="auth-intro">Sign in to find your favorites and make yourself at home.</p>
          <AuthForm mode="login" />
          <p className="auth-privacy">Your details stay yours. Always.</p>
        </section>
      </main>
    </>
  );
}
