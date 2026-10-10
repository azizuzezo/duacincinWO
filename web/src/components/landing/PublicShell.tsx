import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";

/** Navbar (transparent over the page's PageHero) + footer around a public page. */
export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-dc-ivory">
      <Navbar overlay />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
