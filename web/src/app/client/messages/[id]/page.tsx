"use client";

import { use, useState } from "react";

import { ChatThread } from "@/components/ChatThread";
import { InboxPane, ThreadHeader, useMobileFullscreen } from "@/components/messages/Inbox";
import { CLIENT_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
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
    <Shell user={user} navItems={CLIENT_NAV} loginPath="/login" eyebrow="Client">
      <div className="md:mx-auto md:max-w-6xl md:px-6 md:py-8">
        {/* Desktop: inbox list beside the open thread. Mobile: the thread alone, full screen. */}
        <div className="md:grid md:h-[calc(100dvh-4rem)] md:min-h-[560px] md:grid-cols-[300px_minmax(0,1fr)] md:gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
          <InboxPane userId={user.id} activeId={id} onLoaded={setConversations} />
          <section
            ref={sectionRef}
            aria-label="Percakapan"
            className="fixed inset-0 z-50 bg-dc-ivory md:static md:z-auto md:min-h-0 md:overflow-hidden md:rounded-xl md:border md:border-dc-line md:shadow-soft"
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
    </Shell>
  );
}
