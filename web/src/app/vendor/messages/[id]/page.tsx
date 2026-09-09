"use client";

import { use } from "react";

import { ChatThread } from "@/components/ChatThread";
import { WithUser } from "@/components/WithUser";

export default function VendorMessageThreadPage({ params }: PageProps<"/vendor/messages/[id]">) {
  const { id } = use(params);

  return (
    <WithUser allowedRoles={["vendor"]} loginPath="/vendor/login">
      {(user) => (
        <main className="mx-auto max-w-2xl px-4 py-10">
          <ChatThread conversationId={id} currentUserId={user.id} />
        </main>
      )}
    </WithUser>
  );
}
