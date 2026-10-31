"use client";

import { useState, useTransition, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

import { MemberIdentity } from "@/app/components/member/profile-panel";
import { OrdersPanel } from "@/app/components/member/orders-panel";
import { ProfilePanel } from "@/app/components/member/profile-panel";
import { SecurityPanel } from "@/app/components/member/security-panel";
import {
  cartWarningsSnapshot,
  cartWarningsServerSnapshot,
  warningsSubscribe,
} from "@/app/components/member/cart-warnings";
import { Button } from "@/app/components/ui/button";
import { Alert, EmptyState } from "@/app/components/ui/display";
import { Icon } from "@/app/components/ui/icons";
import { TabBar, TabPanel } from "@/app/components/ui/tabs";
import { orderRef } from "@/lib/format";
import type { Order, UserProfile } from "@/lib/api-types";

type TabId = "profile" | "security" | "orders";
const TAB_IDS: TabId[] = ["profile", "security", "orders"];

function tabFromParam(value: string | null | undefined): TabId {
  return TAB_IDS.includes(value as TabId) ? (value as TabId) : "profile";
}

function tabHref(tab: TabId): string {
  return tab === "profile" ? "/account" : `/account?tab=${tab}`;
}

export function AccountDashboard({
  profile,
  orders,
  tab: tabFromUrl,
  error = null,
}: {
  profile: UserProfile;
  orders: Order[];
  /** `?tab=` from the server page, so deep links and back/forward work. */
  tab?: string | null;
  error?: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dismissed, setDismissed] = useState(false);
  const [alertDismissed, setAlertDismissed] = useState(false);
  const warnings = useSyncExternalStore(
    warningsSubscribe,
    cartWarningsSnapshot,
    cartWarningsServerSnapshot,
  );

  // Local choice wins instantly; a URL that disagrees (back, forward, deep link) wins after.
  const [tabState, setTabState] = useState<{ url: TabId; value: TabId }>(() => ({
    url: tabFromParam(tabFromUrl),
    value: tabFromParam(tabFromUrl),
  }));
  const urlTab = tabFromParam(tabFromUrl);
  const active: TabId = tabState.url === urlTab ? tabState.value : urlTab;

  function select(next: string) {
    const tab = tabFromParam(next);
    if (tab === active) return;
    setTabState({ url: tab, value: tab });
    startTransition(() => {
      router.replace(tabHref(tab));
    });
  }

  const firstName = profile.full_name.trim().split(/\s+/)[0] || profile.full_name;

  return (
    <div className="member">
      <header className="member__head">
        <div className="member__head-copy">
          <p className="member__eyebrow">
            <span className="member__eyebrow-rule" aria-hidden="true" />
            Account ledger {orderRef(profile.id)}
          </p>
          <h1 className="member__title">
            Hello, <em>{firstName}</em>.
          </h1>
          <p className="member__intro">
            Your name, your password, and every order filed against this account, in one place.
          </p>
        </div>
        <MemberIdentity profile={profile} />
      </header>

      {error === "not-admin" && !alertDismissed ? (
        <Alert
          tone="error"
          title="This account has customer access only."
          action={
            <Button
              type="button"
              variant="quiet"
              size="sm"
              onClick={() => {
                setAlertDismissed(true);
                router.replace(tabHref(active));
              }}
            >
              Dismiss
            </Button>
          }
        >
          The console is reserved for administrator accounts, so you were sent here instead.
          Nothing about your own orders changed.
        </Alert>
      ) : null}

      {warnings.length > 0 && !dismissed ? (
        <Alert
          tone="warn"
          live
          title="Some of your guest bag did not carry over."
          action={
            <Button type="button" variant="quiet" size="sm" onClick={() => setDismissed(true)}>
              Dismiss
            </Button>
          }
        >
          <ul className="member-warnings">
            {warnings.map((warning) => (
              <li className="member-warnings__item" key={warning}>
                <Icon.CircleX size={14} />
                {warning}
              </li>
            ))}
          </ul>
        </Alert>
      ) : null}

      <div className="member__shell" data-pending={isPending || undefined}>
        <div className="member__tabs">
          <TabBar
            label="Account sections"
            value={active}
            onChange={select}
            items={[
              { id: "profile", label: "Profile", icon: <Icon.User size={16} /> },
              { id: "security", label: "Security", icon: <Icon.Shield size={16} /> },
              {
                id: "orders",
                label: "Orders",
                icon: <Icon.Package size={16} />,
                count: orders.length,
              },
            ]}
          />
        </div>

        <TabPanel id="profile" active={active === "profile"}>
          <ProfilePanel profile={profile} />
        </TabPanel>

        <TabPanel id="security" active={active === "security"}>
          <SecurityPanel />
        </TabPanel>

        <TabPanel id="orders" active={active === "orders"}>
          <OrdersPanel orders={orders} />
        </TabPanel>
      </div>

      {profile.is_active ? null : (
        <EmptyState
          icon={<Icon.Alert size={22} />}
          title="This account is marked inactive"
          action={undefined}
        >
          Sign-in still works for reading old orders, but new checkout is not guaranteed until the
          account is reactivated.
        </EmptyState>
      )}
    </div>
  );
}

export default AccountDashboard;
