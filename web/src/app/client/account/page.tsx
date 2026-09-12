"use client";

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
      <div className="mx-auto max-w-2xl px-4 py-10">
        <PageHeader title="Akun" subtitle="Informasi akunmu dan pengaturan keamanan." />

        <Card className="mb-6 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-dc-black/50">Nama</p>
          <p className="font-heading mt-1 text-lg font-bold text-dc-navy">{user.full_name || "-"}</p>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-dc-black/50">Email</p>
          <p className="mt-1 text-dc-navy">{user.email}</p>
        </Card>

        <Card className="p-5">
          <PasswordSection />
        </Card>
      </div>
    </Shell>
  );
}
