"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/Button";
import { apiGet, apiPost, type CurrentUser } from "@/lib/api";

export function DashboardStub({ expectedRole, loginPath }: { expectedRole: string; loginPath: string }) {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    apiGet<CurrentUser>("/api/v1/auth/me")
      .then((u) => {
        if (u.role !== expectedRole) {
          router.replace(loginPath);
          return;
        }
        setUser(u);
      })
      .catch(() => router.replace(loginPath))
      .finally(() => setChecking(false));
  }, [expectedRole, loginPath, router]);

  async function handleLogout() {
    await apiPost("/api/v1/auth/logout", {});
    router.replace(loginPath);
  }

  if (checking) {
    return <p className="p-8 text-center text-dc-black/60">Memuat…</p>;
  }

  if (!user) return null;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-dc-offwhite px-6 text-center">
      <p className="font-heading text-2xl font-extrabold text-dc-navy">Halo, {user.full_name || user.email} 👋</p>
      <p className="text-dc-black/60">
        Login sebagai <span className="font-semibold text-dc-navy">{user.role}</span>. Fase 1 (Autentikasi) selesai —
        fitur direktori vendor & dashboard penuh menyusul di fase berikutnya.
      </p>
      <Button variant="ghost" className="w-auto" onClick={handleLogout}>
        Keluar
      </Button>
    </main>
  );
}
