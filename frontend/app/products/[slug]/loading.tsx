export default function ProductLoading() {
  return (
    <div className="container" aria-busy="true" aria-label="Loading this piece">
      <div className="pdp">
        <div className="pdp__crumbs">
          <span className="skeleton" style={{ height: "0.75rem", width: "14rem" }} />
        </div>
        <figure className="pdp__media">
          <div className="pdp__frame">
            <span className="skeleton" style={{ position: "absolute", inset: 0 }} />
          </div>
        </figure>
        <div className="pdp__info">
          <span className="skeleton" style={{ height: "0.75rem", width: "8rem" }} />
          <span className="skeleton skeleton--title" style={{ height: "3rem", width: "100%" }} />
          <span className="skeleton" style={{ height: "1.75rem", width: "7rem" }} />
          {[0, 1, 2].map((key) => (
            <span className="skeleton" style={{ height: "0.875rem", width: `${90 - key * 12}%` }} key={key} />
          ))}
          <div className="pdp__buy">
            <span className="skeleton" style={{ height: "2.875rem", width: "9rem" }} />
            <span className="skeleton" style={{ height: "3.25rem", width: "16rem" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
