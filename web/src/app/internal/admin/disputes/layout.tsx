import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Sengketa", template: "%s | DuaCincin" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
