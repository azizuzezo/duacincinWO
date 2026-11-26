"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";

import { AdmConvPane } from "@/components/admin/admPanes";
import { ADM_FIELD, ADM_FOCUS } from "@/components/admin/admUi";
import { ChatThread } from "@/components/ChatThread";
import { ConversationAvatar } from "@/components/ConversationList";
import { wdButton } from "@/components/home/ui";
import { ChatSessionButton } from "@/components/messages/ChatSession";
import { useMobileFullscreen } from "@/components/messages/Inbox";
import { ADMIN_NAV, CONSULTANT_NAV } from "@/components/shell/navConfig";
import { AdminShell } from "@/components/shell/AdminShell";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { WithUser } from "@/components/WithUser";
import { apiGet, apiPost, ApiError, type ChatMessage, type Conversation, type CurrentUser } from "@/lib/api";
import { jam, tanggalHari, zonaWaktu } from "../../_ui";

export default function ConsultationThreadPage({ params }: PageProps<"/internal/consultations/[id]">) {
  const { id } = use(params);

  return (
    <WithUser allowedRoles={["wedding_consultant", "admin"]} loginPath="/login">
      {(user) => <ConsultationThreadContent id={id} user={user} />}
    </WithUser>
  );
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** The proposal sent into the chat, in plain words the couple can act on. */
function proposalText(date: string, time: string, link: string): string {
  const when = new Date(`${date}T${time}`);
  const zone = zonaWaktu(when);
  const lines = [
    `Usulan jadwal pertemuan konsultasi: ${tanggalHari(when)}, pukul ${jam(when)}${zone ? ` ${zone}` : ""}.`,
    link.trim() ? `Tautan pertemuan: ${link.trim()}` : "",
    "Kalau cocok, simpan jadwal ini di halaman Konsultasi kamu. Kalau belum pas, balas saja dengan waktu lain.",
  ];
  return lines.filter(Boolean).join("\n");
}

function ConsultationThreadContent({ id, user }: { id: string; user: CurrentUser }) {
  const isAdmin = user.role === "admin";
  const sectionRef = useMobileFullscreen();
  const [conv, setConv] = useState<Conversation | null>(null);
  const [threadKey, setThreadKey] = useState(0);
  const [planOpen, setPlanOpen] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [link, setLink] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const { show } = useToast();

  // Same list the inbox loads; used only for the couple's name in the header.
  useEffect(() => {
    apiGet<Conversation[]>("/api/v1/conversations")
      .then((list) => setConv((list ?? []).find((c) => c.id === id) ?? null))
      .catch(() => setConv(null));
  }, [id]);

  const name = conv?.client_name ?? "Calon pengantin";

  async function sendProposal(e: React.FormEvent) {
    e.preventDefault();
    if (!date || !time) {
      setFormError("Pilih tanggal dan jam dulu.");
      return;
    }
    if (new Date(`${date}T${time}`).getTime() < Date.now()) {
      setFormError("Waktu itu sudah lewat. Pilih waktu yang akan datang.");
      return;
    }
    setSending(true);
    setFormError(null);
    try {
      await apiPost<ChatMessage>(`/api/v1/conversations/${id}/messages`, { body: proposalText(date, time, link) });
      show("Usulan jadwal terkirim ke chat.", "success");
      setPlanOpen(false);
      setDate("");
      setTime("");
      setLink("");
      // Remount the thread so it reloads history with the new message in place.
      setThreadKey((k) => k + 1);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Usulan belum terkirim. Coba lagi.");
    } finally {
      setSending(false);
    }
  }

  const header = (
    <div className="flex min-h-16 items-center gap-2 border-b border-wd-line bg-white px-2 pt-[env(safe-area-inset-top)] sm:gap-3 sm:px-4">
      <Link href="/internal/consultations" aria-label="Kembali ke inbox konsultasi" className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-wd-ink hover:bg-wd-accent-wash md:hidden ${ADM_FOCUS}`}>
        <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </Link>
      <ConversationAvatar name={name} consult={false} size="sm" />
      <div className="min-w-0 flex-1 py-2">
        <h1 className="wd-title truncate text-[1.1rem] leading-tight sm:text-[1.25rem]">{name}</h1>
        <p className="truncate text-xs text-wd-text">Konsultasi</p>
      </div>
      <button type="button" onClick={() => setPlanOpen(true)} className={`${wdButton({ variant: "gold", size: "sm", className: "min-h-11" })} shrink-0 ${ADM_FOCUS}`}>
        Usulkan jadwal
      </button>
      <ChatSessionButton />
    </div>
  );

  return (
    <AdminShell tone="wd" user={user} navItems={isAdmin ? ADMIN_NAV : CONSULTANT_NAV} loginPath="/login" eyebrow={isAdmin ? "Admin" : "Konsultan"}>
      <div className="wd-container md:py-8">
        <div className="md:grid md:h-[calc(100dvh-13rem)] md:min-h-[520px] md:grid-cols-[320px_minmax(0,1fr)] md:gap-8 lg:grid-cols-[360px_minmax(0,1fr)]">
          <AdmConvPane
            userId={user.id}
            basePath="/internal/consultations"
            type="consultation"
            activeId={id}
            searchPlaceholder="Cari nama calon pengantin"
            emptyText="Belum ada calon pengantin yang memulai konsultasi."
            className="hidden md:flex"
          />
          <section
            ref={sectionRef}
            aria-label="Percakapan"
            className="fixed inset-0 z-50 bg-white md:static md:z-auto md:min-h-0 md:overflow-hidden md:rounded-[22px] md:ring-1 md:ring-wd-line md:shadow-wd-card"
          >
            <ChatThread key={threadKey} conversationId={id} currentUserId={user.id} variant="fill" header={header} />
          </section>
        </div>
      </div>

      <Modal open={planOpen} onClose={() => setPlanOpen(false)} title="Usulkan jadwal" description={`Pesan usulan dikirim ke chat dengan ${name}.`}>
        <form onSubmit={sendProposal} className="flex flex-col gap-4" noValidate>
          <div className="grid grid-cols-1 gap-4 min-[400px]:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-wd-ink">
              Tanggal
              <input type="date" min={todayISO()} value={date} onChange={(e) => { setDate(e.target.value); setFormError(null); }} className={ADM_FIELD} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-wd-ink">
              Jam
              <input type="time" value={time} onChange={(e) => { setTime(e.target.value); setFormError(null); }} className={ADM_FIELD} />
              {zonaWaktu() && <span className="text-xs font-normal text-wd-muted">Waktu {zonaWaktu()}</span>}
            </label>
          </div>
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-wd-ink">
            <span>
              Tautan pertemuan <span className="font-normal text-wd-muted">(opsional)</span>
            </span>
            <input type="url" inputMode="url" placeholder="Misalnya tautan Google Meet atau Zoom" value={link} onChange={(e) => setLink(e.target.value)} className={ADM_FIELD} />
          </label>
          {date && time && (
            <div className="rounded-2xl bg-wd-accent-wash p-4">
              <p className="text-xs font-semibold text-wd-accent-ink">Pratinjau pesan</p>
              <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-wd-ink">{proposalText(date, time, link)}</p>
            </div>
          )}
          {formError && (
            <p role="alert" className="text-sm font-medium text-wd-danger">
              {formError}
            </p>
          )}
          <button type="submit" disabled={sending} className={`${wdButton({ variant: "ink", size: "md", className: "w-full" })} ${ADM_FOCUS}`}>
            {sending ? "Mengirim..." : "Kirim usulan ke chat"}
          </button>
        </form>
      </Modal>
    </AdminShell>
  );
}
