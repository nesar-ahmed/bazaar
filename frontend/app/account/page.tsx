import { redirect } from "next/navigation";

import { AccountDashboard } from "@/app/components/account-dashboard";
import { single } from "@/app/components/member/notices";
import { getOrders, getProfile } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Account",
  description:
    "Your Bazaar account: display name, password, and the ledger of every order filed against you.",
};

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function AccountPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const [profile, orders] = await Promise.all([getProfile(), getOrders()]);

  // Null means signed out or unreachable: the sign-in page can do something
  // about both, and `next` brings the person straight back here.
  if (!profile) redirect("/login?next=%2Faccount");

  return (
    <AccountDashboard
      profile={profile}
      orders={orders}
      tab={single(params.tab)}
      error={single(params.error)}
    />
  );
}
