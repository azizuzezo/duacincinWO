"use client";

import Link from "next/link";
import { use } from "react";

import { ChatThread } from "@/components/ChatThread";
import { ConversationAvatar, describeConversation } from "@/components/ConversationList";
import { ChatSessionButton, useChatSession } from "@/components/messages/ChatSession";
import { VENDOR_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { WithUser } from "@/components/WithUser";

export default function VendorMessageThreadPage({
  params,
}: PageProps<"/vendor/messages/[id]">) {
  const { id } = use(params);

  return (
    <WithUser allowedRoles={["vendor"]} loginPath="/login">
      {(user) => (
        <Shell user={user} navItems={VENDOR_NAV} loginPath="/login" eyebrow="Vendor">
          <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6 sm:py-8">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <Link
                href="/vendor/messages"
                className="-ml-1 inline-flex min-h-11 items-center gap-1.5 rounded-md px-1 text-sm font-semibold text-dc-clay underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold"
              >
                <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 6l-6 6 6 6" />
                </svg>
                Semua pesan
              </Link>
              <Link
                href="/vendor/bookings"
                className="inline-flex min-h-11 items-center rounded-md px-1 text-sm font-semibold text-dc-text-2 underline-offset-4 hover:text-dc-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold"
              >
                Booking masuk
              </Link>
            </div>
            <ChatThread conversationId={id} currentUserId={user.id} header={<VendorThreadHeader />} />
          </div>
        </Shell>
      )}
    </WithUser>
  );
}

/** Who the vendor is talking to, plus "Tutup sesi". Reads the thread's own
 * conversation, so it shows the same session state as the composer. */
function VendorThreadHeader() {
  const session = useChatSession();
  const conv = session?.conversation;
  if (!conv) {
    return (
      <div className="flex min-h-16 items-center gap-3 border-b border-dc-line bg-dc-white px-4" aria-hidden>
        <span className="dc-skeleton block h-10 w-10 rounded-full" />
        <span className="dc-skeleton block h-4 w-40 rounded-full" />
      </div>
    );
  }
  const d = describeConversation(conv, session.currentUserId);
  return (
    <div className="flex min-h-16 items-center gap-3 border-b border-dc-line bg-dc-white px-3 sm:px-4">
      <ConversationAvatar name={d.name} consult={d.consult} size="sm" />
      <div className="min-w-0 flex-1 py-2">
        <h1 className="truncate font-heading text-xl leading-tight text-dc-ink sm:text-2xl">{d.name}</h1>
        <p className="truncate text-xs text-dc-text-3">{d.role}</p>
      </div>
      <ChatSessionButton />
    </div>
  );
}
