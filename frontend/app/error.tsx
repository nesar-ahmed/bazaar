"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/app/components/ui/button";
import { Icon } from "@/app/components/ui/icons";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // The digest is what an operator needs to correlate this with a server log.
    console.error("Bazaar render error:", error);
  }, [error]);

  return (
    <div className="container section">
      <div className="catalog-state">
        <span className="empty__icon" aria-hidden="true">
          <Icon.Alert size={22} />
        </span>
        <p className="label">Something broke while this page rendered</p>
        <h1>The page could not be drawn</h1>
        <p>
          {error.message || "An unexpected error stopped this screen."} Retrying usually
          works; if it does not, the catalog service may be offline.
        </p>
        <div className="catalog-state__row">
          <Button variant="cta" onClick={reset}>
            <Icon.Refresh size={16} />
            Try again
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push("/discover")}
          >
            Open the collection
          </Button>
        </div>
        {error.digest ? (
          <p className="tiny muted mono">Reference {error.digest}</p>
        ) : null}
      </div>
    </div>
  );
}
