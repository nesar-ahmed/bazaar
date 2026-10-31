import type { Metadata, Viewport } from "next";
import {
  Bricolage_Grotesque,
  IBM_Plex_Mono,
  Instrument_Sans,
} from "next/font/google";

import "./globals.css";

import { CartProvider } from "@/app/components/cart-provider";
import { SiteFooter } from "@/app/components/site-footer";
import { SiteHeader } from "@/app/components/site-header";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-bricolage",
  display: "swap",
});

const instrument = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-instrument",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

const origin = process.env.APP_ORIGIN ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(origin),
  title: {
    default: "Bazaar — a considered market for everyday things",
    template: "%s · Bazaar",
  },
  description:
    "Bazaar is a small, carefully filed shop: home and living, clothing and accessories, with live stock and honest pricing.",
  openGraph: {
    type: "website",
    siteName: "Bazaar",
    url: origin,
    title: "Bazaar — a considered market for everyday things",
    description: "Live stock, real prices, and a bag that follows you across devices.",
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
  other: { "color-scheme": "light dark" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f7f3" },
    { media: "(prefers-color-scheme: dark)", color: "#202636" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/** Set the theme before first paint so there is no light/dark flash. */
const themeScript = `(() => {
  try {
    var stored = localStorage.getItem('bazaar_theme');
    var next = stored === 'dark' || stored === 'light'
      ? stored
      : (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.dataset.theme = next;
    var motion = localStorage.getItem('bazaar_motion');
    if (motion) document.documentElement.dataset.motion = motion;
  } catch (error) {}
})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <body className={`${bricolage.variable} ${instrument.variable} ${plexMono.variable}`}>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <CartProvider>
          <a className="skip-link" href="#main">
            Skip to content
          </a>
          <SiteHeader />
          <main id="main">{children}</main>
          <SiteFooter />
        </CartProvider>
      </body>
    </html>
  );
}
