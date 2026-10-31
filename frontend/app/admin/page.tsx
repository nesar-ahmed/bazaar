import { Suspense } from "react";
import { redirect } from "next/navigation";

import AdminDashboard from "@/app/components/admin-dashboard";
import { AccessPanel } from "@/app/components/ops/access-panel";
import { ConsoleSkeleton } from "@/app/components/ops/loading";
import { signInUrl } from "@/lib/auth";
import {
  getAdminCategories,
  getAdminOrders,
  getAdminProducts,
  getProfile,
} from "@/lib/catalog";

export const metadata = { title: "Admin console" };

/** Live operator screen: never prerendered, never cached. The cookie jar is the
 *  only thing that decides who gets in, and the backend is the authority. */
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const profile = await getProfile();

  // No session, or a session the backend would not honour: send them to sign in
  // with /admin as the onward target.
  if (!profile) redirect(signInUrl("/admin"));

  if (profile.role !== "admin") {
    return (
      <div className="container ops-wrap">
        <AccessPanel profile={profile} />
      </div>
    );
  }

  // First paint is populated: the console hydrates with real rows instead of a
  // spinner, then keeps itself current through the BFF after every write.
  const [products, categories, orders] = await Promise.all([
    getAdminProducts(),
    getAdminCategories(),
    getAdminOrders(),
  ]);

  return (
    <div className="container ops-wrap">
      <Suspense fallback={<ConsoleSkeleton />}>
        <AdminDashboard
          profile={profile}
          products={products}
          categories={categories}
          orders={orders}
        />
      </Suspense>
    </div>
  );
}
