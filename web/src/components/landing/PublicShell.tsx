import { HomeFooter } from "@/components/home/HomeFooter";
import { HomeNav } from "@/components/home/HomeNav";

/** Marketplace header + champagne footer around a public page ("Putih"
 * system). `overlay` is accepted for older callers and ignored: the header is
 * always solid white now. */
export function PublicShell({ children }: { children: React.ReactNode; overlay?: boolean }) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <HomeNav />
      <main id="konten" className="flex-1">
        {children}
      </main>
      <HomeFooter />
    </div>
  );
}
