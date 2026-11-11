"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { dayName, formatJam, monthShort } from "@/components/booking/format";
import { CLIENT_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Sheet";
import { SkeletonGroup } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { WithUser } from "@/components/WithUser";
import { apiGet, apiPost, ApiError, type Conversation, type CurrentUser, type Meeting } from "@/lib/api";

export default function ClientConsultationPage() {
  return (
    <WithUser allowedRoles={["client"]} loginPath="/login">
      {(user) => <ClientConsultationContent user={user} />}
    </WithUser>
  );
}

// What the consultation channel actually does in the product (PRD §8.11).
const DOES = [
  "Mendengar kebutuhan, tanggal, dan anggaranmu lewat chat di akunmu.",
  "Merekomendasikan vendor yang cocok dari direktori DuaCincin.",
  "Menjadwalkan meeting lanjutan dan ikut technical meeting bila kamu minta.",
];

function RingBullet() {
  return (
    <svg aria-hidden viewBox="0 0 26 16" fill="none" className="mt-1 h-4 w-[26px] shrink-0 text-dc-gold-antique">
      <circle cx="9" cy="8" r="6.2" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="17" cy="8" r="6.2" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function ClientConsultationContent({ user }: { user: CurrentUser }) {
  const router = useRouter();
  const { show } = useToast();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [scheduledAt, setScheduledAt] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [saving, setSaving] = useState(false);
  const [opening, setOpening] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  // Moment the list was loaded, to split upcoming from past sessions.
  const [now, setNow] = useState(0);

  function load() {
    setLoadError(null);
    return apiGet<Meeting[]>("/api/v1/meetings/consultation")
      .then((d) => {
        setNow(Date.now());
        setMeetings(d ?? []);
      })
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "Gagal memuat jadwal konsultasi."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    queueMicrotask(load);
  }, []);

  async function handleSchedule(e: React.FormEvent) {
    e.preventDefault();
    if (!scheduledAt) return;
    setSaving(true);
    setError(null);
    try {
      await apiPost("/api/v1/meetings/consultation", {
        scheduled_at: new Date(scheduledAt).toISOString(),
        meeting_link: meetingLink,
      });
      setScheduledAt("");
      setMeetingLink("");
      setSheetOpen(false);
      show("Sesi konsultasi dijadwalkan.", "success");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menjadwalkan sesi.");
    } finally {
      setSaving(false);
    }
  }

  async function handleChat() {
    setOpening(true);
    try {
      const conv = await apiPost<Conversation>("/api/v1/conversations/consultation", {});
      router.push(`/client/messages/${conv.id}`);
    } catch (err) {
      setOpening(false);
      show(err instanceof ApiError ? err.message : "Chat belum bisa dibuka. Coba lagi sebentar.", "danger");
    }
  }

  const sorted = [...meetings].sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
  const upcoming = sorted.filter((m) => new Date(m.scheduled_at).getTime() >= now);
  const past = sorted.filter((m) => new Date(m.scheduled_at).getTime() < now).reverse();

  return (
    <Shell user={user} navItems={CLIENT_NAV} loginPath="/login" eyebrow="Client">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        {/* The one ink block of the page: who the consultant is and the two ways to reach them. */}
        <section aria-labelledby="konsultan-judul" className="dc-on-dark relative isolate animate-fade-up overflow-hidden rounded-2xl bg-dc-ink text-dc-on-dark">
          <div aria-hidden className="absolute -right-24 -top-24 -z-10 h-80 w-80 rounded-full bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--dc-gold-antique)_24%,transparent),transparent)]" />
          <div className="grid items-end gap-6 p-6 sm:p-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-10">
            <div className="pb-2">
              <p className="dc-eyebrow">Wedding Consultant</p>
              <h1 id="konsultan-judul" className="mt-3 text-balance font-heading text-[2.5rem] leading-[1.02] sm:text-[3.4rem]">
                Ceritakan rencanamu, <span className="dc-em-light">kami bantu</span> memilih.
              </h1>
              <ul className="mt-6 flex flex-col gap-3">
                {DOES.map((d) => (
                  <li key={d} className="flex gap-3 text-[0.95rem] leading-relaxed text-dc-on-dark/85">
                    <RingBullet />
                    {d}
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button variant="gold" size="lg" onClick={handleChat} loading={opening}>
                  Chat sekarang
                </Button>
                <Button variant="ghostLight" size="lg" onClick={() => setSheetOpen(true)}>
                  Jadwalkan video call
                </Button>
              </div>
            </div>
            {/* Real couple cutout in a gapura-shaped arch, the brand frame for people. */}
            <div className="relative mx-auto hidden aspect-[4/5] w-full max-w-[300px] sm:block lg:max-w-none">
              <div aria-hidden className="absolute inset-0 rounded-t-full border border-dc-gold-antique/40" />
              <div className="absolute inset-3 overflow-hidden rounded-t-full bg-dc-ink-2">
                <Image src="/photos/adat/jawa-720.webp" alt="Pasangan pengantin berbusana adat Jember Sari, Jawa Timur" fill sizes="340px" className="object-cover object-top" />
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="jadwal-judul" className="mt-12">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="jadwal-judul" className="font-heading text-[2rem] leading-tight text-dc-ink">
                Jadwal <span className="dc-em">sesimu</span>
              </h2>
              <p className="mt-1 text-sm text-dc-text-2">Sesi video call atau telepon dengan Wedding Consultant.</p>
            </div>
            {meetings.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setSheetOpen(true)}>
                Tambah sesi
              </Button>
            )}
          </div>

          {loading ? (
            <SkeletonGroup label="Memuat jadwal" className="grid gap-3 sm:grid-cols-2">
              <span className="dc-skeleton block h-28 rounded-xl" />
              <span className="dc-skeleton block h-28 rounded-xl" />
            </SkeletonGroup>
          ) : loadError ? (
            <ErrorState title="Jadwal belum bisa dimuat" body={loadError} onRetry={load} />
          ) : sorted.length === 0 ? (
            <EmptyState
              title="Belum ada sesi terjadwal"
              body="Pilih tanggal dan jam yang pas, lalu konsultan menemanimu meninjau anggaran atau pilihan vendor."
              action={
                <Button variant="primary" size="sm" onClick={() => setSheetOpen(true)}>
                  Jadwalkan sesi pertama
                </Button>
              }
            />
          ) : (
            <div className="flex flex-col gap-8">
              {upcoming.length > 0 && (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {upcoming.map((m, i) => (
                    <li key={m.id}>
                      <MeetingCard meeting={m} next={i === 0} />
                    </li>
                  ))}
                </ul>
              )}
              {past.length > 0 && (
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-dc-text-2">Sudah lewat</h3>
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {past.map((m) => (
                      <li key={m.id}>
                        <MeetingCard meeting={m} past />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Jadwalkan sesi"
        description="Pilih waktu yang pas untukmu. Detailnya bisa dibahas lewat chat konsultasi."
        footer={
          <Button type="submit" form="consult-form" variant="primary" block loading={saving}>
            Jadwalkan
          </Button>
        }
      >
        <form id="consult-form" onSubmit={handleSchedule} className="flex flex-col gap-5">
          <Input id="scheduled-at" label="Tanggal dan waktu" type="datetime-local" required value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
          <Input
            id="meeting-link"
            label="Link meeting"
            optional
            type="text"
            value={meetingLink}
            onChange={(e) => setMeetingLink(e.target.value)}
            placeholder="Tempel link Zoom atau Google Meet"
            hint="Kosongkan bila belum ada. Link bisa dibagikan lewat chat konsultasi."
          />
          {error && (
            <p role="alert" className="text-sm text-dc-danger">
              {error}
            </p>
          )}
        </form>
      </Sheet>
    </Shell>
  );
}

/** A session as a calendar tile: the day number leads, time and link follow. */
function MeetingCard({ meeting, next = false, past = false }: { meeting: Meeting; next?: boolean; past?: boolean }) {
  const date = new Date(meeting.scheduled_at);
  return (
    <div className={`flex items-center gap-4 rounded-xl border p-4 ${past ? "border-dc-line bg-dc-cream/60" : "border-dc-line bg-dc-white shadow-soft"} ${next ? "border-dc-gold/60" : ""}`}>
      <div className={`flex h-20 w-18 shrink-0 flex-col items-center justify-center rounded-lg ${next ? "bg-dc-ink text-dc-on-dark" : "bg-dc-cream text-dc-ink"}`}>
        <span className={`text-xs font-semibold ${next ? "text-dc-gold-antique" : "text-dc-clay"}`}>{monthShort(date)}</span>
        <span className="font-heading text-[2.1rem] leading-none lining-nums">{date.getDate()}</span>
        <span className={`text-xs ${next ? "text-dc-on-dark/80" : "text-dc-text-3"}`}>{date.getFullYear()}</span>
      </div>
      <div className="min-w-0 flex-1">
        {next && <p className="text-xs font-semibold text-dc-clay">Sesi berikutnya</p>}
        <p className="font-semibold text-dc-ink">
          {dayName(date)}, pukul {formatJam(meeting.scheduled_at)}
        </p>
        {meeting.meeting_link ? (
          <a
            href={meeting.meeting_link}
            target="_blank"
            rel="noopener noreferrer"
            className="-ml-1 inline-flex min-h-11 items-center rounded-full px-1 text-sm font-semibold text-dc-clay underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold"
          >
            Buka link meeting
          </a>
        ) : (
          <p className="mt-1 text-sm text-dc-text-3">Belum ada link meeting</p>
        )}
      </div>
    </div>
  );
}
