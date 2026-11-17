"use client";

import Link from "next/link";
import { use } from "react";

import { ChatThread } from "@/components/ChatThread";
import { ConversationAvatar, describeConversation } from "@/components/ConversationList";
import { ChatSessionButton, useChatSession } from "@/components/messages/ChatSession";
import { ADMIN_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { WithUser } from "@/components/WithUser";

export default function AdminVendorThreadPage({ params }: PageProps<"/internal/admin/pesan/[id]">) {
  const { id } = use(params);

  return (
    <WithUser allowedRoles={["admin"]} loginPath="/login">
      {(user) => (
        <Shell user={user} navItems={ADMIN_NAV} loginPath="/login" eyebrow="Admin">
          <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6 sm:py-8">
            <Link
              href="/internal/admin/pesan"
              className="-ml-1 mb-3 inline-flex min-h-11 items-center gap-1.5 rounded-md px-1 text-sm font-semibold text-dc-clay underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold"
            >
              <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 6l-6 6 6 6" />
              </svg>
              Pesan vendor
            </Link>
            <ChatThread conversationId={id} currentUserId={user.id} header={<AdminThreadHeader />} />
          </div>
        </Shell>
      )}
    </WithUser>
  );
}

/** The vendor's name, a link to its admin detail page, and "Tutup sesi". */
function AdminThreadHeader() {
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
      {conv.vendor_id && (
        <Link
          href={`/internal/admin/vendors/${conv.vendor_id}`}
          className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-dc-line-strong px-3.5 text-xs font-semibold text-dc-ink transition-colors hover:border-dc-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold sm:text-sm"
        >
          Detail vendor
        </Link>
      )}
      <ChatSessionButton />
    </div>
  );
}
