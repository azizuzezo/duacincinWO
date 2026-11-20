"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ADMIN_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Field";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { WithUser } from "@/components/WithUser";
import { apiGet, apiPost, ApiError, type CurrentUser } from "@/lib/api";
import { ConfirmDialog, ErrorBanner, Monogram, PAGE, RowsSkeleton, SearchField, tanggalJam } from "../../_ui";

// Kirim WhatsApp: one message from the official DuaCincin number to a client
// or vendor whose number is verified. Every send is in the audit log, which
// also feeds the history on the right.

type Role = "client" | "vendor";

type Recipient = {
  user_id: string;
  name: string;
  email: string;
  role: Role;
  business_name?: string;
  phone_display: string;
};

type Sent = {
  id: string;
  recipient_id: string;
  recipient_name: string;
  recipient_role: Role;
  phone_tail: string;
  message: string;
  sent_by: string;
  sent_at: string;
};

const MAX = 1000;
const ROLE_LABEL: Record<Role, string> = { client: "Klien", vendor: "Vendor" };

function displayName(r: Recipient): string {
  return r.business_name || r.name || r.email;
}

export default function AdminWhatsAppPage() {
  return (
    <WithUser allowedRoles={["admin"]} loginPath="/login">
      {(user) => <AdminWhatsAppContent user={user} />}
    </WithUser>
  );
}

function AdminWhatsAppContent({ user }: { user: CurrentUser }) {
  const toast = useToast();
  const [q, setQ] = useState("");
  const [role, setRole] = useState<"" | Role>("");
  const [results, setResults] = useState<Recipient[] | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Recipient | null>(null);
  const [message, setMessage] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sent, setSent] = useState<Sent[] | null>(null);
  const [sentError, setSentError] = useState<string | null>(null);

  const search = useCallback(async (query: string, r: "" | Role) => {
    setSearchError(null);
    try {
      const params = new URLSearchParams({ q: query, role: r });
      setResults((await apiGet<Recipient[]>(`/api/v1/whatsapp/admin/recipients?${params}`)) ?? []);
    } catch (err) {
      setSearchError(err instanceof ApiError ? err.message : "Gagal mencari penerima.");
    }
  }, []);

  const loadSent = useCallback(async () => {
    setSentError(null);
    try {
      setSent((await apiGet<Sent[]>("/api/v1/whatsapp/admin/sent")) ?? []);
    } catch (err) {
      setSentError(err instanceof ApiError ? err.message : "Gagal memuat riwayat.");
    }
  }, []);

  // Debounced search as the admin types or switches the role filter.
  useEffect(() => {
    const t = window.setTimeout(() => void search(q.trim(), role), 250);
    return () => window.clearTimeout(t);
  }, [q, role, search]);

  // ?user=<id> (e.g. from a vendor's detail page) preselects the recipient.
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    queueMicrotask(() => void loadSent());
    const id = new URLSearchParams(window.location.search).get("user");
    if (!id) return;
    apiGet<Recipient[]>(`/api/v1/whatsapp/admin/recipients?user_id=${encodeURIComponent(id)}`)
      .then((list) => {
        if (list?.[0]) setSelected(list[0]);
        else toast.show("Pengguna ini belum punya nomor WhatsApp terverifikasi", "danger");
      })
      .catch(() => {});
  }, [loadSent, toast]);

  const length = [...message].length;
  const canSend = !!selected && message.trim().length > 0 && length <= MAX && !sending;

  async function send() {
    if (!selected) return;
    setSending(true);
    setSendError(null);
    try {
      await apiPost("/api/v1/whatsapp/admin/send", { user_id: selected.user_id, message });
      toast.show(`Pesan WhatsApp terkirim ke ${displayName(selected)}`, "success");
      setMessage("");
      setConfirming(false);
      void loadSent();
    } catch (err) {
      setSendError(err instanceof ApiError ? err.message.charAt(0).toUpperCase() + err.message.slice(1) : "Pesan belum terkirim, coba lagi.");
      setConfirming(false);
    } finally {
      setSending(false);
    }
  }

  return (
    <Shell user={user} navItems={ADMIN_NAV} loginPath="/login" eyebrow="Admin">
      <div className={PAGE}>
        <PageHeader
          eyebrow="Layanan"
          title={
            <>
              Kirim <span className="dc-em">WhatsApp</span>
            </>
          }
          subtitle="Kirim pesan dari nomor resmi DuaCincin ke klien atau vendor yang nomornya sudah terverifikasi. Penerima tidak bisa membalas lewat WhatsApp, jadi arahkan ke chat di DuaCincin bila perlu jawaban."
        />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
          <div className="flex min-w-0 flex-col gap-6">
            <Card className="p-5 sm:p-6">
              <h2 className="font-heading text-xl font-semibold text-dc-ink">1. Pilih penerima</h2>
              {selected ? (
                <div className="mt-4 flex items-center gap-3 rounded-lg border border-dc-gold/60 bg-dc-gold-soft/40 p-3">
                  <Monogram name={displayName(selected)} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-dc-ink">{displayName(selected)}</p>
                    <p className="truncate text-sm text-dc-text-2">
                      {selected.phone_display} · {selected.email}
                    </p>
                  </div>
                  <Badge tone={selected.role === "vendor" ? "ink" : "gold"}>{ROLE_LABEL[selected.role]}</Badge>
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-dc-clay underline-offset-4 hover:underline"
                  >
                    Ganti
                  </button>
                </div>
              ) : (
                <div className="mt-4 flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <SearchField value={q} onChange={setQ} label="Cari penerima" placeholder="Nama, usaha, email, atau nomor" />
                    <div role="group" aria-label="Peran" className="flex gap-1.5">
                      {([["", "Semua"], ["client", "Klien"], ["vendor", "Vendor"]] as const).map(([v, label]) => (
                        <button
                          key={v}
                          type="button"
                          aria-pressed={role === v}
                          onClick={() => setRole(v)}
                          className={`min-h-11 rounded-full border px-4 text-sm font-semibold transition-colors ${
                            role === v ? "border-dc-ink bg-dc-ink text-dc-on-dark" : "border-dc-line-strong text-dc-ink hover:border-dc-ink"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {searchError && <ErrorBanner message={searchError} onRetry={() => void search(q.trim(), role)} />}
                  {!results && !searchError && <RowsSkeleton rows={3} label="Mencari penerima" />}
                  {results && results.length === 0 && (
                    <p className="rounded-lg border border-dashed border-dc-line-strong px-4 py-6 text-center text-sm text-dc-text-2">
                      Tidak ada penerima yang cocok. Hanya klien dan vendor dengan nomor WhatsApp terverifikasi yang muncul di sini.
                    </p>
                  )}
                  {results && results.length > 0 && (
                    <ul className="max-h-80 divide-y divide-dc-line overflow-y-auto rounded-xl border border-dc-line bg-dc-white">
                      {results.map((r) => (
                        <li key={r.user_id}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelected(r);
                              setSendError(null);
                            }}
                            className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-dc-ivory focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-dc-gold"
                          >
                            <Monogram name={displayName(r)} size="sm" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-semibold text-dc-ink">{displayName(r)}</span>
                              <span className="block truncate text-sm text-dc-text-2">
                                {r.phone_display} · {r.email}
                              </span>
                            </span>
                            <Badge tone={r.role === "vendor" ? "ink" : "gold"}>{ROLE_LABEL[r.role]}</Badge>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </Card>

            <Card className="p-5 sm:p-6">
              <h2 className="font-heading text-xl font-semibold text-dc-ink">2. Tulis pesan</h2>
              <form
                className="mt-4 flex flex-col gap-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (canSend) setConfirming(true);
                }}
              >
                <Textarea
                  label="Pesan"
                  rows={6}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Contoh: Halo Kak, profil vendor kamu sudah kami setujui. Yuk lengkapi paket harga supaya calon pengantin bisa langsung booking."
                  hint={`${length}/${MAX} karakter. *tebal* dan _miring_ seperti di WhatsApp.`}
                  error={length > MAX ? `Maksimal ${MAX} karakter.` : undefined}
                />
                <div>
                  <p className="text-sm font-semibold text-dc-text-2">Pratinjau di WhatsApp</p>
                  <div className="mt-2 rounded-xl bg-[#e7ddd3] p-3">
                    <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-lg rounded-tl-none bg-white px-3 py-2 text-sm leading-relaxed text-[#111b21] shadow-sm">
                      <strong>📣 Pesan dari Tim DuaCincin</strong>
                      {"\n\n"}
                      {message.trim() || <span className="text-dc-text-3">Pesanmu akan tampil di sini.</span>}
                      {"\n\n"}
                      <em className="text-[#54656f]">
                        Nomor ini khusus notifikasi dan tidak menerima balasan. Butuh bantuan? Hubungi kami lewat chat di duacincin.id.
                      </em>
                    </div>
                  </div>
                </div>
                {sendError && (
                  <p role="alert" className="text-sm font-medium text-dc-danger">
                    {sendError}
                  </p>
                )}
                <Button type="submit" variant="primary" disabled={!canSend} loading={sending}>
                  {selected ? `Kirim ke ${displayName(selected)}` : "Pilih penerima dulu"}
                </Button>
              </form>
            </Card>
          </div>

          <section aria-labelledby="wa-riwayat" className="min-w-0">
            <h2 id="wa-riwayat" className="mb-3 text-sm font-semibold text-dc-text-2">
              Riwayat terkirim
            </h2>
            {sentError && <ErrorBanner message={sentError} onRetry={() => void loadSent()} />}
            {!sent && !sentError && <RowsSkeleton rows={3} label="Memuat riwayat" />}
            {sent && sent.length === 0 && (
              <Card className="px-5 py-8 text-center text-sm text-dc-text-2">Belum ada pesan WhatsApp yang dikirim admin.</Card>
            )}
            {sent && sent.length > 0 && (
              <ul className="flex flex-col gap-3">
                {sent.map((s) => (
                  <li key={s.id} className="rounded-xl border border-dc-line bg-dc-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 truncate font-semibold text-dc-ink">
                        {s.recipient_name}
                        {s.phone_tail && <span className="ml-1.5 font-normal text-dc-text-3">…{s.phone_tail}</span>}
                      </p>
                      <Badge tone={s.recipient_role === "vendor" ? "ink" : "gold"}>{ROLE_LABEL[s.recipient_role] ?? s.recipient_role}</Badge>
                    </div>
                    <p className="mt-2 line-clamp-4 whitespace-pre-wrap break-words text-sm leading-relaxed text-dc-text-2">{s.message}</p>
                    <p className="mt-2 text-xs text-dc-text-3">
                      {tanggalJam(s.sent_at)} · oleh {s.sent_by}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Kirim pesan WhatsApp?"
        consequence={selected ? `Pesan dikirim dari nomor resmi DuaCincin ke ${displayName(selected)} (${selected.phone_display}) dan tidak bisa ditarik kembali.` : ""}
        confirmLabel="Kirim sekarang"
        tone="primary"
        onConfirm={() => void send()}
        busy={sending}
      />
    </Shell>
  );
}
