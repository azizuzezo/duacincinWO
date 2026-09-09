"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/Button";
import { WithUser } from "@/components/WithUser";
import { apiPost, type Conversation } from "@/lib/api";

export default function ClientDashboardPage() {
  return (
    <WithUser allowedRoles={["client"]} loginPath="/client/login">
      {(user) => <ClientDashboardContent name={user.full_name || user.email} />}
    </WithUser>
  );
}

function ClientDashboardContent({ name }: { name: string }) {
  const router = useRouter();

  async function handleLogout() {
    await apiPost("/api/v1/auth/logout", {});
    router.replace("/client/login");
  }

  async function handleStartConsultation() {
    const conv = await apiPost<Conversation>("/api/v1/conversations/consultation", {});
    router.push(`/client/messages/${conv.id}`);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="font-heading text-2xl font-extrabold text-dc-navy">Halo, {name} 👋</p>
      <p className="text-dc-black/60">Mulai cari vendor atau lanjutkan percakapan yang sudah berjalan.</p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link href="/vendors" className="rounded-xl bg-dc-navy px-5 py-2.5 text-sm font-semibold text-dc-white hover:bg-dc-gold hover:text-dc-navy">
          Cari Vendor
        </Link>
        <Link href="/client/budget" className="rounded-xl bg-dc-gold px-5 py-2.5 text-sm font-semibold text-dc-navy hover:bg-dc-navy hover:text-dc-white">
          Budget Planner
        </Link>
        <Link href="/client/wedding-planner" className="rounded-xl border border-dc-navy/20 px-5 py-2.5 text-sm font-semibold text-dc-navy hover:bg-dc-offwhite">
          Wedding Planner
        </Link>
        <Link href="/inspirasi" className="rounded-xl border border-dc-navy/20 px-5 py-2.5 text-sm font-semibold text-dc-navy hover:bg-dc-offwhite">
          Inspirasi
        </Link>
        <Link href="/client/messages" className="rounded-xl border border-dc-navy/20 px-5 py-2.5 text-sm font-semibold text-dc-navy hover:bg-dc-offwhite">
          Pesan
        </Link>
        <button
          onClick={handleStartConsultation}
          className="rounded-xl border border-dc-navy/20 px-5 py-2.5 text-sm font-semibold text-dc-navy hover:bg-dc-offwhite"
        >
          Chat dengan Wedding Consultant
        </button>
      </div>

      <Button variant="ghost" className="w-auto" onClick={handleLogout}>
        Keluar
      </Button>
    </main>
  );
}
