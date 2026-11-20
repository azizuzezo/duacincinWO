import type { Metadata } from "next";
import { Suspense } from "react";

import { fetchAskEnabled } from "@/components/landing/ask/AskAISection";
import { KiranaChatPage } from "@/components/landing/ask/KiranaChatPage";
import { KiranaOffline } from "@/components/landing/ask/KiranaOffline";
import { JsonLd, ORGANIZATION_REF, WEBSITE_REF } from "@/components/seo/JsonLd";
import { SITE_URL } from "@/lib/site";

const DESCRIPTION =
  "Tanya Kirana soal budget, vendor terdaftar di kotamu, ide konsep, dan urutan persiapan pernikahan. Gratis, tanpa perlu daftar.";

// Checked per request (the status itself is cached 60s), so a build made
// while the API was down never bakes in a redirect away from Kirana.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Kirana, asisten AI pernikahan",
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/kirana` },
};

export default async function KiranaPage() {
  // Assistant off or not configured: hand over to a Wedding Consultant.
  if (!(await fetchAskEnabled())) return <KiranaOffline />;
  return (
    <>
      {/* The chat is the page; its name is the heading for screen readers and crawlers. */}
      <h1 className="sr-only">Kirana, asisten AI pernikahan DuaCincin</h1>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "Kirana",
          url: `${SITE_URL}/kirana`,
          description: DESCRIPTION,
          applicationCategory: "LifestyleApplication",
          operatingSystem: "Web",
          inLanguage: "id-ID",
          isAccessibleForFree: true,
          offers: { "@type": "Offer", price: "0", priceCurrency: "IDR" },
          publisher: ORGANIZATION_REF,
          isPartOf: WEBSITE_REF,
        }}
      />
      <Suspense>
        <KiranaChatPage />
      </Suspense>
    </>
  );
}
