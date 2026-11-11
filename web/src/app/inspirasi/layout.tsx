import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Inspirasi Pernikahan", template: "%s | DuaCincin" },
  description: "Inspirasi busana dan riasan pengantin adat dari berbagai daerah di Indonesia, lalu temukan vendornya di DuaCincin.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
