"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AuthCard } from "@/components/AuthCard";
import { Button } from "@/components/Button";
import { PasswordField } from "@/components/PasswordField";
import { TextField } from "@/components/TextField";
import { apiPost, ApiError } from "@/lib/api";

export default function VendorLoginPage() {
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
      await apiPost("/api/v1/auth/vendor/login", { email, password });
      router.push("/vendor/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Terjadi kesalahan, coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard
      eyebrow="Mitra Vendor"
      title="Masuk ke Dashboard Vendor"
      subtitle="Kelola booking dan diskusi dengan calon pengantin."
      footer={
        <>
          Belum jadi mitra?{" "}
          <Link href="/vendor/register" className="font-semibold text-dc-navy hover:text-dc-gold">
            Daftar jadi mitra vendor
          </Link>
          <br />
          Kamu calon pengantin?{" "}
          <Link href="/client/login" className="font-semibold text-dc-navy hover:text-dc-gold">
            Masuk di sini
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
