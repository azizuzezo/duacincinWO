"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { AgreementCheckbox } from "@/components/AgreementCheckbox";
import { AuthCard } from "@/components/AuthCard";
import { Button } from "@/components/Button";
import { PasswordField } from "@/components/PasswordField";
import { TextField } from "@/components/TextField";
import { apiPost, ApiError } from "@/lib/api";

type Role = "client" | "vendor";

// Only client/vendor register publicly. Admin & wedding_consultant
// accounts are created manually (PRD §8.10), so there's no third choice here.
const ROLE_CONFIG: Record<
  Role,
  {
    endpoint: string;
    redirect: string;
    nameLabel: string;
    nameAutoComplete: string;
    agreementHref: string;
    agreementLabel: string;
    cardTitle: string;
    cardDescription: string;
  }
> = {
  client: {
    endpoint: "/api/v1/auth/client/register",
    redirect: "/client/dashboard",
    nameLabel: "Nama lengkap",
    nameAutoComplete: "name",
    agreementHref: "/legal/client-tos",
    agreementLabel: "Ketentuan Layanan Client",
    cardTitle: "Calon Pengantin",
    cardDescription: "Cari vendor, atur budget, dan susun rencana pernikahan.",
  },
  vendor: {
    endpoint: "/api/v1/auth/vendor/register",
    redirect: "/vendor/profile",
    nameLabel: "Nama usaha",
    nameAutoComplete: "organization",
    agreementHref: "/legal/vendor-agreement",
    agreementLabel: "Perjanjian Kemitraan Vendor DuaCincin",
    cardTitle: "Vendor",
    cardDescription: "Terima booking dari calon pengantin lewat DuaCincin.",
  },
};

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterContent />
    </Suspense>
  );
}

function RegisterContent() {
  const router = useRouter();
  // A CTA elsewhere that already knows the intent (e.g. "Daftar Jadi Mitra
  // Vendor") can link with ?role=vendor to skip the choice step instead of
  // asking the user to pick again.
  const searchParams = useSearchParams();
  const preselected = searchParams.get("role");
  const initialRole: Role | null = preselected === "client" || preselected === "vendor" ? preselected : null;

  const [role, setRole] = useState<Role | null>(initialRole);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!role) return;
    setError(null);
    setLoading(true);
    try {
      await apiPost(ROLE_CONFIG[role].endpoint, {
        email,
        password,
        full_name: name,
        accept_terms: acceptTerms,
      });
      router.push(ROLE_CONFIG[role].redirect);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Terjadi kesalahan, coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  function resetChoice() {
    setRole(null);
    setName("");
    setEmail("");
    setPassword("");
    setAcceptTerms(false);
    setError(null);
  }

  return (
    <AuthCard
      variant={role ?? "unified"}
      title={role ? `Daftar sebagai ${ROLE_CONFIG[role].cardTitle}` : "Buat akun DuaCincin"}
      subtitle={role ? undefined : "Pilih peranmu untuk mulai."}
      footer={
        <>
          Sudah punya akun?{" "}
          <Link href="/login" className="font-semibold text-dc-clay underline underline-offset-2 hover:text-dc-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold">
            Masuk di sini
          </Link>
        </>
      }
    >
      {!role ? (
        <div className="flex flex-col gap-3">
          {(Object.keys(ROLE_CONFIG) as Role[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className="group min-h-11 rounded-lg border border-dc-ink/15 bg-dc-white p-5 text-left transition-colors hover:border-dc-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold"
            >
              <p className="font-heading text-2xl text-dc-ink">{ROLE_CONFIG[r].cardTitle}</p>
              <p className="mt-1 text-sm text-dc-black/70">{ROLE_CONFIG[r].cardDescription}</p>
            </button>
          ))}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <button
            type="button"
            onClick={resetChoice}
            className="-mt-1 inline-flex min-h-11 items-center self-start text-sm font-medium text-dc-clay underline underline-offset-2 hover:text-dc-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold"
          >
            Ganti peran
          </button>
          <TextField
            label={ROLE_CONFIG[role].nameLabel}
            autoComplete={ROLE_CONFIG[role].nameAutoComplete}
            value={name}
            onChange={setName}
          />
          <TextField label="Email" type="email" autoComplete="email" value={email} onChange={setEmail} />
          <PasswordField
            label="Password"
            autoComplete="new-password"
            value={password}
            onChange={setPassword}
            minLength={8}
          />
          <p className="-mt-2 text-xs text-dc-black/70">Minimal 8 karakter.</p>
          <AgreementCheckbox
            checked={acceptTerms}
            onChange={setAcceptTerms}
            href={ROLE_CONFIG[role].agreementHref}
            label={ROLE_CONFIG[role].agreementLabel}
          />
          {error && <p role="alert" className="text-sm text-red-700">
            {error}
          </p>}
          <Button type="submit" loading={loading} disabled={!acceptTerms}>
            {role === "vendor" ? "Daftar sebagai vendor" : "Buat akun"}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
