import { Skeleton } from "@/app/components/ui/display";

/** First-paint placeholder for the console. The server page hands real rows to
 *  the client component, so this only shows if a read is still in flight. */
export function ConsoleSkeleton() {
  return (
    <div className="ops" aria-busy="true">
      <header className="ops-head">
        <div className="ops-head__id">
          <p className="label">Bazaar operations</p>
          <h1 className="ops-title">Admin console</h1>
          <Skeleton className="skeleton--text" style={{ width: "18rem" }} />
        </div>
      </header>
      <div className="ops-loading">
        <Skeleton className="ops-loading__bar" />
        <Skeleton className="ops-loading__bar" style={{ width: "70%" }} />
        <Skeleton className="ops-loading__bar" style={{ width: "55%" }} />
        <p className="visually-hidden">Loading the console.</p>
      </div>
    </div>
  );
}
