"use client";

import Link from "next/link";

import { FOCUS } from "@/app/client/_ui";
import { PasswordSection } from "@/components/PasswordSection";
import { CLIENT_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Rings } from "@/components/ui/Rings";
import { FadeIn } from "@/components/ui/Motion";
import { WithUser } from "@/components/WithUser";
import type { CurrentUser } from "@/lib/api";

export default function ClientAccountPage() {
  return (
    <WithUser allowedRoles={["client"]} loginPath="/login">
      {(user) => <ClientAccountContent user={user} />}
    </WithUser>
  );
}

function initials(name: string, email: string): string {
  const words = (name || email).trim().split(/\s+/).filter(Boolean);
  return ((words[0]?.[0] ?? "") + (words[1]?.[0] ?? "")).toUpperCase() || "DC";
}

// Agreements a client accepts at sign-up (register page, client role).
const AGREEMENTS = [
  { href: "/legal/client-tos", title: "Ketentuan Layanan Client", body: "Kamu menyetujuinya saat mendaftar. Baca kembali kapan saja." },
];

const HELP = [
  { href: "/cara-kerja", title: "Cara kerja DuaCincin", body: "Dari mencari vendor sampai dana diteruskan setelah acara." },
  { href: "/bantuan", title: "Pusat bantuan", body: "Jawaban untuk pertanyaan yang sering muncul." },
];

function ClientAccountContent({ user }: { user: CurrentUser }) {
  return (
    <Shell user={user} navItems={CLIENT_NAV} loginPath="/login" eyebrow="Client">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <PageHeader
          eyebrow="Akun"
          title={
            <>
              Profil & <span className="dc-em">keamanan</span>
            </>
          }
          subtitle="Data akunmu, password, dan perjanjian yang berlaku."
        />

        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
          <div className="flex flex-col gap-5 lg:col-span-7">
            {/* Profile: initials avatar (no generated photos), name, email. */}
            <Card className="overflow-hidden">
              <div className="relative flex flex-wrap items-center gap-5 overflow-hidden bg-dc-cream/70 px-6 py-6 sm:px-8">
                <Rings className="pointer-events-none absolute -right-6 -top-8 h-40 w-64 opacity-40" />
                <span
                  aria-hidden
                  className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-dc-gold bg-dc-white font-heading text-3xl text-dc-ink ring-4 ring-dc-white"
                >
                  {initials(user.full_name, user.email)}
                </span>
                <div className="min-w-0">
                  <p className="break-words font-heading text-[2rem] leading-tight text-dc-ink">{user.full_name || "Tanpa nama"}</p>
                  <p className="text-sm text-dc-text-2">Akun calon pengantin</p>
                </div>
              </div>
              <dl className="grid grid-cols-1 gap-5 px-6 py-6 sm:grid-cols-2 sm:px-8">
                <div className="min-w-0">
                  <dt className="text-sm text-dc-text-3">Nama lengkap</dt>
                  <dd className="mt-1 break-words font-semibold text-dc-ink">{user.full_name || "Belum diisi"}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-sm text-dc-text-3">Email untuk masuk</dt>
                  <dd className="mt-1 break-words font-semibold text-dc-ink">{user.email}</dd>
                </div>
              </dl>
            </Card>

            <Card className="p-6 sm:p-8">
              <PasswordSection />
            </Card>
          </div>

          <FadeIn inView={false} delay={0.08} className="flex flex-col gap-5 lg:col-span-5">
            <Card className="p-6 sm:p-8">
              <h2 className="font-heading text-[1.75rem] leading-tight text-dc-ink">Perjanjian</h2>
              <ul className="mt-4 flex flex-col gap-3">
                {AGREEMENTS.map((a) => (
                  <li key={a.href}>
                    <DocLink {...a} />
                  </li>
                ))}
              </ul>
            </Card>
            <Card tone="paper" className="p-6 sm:p-8">
              <h2 className="font-heading text-[1.75rem] leading-tight text-dc-ink">Butuh bantuan?</h2>
              <ul className="mt-4 flex flex-col gap-3">
                {HELP.map((a) => (
                  <li key={a.href}>
                    <DocLink {...a} />
                  </li>
                ))}
              </ul>
            </Card>
          </FadeIn>
        </div>
      </div>
    </Shell>
  );
}

function DocLink({ href, title, body }: { href: string; title: string; body: string }) {
  return (
    <Link
      href={href}
      className={`group flex items-start gap-3 rounded-lg border border-dc-line bg-dc-white px-4 py-4 transition-[transform,box-shadow,border-color] duration-300 ease-dc hover:border-dc-line-strong hover:shadow-soft motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-0 motion-safe:active:scale-[0.99] ${FOCUS}`}
    >
      <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-dc-clay">
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
        <path d="M14 3v5h5M9 13h6M9 17h4" />
      </svg>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-dc-ink group-hover:underline group-hover:underline-offset-4">{title}</span>
        <span className="mt-0.5 block text-sm leading-relaxed text-dc-text-2">{body}</span>
      </span>
    </Link>
  );
}
