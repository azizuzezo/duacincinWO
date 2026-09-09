"use client";

import { WithUser } from "@/components/WithUser";
import { ConversationList } from "@/components/ConversationList";

export default function VendorMessagesPage() {
  return (
    <WithUser allowedRoles={["vendor"]} loginPath="/vendor/login">
      {() => (
        <main className="mx-auto max-w-2xl px-4 py-10">
          <h1 className="font-heading mb-6 text-2xl font-extrabold text-dc-navy">Pesan dari Client</h1>
          <ConversationList basePath="/vendor/messages" emptyLabel="Belum ada Client yang menghubungi." />
        </main>
      )}
    </WithUser>
  );
}
