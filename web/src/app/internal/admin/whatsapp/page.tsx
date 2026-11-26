"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { AdmHeader, ADM_FOCUS, Avatar, Chips, ListSkeleton, Pill, SearchBox } from "@/components/admin/adm";
import { ClientArt } from "@/components/home/ClientArt";
import { wdButton } from "@/components/home/ui";
import { ADMIN_NAV } from "@/components/shell/navConfig";
import { AdminShell } from "@/components/shell/AdminShell";
import { Textarea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { WithUser } from "@/components/WithUser";
import { apiGet, apiPost, ApiError, type CurrentUser } from "@/lib/api";
import { ConfirmDialog, ErrorBanner, relatif, tanggalJam } from "../../_ui";

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
    <AdminShell tone="wd" user={user} navItems={ADMIN_NAV} loginPath="/login" eyebrow="Admin">
      <div className="wd-container pb-16 pt-8 sm:pt-10">
        <AdmHeader
          kicker="Layanan"
          title={
            <>
              Kirim <em>WhatsApp</em>
            </>
          }
          sub="Pesan dikirim dari nomor resmi DuaCincin ke klien atau vendor yang nomornya sudah terverifikasi. Penerima tidak bisa membalas lewat WhatsApp, jadi arahkan ke chat di DuaCincin bila perlu jawaban."
        />

        <div className="mt-10 grid gap-x-12 gap-y-12 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
          <div className="min-w-0">
            <section aria-labelledby="wa-penerima">
              <h2 id="wa-penerima" className="wd-title text-[1.2rem] leading-tight">
                Penerima
              </h2>
              {selected ? (
                <div className="mt-4 flex items-center gap-3 rounded-[20px] bg-wd-accent-wash p-3 pr-2 ring-1 ring-wd-accent-line/50">
                  <Avatar name={displayName(selected)} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-wd-ink">{displayName(selected)}</p>
                    <p className="truncate text-sm text-wd-text">
                      {selected.phone_display} · {selected.email}
                    </p>
                  </div>
                  <Pill tone={selected.role === "vendor" ? "ink" : "gold"}>{ROLE_LABEL[selected.role]}</Pill>
                  <button type="button" onClick={() => setSelected(null)} className={`${wdButton({ variant: "outline", size: "sm" })} ${ADM_FOCUS}`}>
                    Ganti
                  </button>
                </div>
              ) : (
                <div className="mt-4 flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <SearchBox value={q} onChange={setQ} label="Cari penerima" placeholder="Nama, usaha, email, atau nomor" />
                    <Chips
                      label="Peran"
                      value={role}
                      onChange={(v) => setRole(v as "" | Role)}
                      items={[
                        { id: "", label: "Semua" },
                        { id: "client", label: "Klien" },
                        { id: "vendor", label: "Vendor" },
                      ]}
                    />
                  </div>
                  {searchError && <ErrorBanner message={searchError} onRetry={() => void search(q.trim(), role)} />}
                  {!results && !searchError && <ListSkeleton rows={3} label="Mencari penerima" />}
                  {results && results.length === 0 && (
                    <div className="flex items-center gap-4 rounded-[20px] bg-wd-paper px-5 py-6">
                      <ClientArt kind="people" className="h-14 w-14 shrink-0" />
                      <p className="text-sm leading-relaxed text-wd-text">Tidak ada penerima yang cocok. Hanya klien dan vendor dengan nomor WhatsApp terverifikasi yang muncul di sini.</p>
                    </div>
                  )}
                  {results && results.length > 0 && (
                    <ul className="max-h-80 divide-y divide-wd-line overflow-y-auto border-y border-wd-line">
                      {results.map((r) => (
                        <li key={r.user_id}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelected(r);
                              setSendError(null);
                            }}
                            className="flex min-h-14 w-full items-center gap-3 px-1 py-2.5 text-left transition-colors hover:bg-wd-paper focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-wd-ink"
                          >
                            <Avatar name={displayName(r)} />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-semibold text-wd-ink">{displayName(r)}</span>
                              <span className="block truncate text-sm text-wd-text">
                                {r.phone_display} · {r.email}
                              </span>
                            </span>
                            <Pill tone={r.role === "vendor" ? "ink" : "gold"}>{ROLE_LABEL[r.role]}</Pill>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </section>

            <section aria-labelledby="wa-pesan" className="mt-10 border-t border-wd-line pt-8">
              <h2 id="wa-pesan" className="wd-title text-[1.2rem] leading-tight">
                Pesan
              </h2>
              <form
                className="mt-4 flex flex-col gap-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (canSend) setConfirming(true);
                }}
              >
                <Textarea
                  label="Isi pesan"
                  rows={6}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Contoh: Halo Kak, profil vendor kamu sudah kami setujui. Yuk lengkapi paket harga supaya calon pengantin bisa langsung booking."
                  hint={`${length}/${MAX} karakter. *tebal* dan _miring_ seperti di WhatsApp.`}
                  error={length > MAX ? `Maksimal ${MAX} karakter.` : undefined}
                />
                <div>
                  <p className="text-sm font-semibold text-wd-ink">Pratinjau di WhatsApp</p>
                  <div className="mt-2 rounded-[20px] bg-wd-blush p-3">
                    <div className="max-w-[88%] whitespace-pre-wrap break-words rounded-2xl rounded-tl-sm bg-white px-4 py-3 text-sm leading-relaxed text-wd-ink">
                      <strong>Pesan dari Tim DuaCincin</strong>
                      {"\n\n"}
                      {message.trim() || <span className="text-wd-muted">Pesanmu akan tampil di sini.</span>}
                      {"\n\n"}
                      <em className="text-wd-muted">Nomor ini khusus notifikasi dan tidak menerima balasan. Butuh bantuan? Hubungi kami lewat chat di duacincin.id.</em>
                    </div>
                  </div>
                </div>
                {sendError && (
                  <p role="alert" className="text-sm font-medium text-wd-danger">
                    {sendError}
                  </p>
                )}
                <div>
                  <button type="submit" disabled={!canSend} aria-busy={sending} className={`${wdButton({ variant: "ink", size: "md" })} ${ADM_FOCUS}`}>
                    {selected ? `Kirim ke ${displayName(selected)}` : "Pilih penerima dulu"}
                  </button>
                </div>
              </form>
            </section>
          </div>

          <section aria-labelledby="wa-riwayat" className="min-w-0 lg:border-l lg:border-wd-line lg:pl-10">
            <h2 id="wa-riwayat" className="wd-title text-[1.2rem] leading-tight">
              Riwayat terkirim
            </h2>
            <div className="mt-4">
              {sentError && <ErrorBanner message={sentError} onRetry={() => void loadSent()} />}
              {!sent && !sentError && <ListSkeleton rows={3} label="Memuat riwayat" />}
              {sent && sent.length === 0 && (
                <div className="flex items-center gap-4 rounded-[20px] bg-wd-paper px-5 py-6">
                  <ClientArt kind="envelope" className="h-14 w-14 shrink-0" />
                  <p className="text-sm leading-relaxed text-wd-text">Belum ada pesan WhatsApp yang dikirim admin.</p>
                </div>
              )}
              {sent && sent.length > 0 && (
                <ul className="divide-y divide-wd-line border-y border-wd-line">
                  {sent.map((s) => (
                    <li key={s.id} className="py-4">
                      <div className="flex items-start justify-between gap-3">
                        <p className="min-w-0 truncate font-semibold text-wd-ink">
                          {s.recipient_name}
                          {s.phone_tail && <span className="ml-1.5 font-normal text-wd-muted">...{s.phone_tail}</span>}
                        </p>
                        <Pill tone={s.recipient_role === "vendor" ? "ink" : "gold"}>{ROLE_LABEL[s.recipient_role] ?? s.recipient_role}</Pill>
                      </div>
                      <p className="mt-1.5 line-clamp-4 whitespace-pre-wrap break-words text-sm leading-relaxed text-wd-text">{s.message}</p>
                      <p className="mt-1.5 text-xs text-wd-muted" title={tanggalJam(s.sent_at)}>
                        {relatif(s.sent_at)} · oleh {s.sent_by}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
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
    </AdminShell>
  );
}
