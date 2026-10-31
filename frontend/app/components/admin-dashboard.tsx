"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/app/components/ui/button";
import { Icon } from "@/app/components/ui/icons";
import { TabBar, TabPanel } from "@/app/components/ui/tabs";

import { OpsCategories } from "./ops/categories-panel";
import { OpsOrders } from "./ops/orders-panel";
import { OpsOverview } from "./ops/overview-panel";
import { OpsProducts } from "./ops/products-panel";
import { NoticeRegion } from "./ops/notice-region";
import { useConsoleStore, type ConsoleStore, type Seed } from "./ops/use-console-store";
import { readTabId, type RowTarget, type TabId } from "./ops/types";

const TABS: Array<{ id: TabId; label: string; icon: ReactNode }> = [
  { id: "overview", label: "Overview", icon: <Icon.Chart size={16} /> },
  { id: "products", label: "Products", icon: <Icon.Package size={16} /> },
  { id: "categories", label: "Aisles", icon: <Icon.Layers size={16} /> },
  { id: "orders", label: "Queue", icon: <Icon.Truck size={16} /> },
];

const DENSITY_KEY = "bazaar_ops_density";

function readDensity(): "regular" | "tight" {
  if (typeof window === "undefined") return "regular";
  try {
    return window.localStorage.getItem(DENSITY_KEY) === "tight" ? "tight" : "regular";
  } catch {
    return "regular";
  }
}

/**
 * The console: four panels over one store. The active tab lives in `?tab=`, so
 * a reload, a shared link and the back button all land where the operator was.
 */
export default function AdminDashboard(seed: Seed) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const tab = readTabId(params.get("tab"));

  const write = useCallback(
    (next: TabId) => {
      const query = new URLSearchParams(params.toString());
      query.set("tab", next);
      router.replace(`${pathname}?${query.toString()}`, { scroll: false });
    },
    [params, pathname, router],
  );

  const navigate = useCallback(
    (target: RowTarget) => {
      if (target.tab !== tab) write(target.tab);
    },
    [tab, write],
  );

  const store = useConsoleStore(seed, navigate);
  const lastRow = store.lastRow;

  const [density, setDensity] = useState<"regular" | "tight">(readDensity);

  useEffect(() => {
    try {
      window.localStorage.setItem(DENSITY_KEY, density);
    } catch {
      /* private mode: the preference lives for this page view only */
    }
  }, [density]);

  const countFor = (id: TabId): number | undefined => {
    if (id === "products") return store.products.length;
    if (id === "categories") return store.categories.length;
    if (id === "orders") return store.orders.length;
    return undefined;
  };

  const refreshAll = () => {
    store.reloadProducts();
    void store.reloadCategories();
    void store.reloadOrders();
  };

  return (
    <div className="ops" data-density={density}>
      <header className="ops-head">
        <div className="ops-head__id">
          <p className="label">Bazaar operations</p>
          <h1 className="ops-title">Admin console</h1>
          <p className="ops-sub tiny muted">
            {store.profile.full_name} · <span className="mono">{store.profile.email}</span> · role{" "}
            <span className="mono">{store.profile.role}</span>
          </p>
        </div>

        <div className="ops-head__tools">
          {lastRow ? (
            <button
              type="button"
              className="ops-lastact"
              onClick={() => store.goTo(lastRow)}
            >
              <span className="label">Last row touched</span>
              <span className="ops-lastact__label">{lastRow.label}</span>
              <span className="ops-lastact__tab mono">{lastRow.tab}</span>
            </button>
          ) : null}

          <div className="segmented" role="group" aria-label="Table density">
            <button
              type="button"
              className="segmented__btn"
              aria-pressed={density === "regular"}
              onClick={() => setDensity("regular")}
            >
              Regular
            </button>
            <button
              type="button"
              className="segmented__btn"
              aria-pressed={density === "tight"}
              onClick={() => setDensity("tight")}
            >
              Dense
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            icon={<Icon.Refresh size={15} />}
            loading={store.page.loading}
            onClick={refreshAll}
          >
            Re-read all
          </Button>
        </div>
      </header>

      <NoticeRegion notices={store.noticesFor("global")} dismiss={store.dismiss} />

      <div className="ops-tabs">
        <TabBar
          items={TABS.map((item) => ({
            id: item.id,
            label: item.label,
            icon: item.icon,
            count: countFor(item.id),
          }))}
          value={tab}
          onChange={(next) => write(readTabId(next))}
          label="Console sections"
        />
      </div>

      <div className="ops-body">
        <Panel tab={tab} id="overview" store={store}>
          <OpsOverview store={store} />
        </Panel>
        <Panel tab={tab} id="products" store={store}>
          <OpsProducts store={store} />
        </Panel>
        <Panel tab={tab} id="categories" store={store}>
          <OpsCategories store={store} />
        </Panel>
        <Panel tab={tab} id="orders" store={store}>
          <OpsOrders store={store} />
        </Panel>
      </div>

      <footer className="ops-footnote">
        <p className="tiny muted">
          Money is integer cents on the wire and tabular mono on screen. Every write goes through
          the BFF allow-list. Where the API has no total, no page and no buyer, the console says so
          instead of inventing one.
        </p>
      </footer>
    </div>
  );
}

function Panel({
  tab,
  id,
  store,
  children,
}: {
  tab: TabId;
  id: TabId;
  store: ConsoleStore;
  children: ReactNode;
}) {
  return (
    <TabPanel id={id} active={tab === id}>
      <div className="ops-panel" data-scope={id}>
        <NoticeRegion notices={store.noticesFor(id)} dismiss={store.dismiss} />
        {children}
      </div>
    </TabPanel>
  );
}
