"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { WithUser } from "@/components/WithUser";
import { apiGet, type DashboardStats } from "@/lib/api";

export default function AdminDashboardPage() {
  return (
    <WithUser allowedRoles={["admin"]} loginPath="/internal/login">
      {() => <AdminDashboardContent />}
    </WithUser>
  );
}

const NAV_LINKS = [
  { href: "/internal/admin/vendors", label: "Vendor Menunggu Review" },
  { href: "/internal/admin/vendors/approved", label: "Vendor Aktif & Komisi" },
  { href: "/internal/admin/disputes", label: "Sengketa Terbuka" },
  { href: "/internal/admin/disbursements", label: "Pencairan Dana" },
  { href: "/internal/admin/inspirasi", label: "Galeri Inspirasi" },
];

function AdminDashboardContent() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    apiGet<DashboardStats>("/api/v1/admin/dashboard").then(setStats).catch(() => {});
  }, []);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-heading mb-6 text-2xl font-extrabold text-dc-navy">Dashboard Admin</h1>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Vendor Aktif" value={stats?.active_vendors} />
        <StatCard label="Transaksi Berjalan" value={stats?.ongoing_transactions} />
        <StatCard label="Sengketa Terbuka" value={stats?.open_disputes} highlight={!!stats && stats.open_disputes > 0} />
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-2xl border border-dc-black/10 bg-dc-white p-4 font-medium text-dc-navy hover:bg-dc-offwhite"
          >
            {link.label} →
          </Link>
        ))}
      </div>
    </main>
  );
}

function StatCard({ label, value, highlight }: { label: string; value?: number; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 text-center ${highlight ? "border-dc-gold bg-dc-gold/10" : "border-dc-black/10 bg-dc-white"}`}>
      <p className="font-heading text-3xl font-extrabold text-dc-navy">{value ?? "—"}</p>
      <p className="mt-1 text-sm text-dc-black/60">{label}</p>
    </div>
  );
}
