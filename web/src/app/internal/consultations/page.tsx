"use client";

import { WithUser } from "@/components/WithUser";
import { ConversationList } from "@/components/ConversationList";

export default function ConsultationsInboxPage() {
  return (
    <WithUser allowedRoles={["wedding_consultant", "admin"]} loginPath="/internal/login">
      {() => (
        <main className="mx-auto max-w-2xl px-4 py-10">
          <h1 className="font-heading mb-6 text-2xl font-extrabold text-dc-navy">Inbox Konsultasi</h1>
          <ConversationList basePath="/internal/consultations" emptyLabel="Belum ada Client yang memulai konsultasi." />
        </main>
      )}
    </WithUser>
  );
}
