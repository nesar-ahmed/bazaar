import { ProductCardSkeleton } from "@/app/components/ui/display";

export default function DiscoverLoading() {
  return (
    <div className="container" aria-busy="true" aria-label="Loading the collection">
      <div className="browse">
        <div className="browse__main">
          <div className="browse__toolbar">
            <span className="skeleton" style={{ height: "1rem", width: "14rem" }} />
            <span className="skeleton" style={{ height: "2.5rem", width: "16rem" }} />
          </div>
          <div className="catalog-grid">
            {Array.from({ length: 8 }, (_, key) => (
              <ProductCardSkeleton key={key} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
