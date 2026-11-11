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

// Narrative: search (the door) -> what you can find (categories as photos,
// real vendors) -> the app itself, screen by screen -> where your money is ->
// the invitation that fills itself from your plan -> try the budget ->
// ideas to save -> a human to ask -> vendors join -> close.
// Show, don't tell: every section below the hero carries real imagery, real
// API data or real captures of the product. Backgrounds alternate scene,
// paper, cream, white, cream, ink (the one ink block), paper, white, cream,
// paper, photo, so no two neighbours share a ground.
export default function Page() {
  return (
    <>
      <Navbar overlay />
      <main id="konten" className="flex-1">
        <HeroScene />
        <CategoryMosaic />
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
