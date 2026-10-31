import Link from "next/link";

import { Panel } from "@/app/components/ui/display";
import { ButtonLink } from "@/app/components/ui/button";
import { Icon } from "@/app/components/ui/icons";
import type { UserProfile } from "@/lib/api-types";
import { formatDate } from "@/lib/format";

import { SignOutButton } from "./sign-out-button";

/**
 * What an authenticated non-admin sees: the truth about their role, a way out,
 * and none of the console chrome.
 */
export function AccessPanel({ profile }: { profile: UserProfile }) {
  return (
    <div className="ops ops--gate">
      <Panel
        id="ops-denied"
        title="This account cannot open the console"
        eyebrow="Access"
        tone="sunk"
        footer={
          <p className="tiny muted">
            The console re-checks the role on every read. Nothing here is cached.
          </p>
        }
      >
        <div className="ops-denied">
          <span className="ops-denied__mark" aria-hidden="true">
            <Icon.Shield size={22} />
          </span>
          <div className="ops-denied__body">
            <p>
              <strong>{profile.full_name}</strong> is signed in as{" "}
              <span className="mono">{profile.email}</span> with the role{" "}
              <span className="mono">{profile.role}</span>. That role can browse, buy and track its
              own orders, but it cannot edit the catalog, the aisles or the fulfilment queue.
            </p>
            <p className="tiny muted">
              Member since {formatDate(profile.created_at)}. An administrator must change the role
              in the backend; the console cannot grant itself permission.
            </p>
            <div className="cluster ops-denied__actions">
              <ButtonLink href="/account" variant="cta" size="sm">
                Go to your account
              </ButtonLink>
              <ButtonLink href="/discover" variant="outline" size="sm">
                Back to the storefront
              </ButtonLink>
              <SignOutButton next="/login" />
            </div>
            <p className="tiny">
              Expecting admin rights?{" "}
              <Link className="link" href="/account">
                Check the signed-in account
              </Link>{" "}
              or sign in with the administrator address.
            </p>
          </div>
        </div>
      </Panel>
    </div>
  );
}
