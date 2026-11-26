"use client";

// The full inbox ("tab sendiri"): conversation list on the left, the chosen
// thread on the right. The same conversations are reachable from the chat
// popup on any client page. Phones get a single-column inbox.
import { ClientArt } from "@/components/home/ClientArt";
import { ClientInboxList, ConsultantShortcut, InboxPane } from "@/components/messages/Inbox";
import { ClientShell } from "@/components/shell/ClientShell";
import { WithUser } from "@/components/WithUser";

export default function ClientMessagesPage() {
  return (
    <WithUser allowedRoles={["client"]} loginPath="/login">
      {(user) => (
        <ClientShell user={user}>
          {/* Mobile: one column inbox. */}
          <div className="wd-container py-8 md:hidden">
            <p className="wd-kicker">Pesan</p>
            <h1 className="wd-display mt-1 text-[2.2rem] leading-tight">
              Kotak <em>masuk</em>
            </h1>
            <p className="mt-2 text-wd-text">Percakapan dengan vendor dan Wedding Consultant.</p>
            <div className="-mx-1.5 mt-4">
              <ClientInboxList userId={user.id} />
            </div>
            <ConsultantShortcut className="mt-4" />
          </div>

          {/* Desktop: two panes, the right one waits for a chosen thread. */}
          <div className="wd-container hidden py-8 md:block">
            <div className="grid h-[calc(100dvh-11rem)] min-h-[520px] grid-cols-[320px_minmax(0,1fr)] gap-8 lg:grid-cols-[360px_minmax(0,1fr)]">
              <InboxPane userId={user.id} />
              <div className="flex flex-col items-center justify-center rounded-[22px] border-2 border-dashed border-wd-accent bg-wd-accent-wash px-8 text-center">
                <span aria-hidden className="block h-32 w-32">
                  <ClientArt kind="bubble" />
                </span>
                <p className="wd-display mt-4 text-[1.9rem] leading-tight">Pilih percakapan</p>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-wd-text">Semua obrolan dengan vendor tersimpan di sini sebagai catatan kesepakatanmu, termasuk paket, tanggal, dan harga.</p>
              </div>
            </div>
          </div>
        </ClientShell>
      )}
    </WithUser>
  );
}
