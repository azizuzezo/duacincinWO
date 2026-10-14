import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Konfirmasi Kehadiran", template: "%s | DuaCincin" },
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
