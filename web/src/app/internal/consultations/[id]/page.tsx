"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";

import { ChatThread } from "@/components/ChatThread";
import { ConversationAvatar } from "@/components/ConversationList";
import { ChatSessionButton } from "@/components/messages/ChatSession";
import { ADMIN_NAV, CONSULTANT_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Sheet";
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
    <div className="flex items-center gap-3 border-b border-dc-line bg-dc-white px-4 py-3">
      <ConversationAvatar name={name} consult={false} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-dc-ink">{name}</p>
        <p className="text-xs text-dc-text-3">Konsultasi</p>
      </div>
      <Button size="sm" variant="ghost" onClick={() => setPlanOpen(true)} className="lg:hidden">
        Usulkan jadwal
      </Button>
      <ChatSessionButton />
    </div>
  );

  return (
    <Shell user={user} navItems={isAdmin ? ADMIN_NAV : CONSULTANT_NAV} loginPath="/login" eyebrow={isAdmin ? "Admin" : "Konsultan"}>
      <div className="mx-auto max-w-6xl px-4 pb-10 pt-6 sm:px-6 sm:pt-8">
        <Link
          href="/internal/consultations"
          className="mb-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-dc-clay underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold"
        >
          <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 5-5 5 5 5" />
          </svg>
          Inbox konsultasi
        </Link>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <ChatThread key={threadKey} conversationId={id} currentUserId={user.id} header={header} />

          <aside className="hidden flex-col gap-4 lg:flex" aria-label="Tentang konsultasi ini">
            <div className="rounded-xl border border-dc-line bg-dc-white p-5">
              <div className="flex items-center gap-3">
                <ConversationAvatar name={name} consult={false} />
                <div className="min-w-0">
                  <p className="truncate font-heading text-2xl leading-tight text-dc-ink">{name}</p>
                  <p className="text-sm text-dc-text-3">Sesi konsultasi pernikahan</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl bg-dc-cream p-5">
              <h2 className="font-heading text-2xl text-dc-ink">
                Jadwal <span className="dc-em">pertemuan</span>
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-dc-text-2">Kirim usulan waktu ke chat. Client menyimpan sesi resminya dari halaman Konsultasi miliknya.</p>
              <Button block className="mt-4" onClick={() => setPlanOpen(true)}>
                Usulkan jadwal
              </Button>
            </div>
          </aside>
        </div>
      </div>

      <Sheet
        open={planOpen}
        onClose={() => setPlanOpen(false)}
        title="Usulkan jadwal"
        description={`Pesan usulan dikirim ke chat dengan ${name}.`}
        footer={
          <Button type="submit" form="form-jadwal" block loading={sending}>
            Kirim usulan ke chat
          </Button>
        }
      >
        <form id="form-jadwal" onSubmit={sendProposal} className="flex flex-col gap-5" noValidate>
          <div className="grid grid-cols-1 gap-4 min-[400px]:grid-cols-2">
            <Input label="Tanggal" type="date" min={todayISO()} value={date} onChange={(e) => { setDate(e.target.value); setFormError(null); }} />
            <Input label="Jam" type="time" value={time} onChange={(e) => { setTime(e.target.value); setFormError(null); }} hint={zonaWaktu() ? `Waktu ${zonaWaktu()}` : undefined} />
          </div>
          <Input label="Tautan pertemuan" optional type="url" inputMode="url" placeholder="Misalnya tautan Google Meet atau Zoom" value={link} onChange={(e) => setLink(e.target.value)} />
          {date && time && (
            <div className="rounded-lg border border-dc-line bg-dc-ivory p-4">
              <p className="text-xs font-semibold text-dc-text-3">Pratinjau pesan</p>
              <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-dc-ink">{proposalText(date, time, link)}</p>
            </div>
          )}
          {formError && (
            <p role="alert" className="text-sm font-medium text-dc-danger">
              {formError}
            </p>
          )}
        </form>
      </Sheet>
    </Shell>
  );
}
