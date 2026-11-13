"use client";

import { useEffect, useRef, useState } from "react";

import { ADMIN_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Field";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { WithUser } from "@/components/WithUser";
import { apiGet, apiPost, ApiError, type CurrentUser } from "@/lib/api";
import { ErrorBanner, Monogram, PAGE, RowsSkeleton, tanggal } from "../../_ui";

// Tim internal: every admin and wedding consultant ("karyawan"), and the only
// place a new one is created. Any admin can add either role.

type StaffRole = "admin" | "wedding_consultant";

type Staff = {
  id: string;
  email: string;
  full_name: string;
  role: StaffRole;
  account_status: string;
  created_at: string;
};

const ROLE_LABEL: Record<StaffRole, string> = { admin: "Admin", wedding_consultant: "Konsultan" };

export default function AdminTeamPage() {
  return (
    <WithUser allowedRoles={["admin"]} loginPath="/login">
      {(user) => <AdminTeamContent user={user} />}
    </WithUser>
  );
}

function AdminTeamContent({ user }: { user: CurrentUser }) {
  const [staff, setStaff] = useState<Staff[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      setStaff((await apiGet<Staff[]>("/api/v1/admin/staff")) ?? []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat daftar tim.");
    }
  }

  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    queueMicrotask(load);
  }, []);

  return (
    <Shell user={user} navItems={ADMIN_NAV} loginPath="/login" eyebrow="Admin">
      <div className={PAGE}>
        <PageHeader
          eyebrow="Sistem"
          title={
            <>
              Tim <span className="dc-em">internal</span>
            </>
          }
          subtitle="Tambah admin baru atau karyawan (konsultan pernikahan). Akun baru langsung bisa masuk lewat halaman login dengan email dan password yang kamu buat."
        />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
          <section aria-labelledby="tim-daftar">
            <h2 id="tim-daftar" className="mb-3 text-sm font-semibold text-dc-text-2">
              {staff ? `${staff.length} orang` : "Daftar tim"}
            </h2>
            {error && <ErrorBanner message={error} onRetry={load} />}
            {!staff && !error && <RowsSkeleton rows={4} label="Memuat tim" />}
            {staff && (
              <ul className="divide-y divide-dc-line overflow-hidden rounded-xl border border-dc-line bg-dc-white">
                {staff.map((s) => (
                  <li key={s.id} className="flex items-center gap-3 px-4 py-3.5">
                    <Monogram name={s.full_name || s.email} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-dc-ink">
                        {s.full_name || s.email}
                        {s.id === user.id && <span className="ml-1.5 font-normal text-dc-text-3">(kamu)</span>}
                      </p>
                      <p className="truncate text-sm text-dc-text-2">{s.email}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Badge tone={s.role === "admin" ? "ink" : "gold"}>{ROLE_LABEL[s.role] ?? s.role}</Badge>
                      <span className="text-xs text-dc-text-3">Sejak {tanggal(s.created_at)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <AddStaffForm onCreated={(s) => setStaff((prev) => [s, ...(prev ?? [])])} />
        </div>
      </div>
    </Shell>
  );
}

function AddStaffForm({ onCreated }: { onCreated: (s: Staff) => void }) {
  const toast = useToast();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<StaffRole>("wedding_consultant");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("Password minimal 8 karakter.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const created = await apiPost<Staff>("/api/v1/admin/staff", { full_name: fullName, email, role, password });
      onCreated(created);
      toast.show(`${ROLE_LABEL[created.role]} ${created.full_name} ditambahkan`, "success");
      setFullName("");
      setEmail("");
      setPassword("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menambah anggota tim.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-5 sm:p-6">
      <h2 className="font-heading text-xl font-semibold text-dc-ink">Tambah anggota</h2>
      <p className="mt-1 text-sm leading-relaxed text-dc-text-2">Bagikan email dan password ke orangnya secara langsung. Mereka bisa menggantinya lewat lupa password.</p>
      <form onSubmit={submit} className="mt-5 flex flex-col gap-4" noValidate>
        <Input label="Nama lengkap" value={fullName} onChange={(e) => setFullName(e.target.value)} required autoComplete="off" />
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="off" />
        <Select
          label="Peran"
          value={role}
          onChange={(e) => setRole(e.target.value as StaffRole)}
          hint={role === "admin" ? "Admin bisa mengelola vendor, uang, sengketa, dan menambah anggota tim." : "Konsultan menangani inbox konsultasi calon pengantin."}
        >
          <option value="wedding_consultant">Karyawan (konsultan pernikahan)</option>
          <option value="admin">Admin</option>
        </Select>
        <Input
          label="Password awal"
          type="text"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
          hint="Minimal 8 karakter."
        />
        {error && (
          <p role="alert" className="text-sm font-medium text-dc-danger">
            {error}
          </p>
        )}
        <Button type="submit" variant="primary" loading={busy} disabled={!fullName.trim() || !email.trim()}>
          Tambah ke tim
        </Button>
      </form>
    </Card>
  );
}
