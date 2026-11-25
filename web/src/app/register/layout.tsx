import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: { default: "Daftar", template: "%s | DuaCincin" },
  alternates: { canonical: "/register" },
};

// White page (the "Putih" system), so the browser bar matches it.
export const viewport: Viewport = { themeColor: "#ffffff" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
