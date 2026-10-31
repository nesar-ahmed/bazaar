"use client";

/** Last-resort boundary: replaces the root layout itself, so it must render its
 *  own <html> and <body> and cannot rely on the design system being mounted. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#f7f7f3",
          color: "#232833",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          padding: "2rem",
        }}
      >
        <main style={{ maxWidth: "34rem", textAlign: "center" }}>
          <p style={{ fontFamily: "monospace", fontSize: "0.75rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "#7b8288" }}>
            Bazaar
          </p>
          <h1 style={{ fontSize: "2rem", letterSpacing: "-0.03em", margin: "0.75rem 0" }}>
            The storefront could not start
          </h1>
          <p style={{ lineHeight: 1.7, color: "#4c525b" }}>
            {error.message || "A fatal rendering error occurred."}
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              minHeight: "2.875rem",
              padding: "0 1.25rem",
              borderRadius: 7,
              border: 0,
              background: "#232833",
              color: "#f7f7f3",
              fontSize: "0.9375rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reload the storefront
          </button>
        </main>
      </body>
    </html>
  );
}
