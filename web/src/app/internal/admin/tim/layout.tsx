import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Tim Internal", template: "%s | DuaCincin" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
