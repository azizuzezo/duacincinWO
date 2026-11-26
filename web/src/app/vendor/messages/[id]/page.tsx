"use client";

import { use } from "react";

import { ChatThread } from "@/components/ChatThread";
import { useMobileFullscreen } from "@/components/messages/Inbox";
import { VendorInboxPane, VendorThreadHeader } from "@/components/messages/VendorInbox";
import { VENDOR_NAV } from "@/components/shell/navConfig";
import { VendorShell } from "@/components/shell/VendorShell";
import { WithUser } from "@/components/WithUser";
import { apiPost, type CurrentUser } from "@/lib/api";
import { useAIEnabled } from "@/lib/useAIEnabled";

export default function VendorMessageThreadPage({ params }: PageProps<"/vendor/messages/[id]">) {
  const { id } = use(params);
  return (
    <WithUser allowedRoles={["vendor"]} loginPath="/login">
      {(user) => <ThreadContent id={id} user={user} />}
    </WithUser>
  );
}

function ThreadContent({ id, user }: { id: string; user: CurrentUser }) {
  const aiOn = useAIEnabled();
  const sectionRef = useMobileFullscreen();

  return (
    <VendorShell user={user} navItems={VENDOR_NAV} tone="wd" loginPath="/login" eyebrow="Vendor">
      <div className="wd-container md:py-8">
        {/* Desktop: inbox list beside the open thread. Phones: the thread alone, full screen. */}
        <div className="md:grid md:h-[calc(100dvh-13rem)] md:min-h-[520px] md:grid-cols-[320px_minmax(0,1fr)] md:gap-8 lg:grid-cols-[360px_minmax(0,1fr)]">
          <VendorInboxPane userId={user.id} activeId={id} />
          <section
            ref={sectionRef}
            aria-label="Percakapan"
            className="fixed inset-0 z-50 bg-white md:static md:z-auto md:min-h-0 md:overflow-hidden md:rounded-[22px] md:ring-1 md:ring-wd-line md:shadow-wd-card"
          >
            <ChatThread
              conversationId={id}
              currentUserId={user.id}
              variant="fill"
              header={<VendorThreadHeader userId={user.id} />}
              draftAssist={aiOn ? () => apiPost<{ draft: string }>("/api/v1/vendor/ai/reply-draft", { conversation_id: id }).then((r) => r.draft) : undefined}
            />
          </section>
        </div>
      </div>
    </VendorShell>
  );
}
