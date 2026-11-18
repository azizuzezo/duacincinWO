import { AdatMarquee } from "@/components/landing/AdatMarquee";
import { BudgetDemo } from "@/components/landing/BudgetDemo";
import { CategoryMosaic } from "@/components/landing/CategoryMosaic";
import { ConsultantBlock } from "@/components/landing/ConsultantBlock";
import { CTABanner } from "@/components/landing/CTABanner";
import { EscrowCoin } from "@/components/landing/EscrowCoin";
import { FeaturedVendors } from "@/components/landing/FeaturedVendors";
import { Footer } from "@/components/landing/Footer";
import { HeroScene } from "@/components/landing/HeroScene";
import { InspirationTeaser } from "@/components/landing/InspirationTeaser";
import { InvitationLink } from "@/components/landing/InvitationLink";
import { Navbar } from "@/components/landing/Navbar";
import { ProductShowcase } from "@/components/landing/ProductShowcase";
import { VendorRecruit } from "@/components/landing/VendorRecruit";
import { WhyDuaCincin } from "@/components/landing/WhyDuaCincin";
import { JsonLd, ORGANIZATION_LD } from "@/components/seo/JsonLd";
import { SITE_URL } from "@/lib/site";

// Who runs the site, and the vendor search as a sitelinks search box.
const SITE_LD = {
  "@context": "https://schema.org",
  "@graph": [
    ORGANIZATION_LD,
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: "DuaCincin",
      url: SITE_URL,
      inLanguage: "id-ID",
      publisher: { "@id": ORGANIZATION_LD["@id"] },
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/vendors?q={search_term_string}` },
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

// Narrative: search (the door) -> what you can find (categories as photos,
// real vendors) -> the app itself, screen by screen -> where your money is ->
// the invitation that fills itself from your plan -> try the budget ->
// ideas to save -> a human to ask -> vendors join -> close.
// Show, don't tell: every section below the hero carries real imagery, real
// API data or real captures of the product. Backgrounds alternate scene,
// paper, cream, white, cream, ink (the one ink block), paper, white, cream,
// paper, photo, so no two neighbours share a ground. Investor-facing
// additions: the adat type band (white), the usual way vs DuaCincin
// (ivory + one ink panel) (founders live on /tentang-kami).
export default function Page() {
  return (
    <>
      <Navbar overlay />
      <main id="konten" className="flex-1">
        <JsonLd data={SITE_LD} />
        <HeroScene />
        <CategoryMosaic />
        <AdatMarquee />
        <WhyDuaCincin />
        <FeaturedVendors />
        <ProductShowcase />
        <EscrowCoin />
        <InvitationLink />
        <BudgetDemo />
        <InspirationTeaser />
        <ConsultantBlock />
        <VendorRecruit />
        <CTABanner />
      </main>
      <Footer />
    </>
  );
}
