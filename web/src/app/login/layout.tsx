import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: { default: "Masuk", template: "%s | DuaCincin" },
  robots: { index: false, follow: true },
};

// White page (the "Putih" system), so the browser bar matches it.
export const viewport: Viewport = { themeColor: "#ffffff" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
