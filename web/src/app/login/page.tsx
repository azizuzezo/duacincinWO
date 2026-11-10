"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AuthCard } from "@/components/AuthCard";
import { AuthDivider, GoogleSignIn } from "@/components/auth/GoogleSignIn";
import { DASHBOARD_BY_ROLE } from "@/components/auth/redirect";
import { Button } from "@/components/Button";
import { PasswordField } from "@/components/PasswordField";
import { TextField } from "@/components/TextField";
import { apiPost, ApiError, type CurrentUser } from "@/lib/api";

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
      subtitle="Calon pengantin, vendor, dan tim internal masuk lewat halaman yang sama."
      footer={
        <>
          Belum punya akun?{" "}
          <Link href="/register" className="font-semibold text-dc-ink underline decoration-dc-gold underline-offset-4 hover:text-dc-clay">
            Daftar di sini
          </Link>
        </>
      }
    >
      <div className="mb-5 flex flex-col gap-5 empty:hidden">
        <GoogleSignIn text="signin_with" />
        <AuthDivider />
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <TextField label="Email" type="email" autoComplete="email" value={email} onChange={setEmail} />
        <PasswordField label="Password" value={password} onChange={setPassword} />
        <div className="-mt-2 text-right text-sm">
          <Link href="/forgot-password" className="inline-flex min-h-11 items-center font-medium text-dc-clay underline-offset-4 hover:underline">
            Lupa password?
          </Link>
        </div>
        {error && <p role="alert" className="text-sm text-dc-danger">
            {error}
          </p>}
        <Button type="submit" loading={loading}>
          Masuk
        </Button>
      </form>
    </AuthCard>
  );
}
