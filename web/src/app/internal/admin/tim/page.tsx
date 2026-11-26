"use client";

import { useEffect, useRef, useState } from "react";

import { AdmDialog, AdmHeader, ADM_FOCUS, Avatar, ListSkeleton, Pill } from "@/components/admin/adm";
import { wdButton } from "@/components/home/ui";
import { ADMIN_NAV } from "@/components/shell/navConfig";
import { AdminShell } from "@/components/shell/AdminShell";
import { Input, Select } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { WithUser } from "@/components/WithUser";
import { apiGet, apiPost, ApiError, type CurrentUser } from "@/lib/api";
import { ErrorBanner, tanggal } from "../../_ui";

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
  const [adding, setAdding] = useState(false);

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
    <AdminShell tone="wd" user={user} navItems={ADMIN_NAV} loginPath="/login" eyebrow="Admin">
      <div className="wd-container pb-16 pt-8 sm:pt-10">
        <AdmHeader
          kicker="Sistem"
          title={
            <>
              Tim <em>internal</em>
            </>
          }
          sub="Admin dan karyawan (konsultan pernikahan). Akun baru langsung bisa masuk lewat halaman login dengan email dan password yang kamu buat."
          action={
            <button type="button" onClick={() => setAdding(true)} className={`${wdButton({ variant: "ink", size: "md" })} ${ADM_FOCUS}`}>
              Tambah anggota
            </button>
          }
        />

        <section aria-labelledby="tim-daftar" className="mt-10 max-w-3xl">
          <h2 id="tim-daftar" className="wd-title text-[1.2rem] leading-tight">
            {staff ? `${staff.length} orang` : "Daftar tim"}
          </h2>
          <div className="mt-4">
            {error && <ErrorBanner message={error} onRetry={load} />}
            {!staff && !error && <ListSkeleton rows={4} label="Memuat tim" />}
            {staff && (
              <ul className="divide-y divide-wd-line border-y border-wd-line">
                {staff.map((s) => (
                  <li key={s.id} className="flex items-center gap-3 py-3.5">
                    <Avatar name={s.full_name || s.email} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-wd-ink">
                        {s.full_name || s.email}
                        {s.id === user.id && <span className="ml-1.5 font-normal text-wd-muted">(kamu)</span>}
                      </p>
                      <p className="truncate text-sm text-wd-text">{s.email}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Pill tone={s.role === "admin" ? "ink" : "gold"}>{ROLE_LABEL[s.role] ?? s.role}</Pill>
                      <span className="text-xs text-wd-muted">Sejak {tanggal(s.created_at)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      {adding && (
        <AddStaffDialog
          onClose={() => setAdding(false)}
          onCreated={(s) => {
            setStaff((prev) => [s, ...(prev ?? [])]);
            setAdding(false);
          }}
        />
      )}
    </AdminShell>
  );
}

function AddStaffDialog({ onCreated, onClose }: { onCreated: (s: Staff) => void; onClose: () => void }) {
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
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menambah anggota tim.");
      setBusy(false);
    }
  }

  return (
    <AdmDialog
      title="Tambah anggota"
      note="Bagikan email dan password ke orangnya secara langsung. Mereka bisa menggantinya lewat lupa password."
      onClose={onClose}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className={`${wdButton({ variant: "outline", size: "sm" })} ${ADM_FOCUS}`}>
            Batal
          </button>
          <button type="submit" form="form-tim" disabled={busy || !fullName.trim() || !email.trim()} aria-busy={busy} className={`${wdButton({ variant: "ink", size: "sm" })} ${ADM_FOCUS}`}>
            {busy ? "Menambah..." : "Tambah ke tim"}
          </button>
        </div>
      }
    >
      <form id="form-tim" onSubmit={submit} className="mt-2 flex flex-col gap-4" noValidate>
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
          <p role="alert" className="text-sm font-medium text-wd-danger">
            {error}
          </p>
        )}
      </form>
    </AdmDialog>
  );
}
