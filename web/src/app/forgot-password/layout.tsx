import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Lupa Kata Sandi", template: "%s | DuaCincin" },
  robots: { index: false, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
