import { AntiCircumvention } from "@/components/landing/AntiCircumvention";
import { BudgetDemo } from "@/components/landing/BudgetDemo";
import { CTABanner } from "@/components/landing/CTABanner";
import { FeaturesGrid } from "@/components/landing/FeaturesGrid";
import { Footer } from "@/components/landing/Footer";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Navbar } from "@/components/landing/Navbar";
import { TrustStrip } from "@/components/landing/TrustStrip";

export default function Page() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <Hero />
        <TrustStrip />
        <HowItWorks />
        <FeaturesGrid />
        <BudgetDemo />
        <AntiCircumvention />
        <CTABanner />
      </main>
      <Footer />
    </>
  );
}
