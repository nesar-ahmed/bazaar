import type { Metadata } from "next";

import { ButtonLink } from "@/app/components/ui/button";
import { EmptyState } from "@/app/components/ui/display";
import { Icon } from "@/app/components/ui/icons";

export const metadata: Metadata = {
  title: "Order not found",
};

/** Reached by `notFound()` in this segment, so the reference itself is unknown. */
export default function OrderNotFound() {
  return (
    <div className="container flow-page">
      <div className="flow-crumbs">
        <p className="label">Order</p>
      </div>

      <header className="flow-head">
        <div className="flow-head__copy">
          <p className="label label--signal">No such entry</p>
          <h1>That reference did not open</h1>
          <p className="lede">
            A ledger entry is only ever readable by the account that placed it, so an unread
            reference has more than one cause.
          </p>
        </div>
        <div className="flow-head__aside">
          <ButtonLink href="/account?tab=orders" variant="outline" size="sm">
            <Icon.List size={15} />
            Order history
          </ButtonLink>
        </div>
      </header>

      <div className="bag__empty">
        <EmptyState
          icon={<Icon.CircleX size={22} />}
          title="Nothing is filed under that reference"
          action={
            <div className="order-actions">
              <ButtonLink href="/account?tab=orders" variant="cta">
                Open order history
                <Icon.ArrowRight size={16} />
              </ButtonLink>
              <ButtonLink href="/discover" variant="outline">
                Browse the collection
              </ButtonLink>
            </div>
          }
        >
          Either the order number is not on this account, it belongs to someone else, or the order
          service was not answering when the page was built. Open your account order history to see
          what is actually filed; if the list is empty too, try again in a moment.
        </EmptyState>
      </div>
    </div>
  );
}
