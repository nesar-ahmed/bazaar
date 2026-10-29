import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bazaar | Discover something good",
  description: "Browse the latest finds at Bazaar.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
