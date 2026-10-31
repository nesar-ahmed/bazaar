import type { Metadata } from "next";

import { BagScreen } from "@/app/components/cart-screen";
import { hasSessionTokens } from "@/lib/server-session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your bag",
  description:
    "Review what you have gathered, adjust quantities, and see what placing the order does.",
};

export default async function CartPage() {
  // Presence of session cookies only: it chooses the call to action, the
  // backend stays the authority on every read.
  const signedIn = await hasSessionTokens();

  return (
    <div className="container flow-page flow-page--bar">
      <BagScreen signedIn={signedIn} />
    </div>
  );
}
