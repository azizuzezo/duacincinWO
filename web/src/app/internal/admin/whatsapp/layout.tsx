import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Kirim WhatsApp", template: "%s | DuaCincin" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
