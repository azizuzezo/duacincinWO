import { AntiCircumvention } from "@/components/landing/AntiCircumvention";
import { BudgetDemo } from "@/components/landing/BudgetDemo";
import { CategoryIndex } from "@/components/landing/CategoryIndex";
import { ConsultantBlock } from "@/components/landing/ConsultantBlock";
import { CTABanner } from "@/components/landing/CTABanner";
import { EscrowStory } from "@/components/landing/EscrowStory";
import { Footer } from "@/components/landing/Footer";
import { HeroScene } from "@/components/landing/HeroScene";
import { Navbar } from "@/components/landing/Navbar";
import { Planner } from "@/components/landing/Planner";
import { VendorRecruit } from "@/components/landing/VendorRecruit";

// Narrative order: search (the door) -> what you can find -> how your money is
// safe -> a human to ask -> tools after booking -> why it stays in-platform ->
// vendors -> close. Rhythm alternates scene, paper, cream, ink, paper, white,
// cream, paper, photo so no two neighbours share a composition.
export default function Page() {
  return (
    <>
      <Navbar overlay />
      <main id="konten" className="flex-1">
        <HeroScene />
        <CategoryIndex />
        <EscrowStory />
        <ConsultantBlock />
        <Planner />
        <BudgetDemo />
        <AntiCircumvention />
        <VendorRecruit />
        <CTABanner />
      </main>
      <Footer />
    </>
  );
}
