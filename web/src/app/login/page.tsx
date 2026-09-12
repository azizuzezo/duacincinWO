"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AuthCard } from "@/components/AuthCard";
import { Button } from "@/components/Button";
import { PasswordField } from "@/components/PasswordField";
import { TextField } from "@/components/TextField";
import { apiPost, ApiError, type CurrentUser } from "@/lib/api";

// One dashboard per role. The backend already tells us which one via
// `role` on the login response, so there's nothing to ask the user upfront.
const DASHBOARD_BY_ROLE: Record<CurrentUser["role"], string> = {
  client: "/client/dashboard",
  vendor: "/vendor/dashboard",
  admin: "/internal/admin/dashboard",
  wedding_consultant: "/internal/consultations",
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await apiPost<CurrentUser>("/api/v1/auth/login", { email, password });
      router.push(DASHBOARD_BY_ROLE[user.role]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Terjadi kesalahan, coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard
      variant="unified"
      title="Masuk ke akunmu"
      subtitle="Client, vendor, atau tim internal, masuk di sini, satu pintu untuk semua."
      footer={
        <>
          Belum punya akun?{" "}
          <Link href="/register" className="font-semibold text-dc-navy hover:text-dc-gold">
            Daftar di sini
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <TextField label="Email" type="email" autoComplete="email" value={email} onChange={setEmail} />
        <PasswordField label="Password" value={password} onChange={setPassword} />
        <div className="-mt-2 text-right text-sm">
          <Link href="/forgot-password" className="text-dc-navy hover:text-dc-gold">
            Lupa password?
          </Link>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" loading={loading}>
          Masuk
        </Button>
      </form>
    </AuthCard>
  );
}
