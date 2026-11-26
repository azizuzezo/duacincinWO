"use client";

import { use, useState } from "react";

import { ChatThread } from "@/components/ChatThread";
import { InboxPane, ThreadHeader, useMobileFullscreen } from "@/components/messages/Inbox";
import { ClientShell } from "@/components/shell/ClientShell";
import { WithUser } from "@/components/WithUser";
import type { Conversation, CurrentUser } from "@/lib/api";

export default function ClientMessageThreadPage({ params }: PageProps<"/client/messages/[id]">) {
  const { id } = use(params);

  return (
    <WithUser allowedRoles={["client"]} loginPath="/login">
      {(user) => <ThreadContent id={id} user={user} />}
    </WithUser>
  );
}

function ThreadContent({ id, user }: { id: string; user: CurrentUser }) {
  const [conversations, setConversations] = useState<Conversation[] | null>(null);
  const sectionRef = useMobileFullscreen();
  const conversation = conversations?.find((c) => c.id === id);

  return (
    <ClientShell user={user}>
      <div className="wd-container md:py-8">
        {/* Desktop: inbox list beside the open thread. Mobile: the thread alone, full screen. */}
        <div className="md:grid md:h-[calc(100dvh-11rem)] md:min-h-[520px] md:grid-cols-[320px_minmax(0,1fr)] md:gap-8 lg:grid-cols-[360px_minmax(0,1fr)]">
          <InboxPane userId={user.id} activeId={id} onLoaded={setConversations} />
          <section
            ref={sectionRef}
            aria-label="Percakapan"
            className="fixed inset-0 z-50 bg-white md:static md:z-auto md:min-h-0 md:overflow-hidden md:rounded-[22px] md:ring-1 md:ring-wd-line md:shadow-wd-card"
          >
            <ChatThread
              conversationId={id}
              currentUserId={user.id}
              variant="fill"
              header={<ThreadHeader conversation={conversation} userId={user.id} />}
            />
          </section>
        </div>
      </div>
    </ClientShell>
  );
}
