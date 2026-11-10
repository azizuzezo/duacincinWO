"use client";

import { ConversationList } from "@/components/ConversationList";
import { ConsultantShortcut, InboxPane } from "@/components/messages/Inbox";
import { CLIENT_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Rings } from "@/components/ui/Rings";
import { WithUser } from "@/components/WithUser";

export default function ClientMessagesPage() {
  return (
    <WithUser allowedRoles={["client"]} loginPath="/login">
      {(user) => (
        <Shell user={user} navItems={CLIENT_NAV} loginPath="/login" eyebrow="Client">
          {/* Mobile: one column inbox. */}
          <div className="px-4 py-8 md:hidden">
            <PageHeader
              eyebrow="Pesan"
              title={
                <>
                  Kotak <span className="dc-em">masuk</span>
                </>
              }
              subtitle="Percakapan dengan vendor dan Wedding Consultant."
            />
            <ConversationList
              basePath="/client/messages"
              emptyLabel="Mulai dari halaman vendor atau chat Wedding Consultant."
              currentUserId={user.id}
            />
            <ConsultantShortcut className="mt-6" />
          </div>

          {/* Desktop: two panes, the right one waits for a chosen thread. */}
          <div className="mx-auto hidden max-w-6xl px-6 py-8 md:block">
            <div className="grid h-[calc(100dvh-4rem)] min-h-[560px] grid-cols-[300px_minmax(0,1fr)] gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
              <InboxPane userId={user.id} />
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-dc-line-strong bg-dc-white/60 px-8 text-center">
                <Rings className="h-12 w-20 text-dc-gold" stroke="currentColor" />
                <p className="mt-4 font-heading text-[2rem] leading-tight text-dc-ink">Pilih percakapan</p>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-dc-text-2">
                  Semua obrolan dengan vendor tersimpan di sini sebagai catatan kesepakatanmu, termasuk paket, tanggal, dan harga.
                </p>
              </div>
            </div>
          </div>
        </Shell>
      )}
    </WithUser>
  );
}
