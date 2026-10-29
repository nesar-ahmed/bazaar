import Link from "next/link";
import { redirect } from "next/navigation";

import AuthForm from "@/app/components/auth-form";
import SiteHeader from "@/app/components/site-header";
import { getCurrentProfile } from "@/lib/auth";

export const metadata = {
  title: "Create an account | Bazaar",
};

export default async function RegisterPage() {
  if (await getCurrentProfile()) redirect("/account");

  return (
    <>
      <SiteHeader />
      <main className="auth-page auth-page-register">
        <div className="auth-art">
          <span className="auth-art-sun" />
          <span className="auth-art-vase" />
          <span className="auth-art-stem" />
          <p>MAKE ROOM<br />FOR GOOD.</p>
          <span className="auth-art-caption">A BAZAAR MOMENT · Nº 02</span>
        </div>
        <section className="auth-content">
          <Link className="back-link" href="/">← Back to the market</Link>
          <p className="eyebrow">A PLACE FOR THE GOOD THINGS</p>
          <h1>Make yourself <em>at home.</em></h1>
          <p className="auth-intro">Create an account and keep all your favorite finds close.</p>
          <AuthForm mode="register" />
          <p className="auth-privacy">By joining, you agree to keep things kind and your password private.</p>
        </section>
      </main>
    </>
  );
}
