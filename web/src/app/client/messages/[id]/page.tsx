"use client";

import { use } from "react";

import { ChatThread } from "@/components/ChatThread";
import { WithUser } from "@/components/WithUser";

export default function ClientMessageThreadPage({ params }: PageProps<"/client/messages/[id]">) {
  const { id } = use(params);

  return (
    <WithUser allowedRoles={["client"]} loginPath="/client/login">
      {(user) => (
        <main className="mx-auto max-w-2xl px-4 py-10">
          <ChatThread conversationId={id} currentUserId={user.id} />
        </main>
      )}
    </WithUser>
  );
}
