"use client";

import { ClientArt } from "@/components/home/ClientArt";
import { VendorInboxList, VendorInboxPane } from "@/components/messages/VendorInbox";
import { VENDOR_NAV } from "@/components/shell/navConfig";
import { VendorShell } from "@/components/shell/VendorShell";
import { WithUser } from "@/components/WithUser";

export default function VendorMessagesPage() {
  return (
    <WithUser allowedRoles={["vendor"]} loginPath="/login">
      {(user) => (
        <VendorShell user={user} navItems={VENDOR_NAV} tone="wd" loginPath="/login" eyebrow="Vendor">
          {/* Phones: one column inbox. */}
          <div className="wd-container pb-16 pt-8 md:hidden">
            <p className="wd-kicker">Pesan</p>
            <h1 className="wd-display mt-2 text-[clamp(2.1rem,4.4vw,3.4rem)] leading-[1.05]">
              Kotak <em>masuk</em>
            </h1>
            <p className="mt-2 text-wd-text">Pesan dari client dan tim DuaCincin.</p>
            <div className="-mx-1.5 mt-4">
              <VendorInboxList userId={user.id} />
            </div>
          </div>

          {/* Desktop: list on the left, the chosen thread on the right. */}
          <div className="wd-container hidden py-8 md:block">
            <div className="grid h-[calc(100dvh-13rem)] min-h-[520px] grid-cols-[320px_minmax(0,1fr)] gap-8 lg:grid-cols-[360px_minmax(0,1fr)]">
              <VendorInboxPane userId={user.id} />
              <div className="flex flex-col items-center justify-center rounded-[22px] border-2 border-dashed border-wd-accent bg-wd-accent-wash px-8 text-center">
                <span aria-hidden className="block h-32 w-32">
                  <ClientArt kind="bubble" />
                </span>
                <p className="wd-display mt-4 text-[1.9rem] leading-tight">Pilih percakapan</p>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-wd-text">Balas lewat chat ini supaya harga, tanggal, dan paket yang disepakati tercatat untuk kedua pihak.</p>
              </div>
            </div>
          </div>
        </VendorShell>
      )}
    </WithUser>
  );
}
