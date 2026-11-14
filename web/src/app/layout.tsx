import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Great_Vibes, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

import { RingsLoader } from "@/components/motion/RingsLoader";
import { RouteCurtain } from "@/components/motion/RouteCurtain";
import { ToastProvider } from "@/components/ui/Toast";
import { OPEN_GRAPH_BASE, SITE_URL } from "@/lib/site";

// One type family with invitation.duacincin.id (see DESIGN.md "Tipografi").
// UI and body: Plus Jakarta Sans, drawn in Jakarta (Tokotype), round and friendly.
const bodyFont = Plus_Jakarta_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// Display serif for every heading, with its italic for the accent phrase (.dc-em).
const displayFont = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

// Script: one emotional word per screen (.dc-script). Not preloaded: it is
// below the LCP text weight and only a few glyphs are ever drawn.
const scriptFont = Great_Vibes({
  variable: "--font-script-face",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  // Absolute og:image / twitter:image URLs. Production by default (src/lib/site.ts).
  metadataBase: new URL(SITE_URL),
  // "Nama Halaman | DuaCincin" on every page that sets its own title (PRD §10.7).
  title: { default: "DuaCincin: Rencanakan Pernikahanmu Bersama Vendor Tepercaya", template: "%s | DuaCincin" },
  description:
    "DuaCincin menghubungkan calon pengantin dengan vendor pernikahan terverifikasi di Indonesia. Direktori vendor, budget planner otomatis, dan pembayaran escrow dalam satu platform.",
  openGraph: { ...OPEN_GRAPH_BASE, type: "website" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#faf6ef",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      // Next 16 no longer turns smooth scrolling off while navigating; without
      // this, a new page animates its scroll-to-top and can land mid-page.
      data-scroll-behavior="smooth"
      // The intro script below may add "dc-no-intro" before hydration.
      suppressHydrationWarning
      className={`${bodyFont.variable} ${displayFont.variable} ${scriptFont.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-dc-ivory text-dc-black">
        {/* Intro: once per session, public pages only. Decided before paint. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var d=document.documentElement;if(/^\\/(client|vendor|internal)(\\/|$)/.test(location.pathname)||sessionStorage.getItem("dc-intro"))d.classList.add("dc-no-intro");else sessionStorage.setItem("dc-intro","1")}catch(e){document.documentElement.classList.add("dc-no-intro")}`,
          }}
        />
        <div aria-hidden className="dc-intro">
          <RingsLoader />
        </div>
        <RouteCurtain />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
