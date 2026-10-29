import Link from "next/link";
import { redirect } from "next/navigation";

import ProfilePanel from "@/app/components/profile-panel";
import SiteFooter from "@/app/components/site-footer";
import SiteHeader from "@/app/components/site-header";
import { getAccessToken, getApiUrl } from "@/lib/auth";
import type { UserProfile } from "@/lib/auth";

export const metadata = {
  title: "Your account | Bazaar",
};

async function fetchProfile(token: string): Promise<UserProfile | null> {
  const response = await fetch(`${getApiUrl()}/api/v1/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (response.status === 401) return null;
  if (!response.ok) {
    throw new Error(`The account service returned ${response.status}`);
  }
  return (await response.json()) as UserProfile;
}

export default async function AccountPage() {
  const token = await getAccessToken();
  if (!token) redirect("/login");

  let user: UserProfile | null;
  try {
    user = await fetchProfile(token);
  } catch {
    return (
      <>
        <SiteHeader />
        <main className="account-page">
          <div className="account-error">
            <p className="eyebrow">A LITTLE PAUSE</p>
            <h1>Your account is taking a moment.</h1>
            <p>We couldn’t reach the account service. Please try again in a moment.</p>
            <Link className="button button-dark" href="/account">Try again</Link>
          </div>
        </main>
        <SiteFooter />
      </>
    );
  }

  if (!user) redirect("/login");

  return (
    <>
      <SiteHeader />
      <main className="account-page">
        <div className="account-welcome">
          <p className="eyebrow">A PLACE OF YOUR OWN</p>
          <h1>Hello, {user.full_name.split(" ")[0]}<em>.</em></h1>
          <p>All your Bazaar details, together in one place.</p>
        </div>
        <ProfilePanel user={user} />
      </main>
      <SiteFooter />
    </>
  );
}
