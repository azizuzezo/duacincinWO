"use client";

import { EYEBROW } from "@/app/client/_ui";
import { PasswordSection } from "@/components/PasswordSection";
import { CLIENT_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { WithUser } from "@/components/WithUser";
import type { CurrentUser } from "@/lib/api";

export default function ClientAccountPage() {
  return (
    <WithUser allowedRoles={["client"]} loginPath="/login">
      {(user) => <ClientAccountContent user={user} />}
    </WithUser>
  );
}

function ClientAccountContent({ user }: { user: CurrentUser }) {
  return (
    <Shell user={user} navItems={CLIENT_NAV} loginPath="/login" eyebrow="Client">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:py-10">
        <PageHeader title="Akun" subtitle="Informasi akunmu dan pengaturan keamanan." />

        <Card className="mb-6 p-5">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div className="min-w-0">
              <dt className={EYEBROW}>Nama</dt>
              <dd className="mt-1 break-words text-dc-ink">{user.full_name || "-"}</dd>
            </div>
            <div className="min-w-0">
              <dt className={EYEBROW}>Email</dt>
              <dd className="mt-1 break-words text-dc-ink">{user.email}</dd>
            </div>
          </dl>
        </Card>

        <Card className="p-5">
          <PasswordSection />
        </Card>
      </div>
    </Shell>
  );
}
