"use client";

import { WithUser } from "@/components/WithUser";
import { ConversationList } from "@/components/ConversationList";

export default function ClientMessagesPage() {
  return (
    <WithUser allowedRoles={["client"]} loginPath="/client/login">
      {() => (
        <main className="mx-auto max-w-2xl px-4 py-10">
          <h1 className="font-heading mb-6 text-2xl font-extrabold text-dc-navy">Pesan</h1>
          <ConversationList basePath="/client/messages" emptyLabel="Belum ada percakapan. Mulai dari halaman vendor atau chat Wedding Consultant." />
        </main>
      )}
    </WithUser>
  );
}
