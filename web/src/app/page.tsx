import { AntiCircumvention } from "@/components/landing/AntiCircumvention";
import { BudgetDemo } from "@/components/landing/BudgetDemo";
import { CategoryStrip } from "@/components/landing/CategoryStrip";
import { CTABanner } from "@/components/landing/CTABanner";
import { Footer } from "@/components/landing/Footer";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Navbar } from "@/components/landing/Navbar";
import { Planner } from "@/components/landing/Planner";
import { VendorRecruit } from "@/components/landing/VendorRecruit";

export default function Page() {
  return (
    <>
      <Navbar overlay />
      <main className="flex-1">
        <Hero />
        <CategoryStrip />
        <HowItWorks />
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
