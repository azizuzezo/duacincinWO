import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const bodyFont = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const headingFont = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: "DuaCincin — Rencanakan Pernikahanmu Bersama Vendor Tepercaya",
  description:
    "DuaCincin menghubungkan calon pengantin dengan vendor wedding organizer tepercaya di Indonesia — direktori vendor, budget planner otomatis, dan wedding planner dalam satu platform.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${bodyFont.variable} ${headingFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-dc-white text-dc-black">
        {children}
      </body>
    </html>
  );
}
