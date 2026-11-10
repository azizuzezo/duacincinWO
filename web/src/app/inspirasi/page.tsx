import { PublicShell } from "@/components/landing/PublicShell";
import { InspirationGallery } from "@/components/public/inspirasi/Gallery";
import { InspirasiHero } from "@/components/public/inspirasi/InspirasiHero";

// Paper hero (solid navbar) then the gallery on cream. Data, filters and the
// lightbox live in the client gallery; the page itself stays a server shell.
export default function InspirationGalleryPage() {
  return (
    <PublicShell overlay={false}>
      <InspirasiHero />
      <InspirationGallery />
    </PublicShell>
  );
}
