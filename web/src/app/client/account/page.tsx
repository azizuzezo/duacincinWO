"use client";

// Client account: a profile header, then plain sections (account data, wedding
// date, WhatsApp number, password) and two short link lists (agreements, help).
// No boxed cards: gold rules and hairlines separate the parts.
import Link from "next/link";
import { useState } from "react";

import { AvatarEditor } from "@/components/client/AvatarEditor";
import { WeddingDateField } from "@/components/client/WeddingDateField";
import { ClientArt, type ArtKind } from "@/components/home/ClientArt";
import { ClientShell } from "@/components/shell/ClientShell";
import { PasswordSection } from "@/components/PasswordSection";
import { WhatsAppNumberCard } from "@/components/wa/WhatsAppVerify";
import { WithUser } from "@/components/WithUser";
import type { CurrentUser } from "@/lib/api";

export default function ClientAccountPage() {
  return (
    <WithUser allowedRoles={["client"]} loginPath="/login">
      {(user) => <ClientAccountContent user={user} />}
    </WithUser>
  );
}

// Agreements a client accepts at sign-up (register page, client role).
const AGREEMENTS: { href: string; title: string; body: string; art: ArtKind }[] = [
  { href: "/legal/client-tos", title: "Ketentuan Layanan Client", body: "Kamu menyetujuinya saat mendaftar. Baca kembali kapan saja.", art: "clipboard" },
];

const HELP: { href: string; title: string; body: string; art: ArtKind }[] = [
  { href: "/cara-kerja", title: "Cara kerja DuaCincin", body: "Dari mencari vendor sampai dana diteruskan setelah acara.", art: "coin" },
  { href: "/bantuan", title: "Pusat bantuan", body: "Jawaban untuk pertanyaan yang sering muncul.", art: "bubble" },
];

const SECTION = "border-t-[3px] border-wd-accent pt-5";
const H2 = "wd-title text-[1.5rem] leading-tight";

function ClientAccountContent({ user }: { user: CurrentUser }) {
  const [weddingDate, setWeddingDate] = useState(user.wedding_date ?? "");
  return (
    <ClientShell user={user}>
      <div className="wd-container pb-16 pt-8 sm:pt-10">
        {/* Profile: initials avatar (no generated photos), name, email. */}
        <header className="flex flex-wrap items-center gap-5 sm:gap-7">
          <AvatarEditor user={user} />
          <div className="min-w-0">
            <p className="wd-kicker">Akun</p>
            <h1 className="wd-display break-words text-[clamp(2rem,4vw,3rem)] leading-[1.05]">{user.full_name || "Tanpa nama"}</h1>
            <p className="mt-1 break-words text-wd-text">
              {user.email} <span className="text-wd-muted">· Akun calon pengantin</span>
            </p>
          </div>
        </header>

        <div className="mt-12 grid grid-cols-1 items-start gap-x-14 gap-y-12 lg:grid-cols-12">
          <div className="flex flex-col gap-12 lg:col-span-7">
            <section aria-labelledby="data-akun" className={SECTION}>
              <h2 id="data-akun" className={H2}>
                Data akun
              </h2>
              <dl className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="min-w-0">
                  <dt className="text-sm text-wd-text">Nama lengkap</dt>
                  <dd className="mt-1 break-words font-semibold text-wd-ink">{user.full_name || "Belum diisi"}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-sm text-wd-text">Email untuk masuk</dt>
                  <dd className="mt-1 break-words font-semibold text-wd-ink">{user.email}</dd>
                </div>
              </dl>
            </section>

            <section aria-labelledby="tanggal-nikah" className={SECTION}>
              <h2 id="tanggal-nikah" className={H2}>
                Tanggal nikah
              </h2>
              <div className="mt-4">
                <WeddingDateField value={weddingDate} onSaved={setWeddingDate} />
              </div>
            </section>

            <section aria-labelledby="wa" className={SECTION}>
              <h2 id="wa" className="sr-only">
                Nomor WhatsApp
              </h2>
              <WhatsAppNumberCard className="!rounded-none !border-0 !bg-transparent !p-0" />
            </section>

            <section aria-label="Ubah password" className={`${SECTION} wd-password`}>
              <PasswordSection />
            </section>
          </div>

          <div className="flex flex-col gap-10 lg:col-span-5">
            <LinkList title="Perjanjian" items={AGREEMENTS} />
            <LinkList title="Butuh bantuan?" items={HELP} />
          </div>
        </div>
      </div>
    </ClientShell>
  );
}

function LinkList({ title, items }: { title: string; items: { href: string; title: string; body: string; art: ArtKind }[] }) {
  return (
    <section className={SECTION}>
      <h2 className={H2}>{title}</h2>
      <ul className="mt-3 divide-y divide-wd-line border-y border-wd-line">
        {items.map((it) => (
          <li key={it.href}>
            <Link href={it.href} className="group flex min-h-16 items-center gap-3 py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wd-accent">
              <span className="block h-12 w-12 shrink-0 rounded-full bg-wd-accent-wash p-2 ring-1 ring-wd-line transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:-rotate-6 group-hover:scale-110 motion-reduce:transition-none motion-reduce:group-hover:transform-none">
                <ClientArt kind={it.art} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-wd-ink group-hover:text-wd-accent-ink">{it.title}</span>
                <span className="block text-sm text-wd-text">{it.body}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
