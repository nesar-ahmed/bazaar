import Link from "next/link";

import { ButtonLink } from "@/app/components/ui/button";
import { Icon } from "@/app/components/ui/icons";

export default function NotFound() {
  return (
    <div className="container section">
      <div className="catalog-state">
        <span className="empty__icon" aria-hidden="true">
          <Icon.Tag size={22} />
        </span>
        <p className="label">Error 404 · nothing filed here</p>
        <h1>This page is not in the ledger</h1>
        <p>
          The address does not match a piece, an aisle, or a page. Pieces are filed by name,
          so a search is usually the fastest way back on track.
        </p>
        <div className="catalog-state__row">
          <ButtonLink href="/discover" variant="cta">
            Browse the collection
            <Icon.ArrowRight size={16} />
          </ButtonLink>
          <ButtonLink href="/" variant="outline">
            Back to the market
          </ButtonLink>
          <Link className="link" href="/account">
            Your account
          </Link>
        </div>
      </div>
    </div>
  );
}
