import type { Metadata } from "next";
import { Hanken_Grotesk, Instrument_Serif, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

import { ToastProvider } from "@/components/ui/Toast";

const bodyFont = Hanken_Grotesk({
  variable: "--font-body",
  subsets: ["latin"],
});

// Accent only: a real italic serif for the single expressive phrase per
// headline (.dc-em). Headings themselves are Plus Jakarta Sans, see DESIGN.md.
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const headingFont = Instrument_Serif({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  // "Nama Halaman | DuaCincin" on every page that sets its own title (PRD §10.7).
  title: { default: "DuaCincin: Rencanakan Pernikahanmu Bersama Vendor Tepercaya", template: "%s | DuaCincin" },
  description:
    "DuaCincin menghubungkan calon pengantin dengan vendor pernikahan terverifikasi di Indonesia. Direktori vendor, budget planner otomatis, dan pembayaran escrow dalam satu platform.",
  openGraph: { siteName: "DuaCincin", locale: "id_ID", type: "website" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${bodyFont.variable} ${headingFont.variable} ${jakarta.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-dc-ivory text-dc-black">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
