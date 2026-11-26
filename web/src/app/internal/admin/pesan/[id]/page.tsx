"use client";

import Link from "next/link";
import { use } from "react";

import { AdmConvPane } from "@/components/admin/admPanes";
import { ADM_FOCUS } from "@/components/admin/admUi";
import { ChatThread } from "@/components/ChatThread";
import { ConversationAvatar, describeConversation } from "@/components/ConversationList";
import { ChatSessionButton, useChatSession } from "@/components/messages/ChatSession";
import { useMobileFullscreen } from "@/components/messages/Inbox";
import { ADMIN_NAV } from "@/components/shell/navConfig";
import { AdminShell } from "@/components/shell/AdminShell";
import { WithUser } from "@/components/WithUser";
import type { CurrentUser } from "@/lib/api";

export default function AdminVendorThreadPage({ params }: PageProps<"/internal/admin/pesan/[id]">) {
  const { id } = use(params);

  return (
    <WithUser allowedRoles={["admin"]} loginPath="/login">
      {(user) => <ThreadContent id={id} user={user} />}
    </WithUser>
  );
}

function ThreadContent({ id, user }: { id: string; user: CurrentUser }) {
  const sectionRef = useMobileFullscreen();
  return (
    <AdminShell tone="wd" user={user} navItems={ADMIN_NAV} loginPath="/login" eyebrow="Admin">
      <div className="wd-container md:py-8">
        <div className="md:grid md:h-[calc(100dvh-13rem)] md:min-h-[520px] md:grid-cols-[320px_minmax(0,1fr)] md:gap-8 lg:grid-cols-[360px_minmax(0,1fr)]">
          <AdmConvPane
            userId={user.id}
            basePath="/internal/admin/pesan"
            type="admin_vendor"
            activeId={id}
            searchPlaceholder="Cari nama vendor"
            emptyText="Mulai chat dari halaman detail vendor, lewat tombol Chat vendor."
            className="hidden md:flex"
          />
          <section
            ref={sectionRef}
            aria-label="Percakapan"
            className="fixed inset-0 z-50 bg-white md:static md:z-auto md:min-h-0 md:overflow-hidden md:rounded-[22px] md:ring-1 md:ring-wd-line md:shadow-wd-card"
          >
            <ChatThread conversationId={id} currentUserId={user.id} variant="fill" header={<AdminThreadHeader />} />
          </section>
        </div>
      </div>
    </AdminShell>
  );
}

/** The vendor's name, a link to its admin detail page, and "Tutup sesi". */
function AdminThreadHeader() {
  const session = useChatSession();
  const conv = session?.conversation;
  const back = (
    <Link href="/internal/admin/pesan" aria-label="Kembali ke pesan vendor" className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-wd-ink hover:bg-wd-accent-wash md:hidden ${ADM_FOCUS}`}>
      <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 18l-6-6 6-6" />
      </svg>
    </Link>
  );
  if (!conv) {
    return (
      <div className="flex min-h-16 items-center gap-3 border-b border-wd-line bg-white px-2 pt-[env(safe-area-inset-top)] sm:px-4" aria-hidden>
        {back}
        <span className="block h-10 w-10 animate-pulse rounded-full bg-wd-blush" />
        <span className="block h-4 w-40 animate-pulse rounded-full bg-wd-blush" />
      </div>
    );
  }
  const d = describeConversation(conv, session.currentUserId);
  return (
    <div className="flex min-h-16 items-center gap-2 border-b border-wd-line bg-white px-2 pt-[env(safe-area-inset-top)] sm:gap-3 sm:px-4">
      {back}
      <ConversationAvatar name={d.name} consult={d.consult} size="sm" />
      <div className="min-w-0 flex-1 py-2">
        <h1 className="wd-title truncate text-[1.1rem] leading-tight sm:text-[1.25rem]">{d.name}</h1>
        <p className="truncate text-xs text-wd-text">{d.role}</p>
      </div>
      {conv.vendor_id && (
        <Link
          href={`/internal/admin/vendors/${conv.vendor_id}`}
          className={`inline-flex min-h-11 shrink-0 items-center rounded-full border border-wd-line-2 px-3.5 text-xs font-semibold text-wd-ink transition-colors hover:border-wd-ink sm:text-sm ${ADM_FOCUS}`}
        >
          Detail vendor
        </Link>
      )}
      <ChatSessionButton />
    </div>
  );
}
