import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Daftar", template: "%s | DuaCincin" },
  alternates: { canonical: "/register" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
