export default function Loading() {
  return (
    <div className="container section" aria-busy="true" aria-label="Loading Bazaar">
      <p className="label">Opening Bazaar</p>
      <span
        className="skeleton"
        aria-hidden="true"
        style={{ display: "block", width: "min(28rem, 80%)", height: "2.5rem", marginTop: "1rem" }}
      />
      <span
        className="skeleton"
        aria-hidden="true"
        style={{ display: "block", width: "min(38rem, 92%)", height: "1rem", marginTop: "1rem" }}
      />
    </div>
  );
}
