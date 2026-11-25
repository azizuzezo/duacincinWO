import { PageHero } from "@/components/landing/PageHero";
import { PublicShell } from "@/components/landing/PublicShell";
import { InspirationGallery } from "@/components/public/inspirasi/Gallery";

const PINTEREST_BOARD_URL = "https://id.pinterest.com/2cincinid/inspirasi-nikah-indonesia-venue-decor-mua-artis/";

// Compact header, then the gallery. Data, filters and the lightbox live in
// the client gallery; the page itself stays a server shell.
export default function InspirationGalleryPage() {
  return (
    <PublicShell>
      <div className="wd">
        <PageHero
          image="/banner/inspirasi.webp"
          crumbs={[{ name: "Inspirasi" }]}
          title="Inspirasi pernikahan"
          sub={
            <>
              Kurasi dari{" "}
              <a href={PINTEREST_BOARD_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-wd-accent-ink underline underline-offset-4 hover:text-wd-ink">
                papan Pinterest DuaCincin
              </a>
              . Ketuk foto untuk melihat vendornya.
            </>
          }
        />
        <InspirationGallery />
      </div>
    </PublicShell>
  );
}
