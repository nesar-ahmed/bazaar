import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CheckoutScreen } from "@/app/components/checkout-screen";
import { signInUrl } from "@/lib/auth";
import { hasSessionTokens } from "@/lib/server-session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Checkout",
  description:
    "Review the bag, read exactly what placing does, and file a pending order. No payment is taken here.",
};

export default async function CheckoutPage() {
  // Middleware already sends signed-out visitors to /login; this keeps the
  // screen honest if it is reached by a direct render.
  if (!(await hasSessionTokens())) redirect(signInUrl("/checkout"));

  return (
    <div className="container flow-page">
      <CheckoutScreen />
    </div>
  );
}
