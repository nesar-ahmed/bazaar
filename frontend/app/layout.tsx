import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Bazaar | Find the good in everyday",
    template: "%s | Bazaar",
  },
  description:
    "Considered pieces, useful things, and small joys for the spaces and moments you call your own.",
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
