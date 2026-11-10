import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";

/** Navbar + footer around a public page. `overlay` (default): the navbar is
 * transparent over the page's PageHero and turns ivory on scroll. Pages that
 * open on paper instead of a photo pass `overlay={false}` for a solid bar. */
export function PublicShell({ children, overlay = true }: { children: React.ReactNode; overlay?: boolean }) {
  return (
    <div className="flex min-h-screen flex-col bg-dc-ivory">
      <Navbar overlay={overlay} />
      <main id="konten" className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
