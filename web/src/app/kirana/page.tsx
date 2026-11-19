import type { Metadata } from "next";
import { Suspense } from "react";

import { fetchAskEnabled } from "@/components/landing/ask/AskAISection";
import { KiranaChatPage } from "@/components/landing/ask/KiranaChatPage";
import { KiranaOffline } from "@/components/landing/ask/KiranaOffline";
import { SITE_URL } from "@/lib/site";

// Checked per request (the status itself is cached 60s), so a build made
// while the API was down never bakes in a redirect away from Kirana.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Kirana, asisten AI pernikahan",
  description: "Tanya Kirana soal budget, vendor terdaftar di kotamu, ide konsep, dan urutan persiapan pernikahan. Gratis, tanpa perlu daftar.",
  alternates: { canonical: `${SITE_URL}/kirana` },
};

export default async function KiranaPage() {
  // Assistant off or not configured: hand over to a Wedding Consultant.
  if (!(await fetchAskEnabled())) return <KiranaOffline />;
  return (
    <Suspense>
      <KiranaChatPage />
    </Suspense>
  );
}
