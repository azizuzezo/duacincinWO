import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { fetchAskEnabled } from "@/components/landing/ask/AskAISection";
import { KiranaChatPage } from "@/components/landing/ask/KiranaChatPage";
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
  // Without an AI configured on the server there is nothing to talk to:
  // send people to the vendor directory instead of an empty chat.
  if (!(await fetchAskEnabled())) {
    redirect("/vendors");
  }
  return (
    <Suspense>
      <KiranaChatPage />
    </Suspense>
  );
}
