import type { Metadata, Viewport } from "next";

import { Articles } from "@/components/home/Articles";
import { Banners } from "@/components/home/Banners";
import { BudgetTool } from "@/components/home/BudgetTool";
import { Categories } from "@/components/home/Categories";
import { Features } from "@/components/home/Features";
import { ForVendors } from "@/components/home/ForVendors";
import { HomeFooter } from "@/components/home/HomeFooter";
import { HowItWorks } from "@/components/home/HowItWorks";
import { HomeNav } from "@/components/home/HomeNav";
import { Inspiration } from "@/components/home/Inspiration";
import { PromoInvitation } from "@/components/home/PromoInvitation";
import { QuickTiles } from "@/components/home/QuickTiles";
import { CategoryRows } from "@/components/home/Vendors";
import { HowStrip } from "@/components/home/HowStrip";
import { Marketplace } from "@/components/home/Marketplace";
import { SearchHub } from "@/components/home/SearchHub";
import { fetchAskEnabled } from "@/components/landing/ask/AskAISection";
import { KiranaLauncher } from "@/components/landing/ask/KiranaLauncher";
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

// "Putih" design system (src/app/wd.css), laid out like the big wedding
// marketplaces (Bridestory, WeddingMarket): two-row header with search ->
// banner carousel -> quick tiles -> the H1 with
// vendor picks by category -> category circles -> vendor rows per top
// category -> invitation promo strip -> why DuaCincin (escrow, chat, planner,
// invitation, consultant) -> live budget split -> one more vendor row -> inspiration -> guides ->
// vendor recruitment -> pink footer. Vendors, counts and the gallery come
// from the API and show loading / retry / empty states; nothing is invented.
// Kirana (AI) appears as a banner and the floating launcher only when the
// assistant is configured.
// Home: the brand plus the search people type ("vendor pernikahan"), with
// a description short enough to show whole in results.
export const metadata: Metadata = {
  title: { absolute: "DuaCincin: Vendor Pernikahan Terverifikasi di Indonesia" },
  description:
    "Cari vendor pernikahan terverifikasi: venue, katering, MUA, foto, dekorasi. Bandingkan harga, chat langsung, dan bayar aman lewat Dana Aman (escrow) DuaCincin.",
  alternates: { canonical: "/" },
};

export const viewport: Viewport = { themeColor: "#ffffff" };

export default async function Page() {
  const askEnabled = await fetchAskEnabled();
  return (
    <div className="wd flex flex-1 flex-col">
      <HomeNav />
      <main id="konten" className="flex-1">
        <JsonLd data={SITE_LD} />
        <SearchHub />
        <Banners kirana={askEnabled} />
        <Marketplace />
        <HowStrip />
        <Categories />
        <CategoryRows max={2} />
        <QuickTiles kirana={askEnabled} />
        <PromoInvitation />
        <CategoryRows max={1} skip={2} />
        <BudgetTool />
        <HowItWorks />
        <Features />
        <Inspiration />
        <Articles />
        <ForVendors />
      </main>
      <HomeFooter />
      {askEnabled && <KiranaLauncher />}
    </div>
  );
}
