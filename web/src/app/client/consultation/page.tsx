"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { dayName, formatJam, monthShort } from "@/components/booking/format";
import { FOCUS, INPUT, LABEL } from "@/app/client/_ui";
import { TanggalPicker, todayIso } from "@/app/vendors/[id]/_ui/TanggalPicker";
import { ClientArt } from "@/components/home/ClientArt";
import { wdButton } from "@/components/home/ui";
import { ClientShell } from "@/components/shell/ClientShell";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
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

/** Half-hour slots from 08.00 to 21.00. */
const TIMES = Array.from({ length: 27 }, (_, i) => {
  const m = 8 * 60 + i * 30;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${m % 60 === 0 ? "00" : "30"}`;
});

function ClientConsultationContent({ user }: { user: CurrentUser }) {
  const router = useRouter();
  const { show } = useToast();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [day, setDay] = useState("");
  const [time, setTime] = useState("10:00");
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
    if (!day) {
      setError("Pilih tanggalnya dulu.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiPost("/api/v1/meetings/consultation", {
        scheduled_at: new Date(`${day}T${time}`).toISOString(),
        meeting_link: meetingLink,
      });
      setDay("");
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

  // Arriving from Kirana's "Chat konsultan" (?chat=1, possibly after logging
  // in first): open the consultation chat straight away.
  const autoOpened = useRef(false);
  useEffect(() => {
    if (autoOpened.current || new URLSearchParams(window.location.search).get("chat") !== "1") return;
    autoOpened.current = true;
    void handleChat();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on arrival
  }, []);

  const sorted = [...meetings].sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
  const upcoming = sorted.filter((m) => new Date(m.scheduled_at).getTime() >= now);
  const past = sorted.filter((m) => new Date(m.scheduled_at).getTime() < now).reverse();

  const [next, ...laterUpcoming] = upcoming;

  return (
    <ClientShell user={user}>
      <div className="wd-container pb-16 pt-8 sm:pt-10">
        {/* Header: what the consultant does, and the two ways to reach them. Plain, no panel. */}
        <section aria-labelledby="konsultan-judul" className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_240px] lg:gap-14">
          <div>
            <p className="wd-kicker">Konsultasi</p>
            <h1 id="konsultan-judul" className="wd-display mt-2 text-[clamp(2.1rem,4.4vw,3.4rem)] leading-[1.05]">
              Ceritakan rencanamu, <em>kami bantu memilih.</em>
            </h1>
            <ol className="mt-6 max-w-xl border-t border-wd-line">
              {DOES.map((d, i) => (
                <li key={d} className="flex items-baseline gap-4 border-b border-wd-line py-3.5">
                  <span className="wd-display w-5 shrink-0 text-[1.5rem] italic leading-none text-wd-accent-ink">{i + 1}</span>
                  <span className="leading-snug text-wd-text">{d}</span>
                </li>
              ))}
            </ol>
            <div className="mt-7 flex flex-wrap gap-3">
              <button type="button" onClick={handleChat} disabled={opening} aria-busy={opening} className={`${wdButton({ variant: "gold", size: "lg" })} ${FOCUS}`}>
                {opening ? "Membuka chat..." : "Chat sekarang"}
              </button>
              <button type="button" onClick={() => setSheetOpen(true)} className={`${wdButton({ variant: "outline", size: "lg" })} ${FOCUS}`}>
                Jadwalkan video call
              </button>
            </div>
          </div>
          <div className="hidden aspect-square w-full max-w-[240px] justify-self-center rounded-[28px] bg-wd-accent-wash p-8 lg:block">
            <ClientArt kind="bubble" />
          </div>
        </section>

        <section aria-labelledby="jadwal-judul" className="mt-14">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="jadwal-judul" className="wd-title text-[clamp(1.55rem,2.6vw,2.05rem)] leading-tight">
                Jadwal <em>sesimu</em>
              </h2>
              <p className="mt-1.5 text-[0.95rem] text-wd-muted">Sesi video call atau telepon dengan Wedding Consultant.</p>
            </div>
            {meetings.length > 0 && (
              <button type="button" onClick={() => setSheetOpen(true)} className={`${wdButton({ variant: "outline", size: "sm" })} ${FOCUS}`}>
                Tambah sesi
              </button>
            )}
          </div>

          {loading ? (
            <SkeletonGroup label="Memuat jadwal" className="flex flex-col gap-3">
              <span className="dc-skeleton block h-24 rounded-2xl" />
              <span className="dc-skeleton block h-16 rounded-2xl" />
            </SkeletonGroup>
          ) : loadError ? (
            <ErrorState title="Jadwal belum bisa dimuat" body={loadError} onRetry={load} />
          ) : sorted.length === 0 ? (
            <div className="grid items-center gap-6 rounded-[28px] border-2 border-dashed border-wd-accent bg-wd-accent-wash p-6 sm:grid-cols-[96px_minmax(0,1fr)] sm:p-8">
              <div className="mx-auto h-24 w-24">
                <ClientArt kind="clipboard" />
              </div>
              <div className="text-center sm:text-left">
                <h3 className="wd-display text-[1.6rem] leading-tight">Belum ada sesi terjadwal</h3>
                <p className="mt-1.5 max-w-lg text-wd-text">Pilih tanggal dan jam yang pas, lalu konsultan menemanimu meninjau anggaran atau pilihan vendor.</p>
                <button type="button" onClick={() => setSheetOpen(true)} className={`${wdButton({ variant: "gold" })} ${FOCUS} mt-4`}>
                  Jadwalkan sesi pertama
                </button>
              </div>
            </div>
          ) : (
            <div>
              {next && <NextSession meeting={next} />}
              {laterUpcoming.length > 0 && (
                <ul className="border-t border-wd-line">
                  {laterUpcoming.map((m) => (
                    <SessionRow key={m.id} meeting={m} />
                  ))}
                </ul>
              )}
              {past.length > 0 && (
                <div className="mt-10">
                  <h3 className="text-sm font-semibold text-wd-text">Sudah lewat</h3>
                  <ul className="mt-2 border-t border-wd-line">
                    {past.map((m) => (
                      <SessionRow key={m.id} meeting={m} past />
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      <Modal
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Jadwalkan sesi"
        description="Pilih waktu yang pas untukmu. Detailnya bisa dibahas lewat chat konsultasi."
      >
        <form onSubmit={handleSchedule} className="flex flex-col gap-4">
          <TanggalPicker label="Tanggal" value={day} onChange={setDay} min={todayIso()} />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="consult-time" className={LABEL}>
              Jam
            </label>
            <select id="consult-time" value={time} onChange={(e) => setTime(e.target.value)} className={INPUT}>
              {TIMES.map((t) => (
                <option key={t} value={t}>
                  {t.replace(":", ".")}
                </option>
              ))}
            </select>
          </div>
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
            <p role="alert" className="text-sm text-wd-danger">
              {error}
            </p>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setSheetOpen(false)} className={`${wdButton({ variant: "outline" })} ${FOCUS}`}>
              Batal
            </button>
            <button type="submit" disabled={saving} aria-busy={saving} className={`${wdButton({ variant: "gold" })} ${FOCUS}`}>
              {saving ? "Menjadwalkan..." : "Jadwalkan"}
            </button>
          </div>
        </form>
      </Modal>
    </ClientShell>
  );
}

const LINK_CLS = `-ml-1 inline-flex min-h-11 items-center px-1 text-sm font-semibold text-wd-accent-ink underline underline-offset-4 hover:text-wd-ink ${FOCUS}`;

function MeetingLink({ meeting }: { meeting: Meeting }) {
  return meeting.meeting_link ? (
    <a href={meeting.meeting_link} target="_blank" rel="noopener noreferrer" className={LINK_CLS}>
      Buka link meeting
    </a>
  ) : (
    <p className="text-sm text-wd-muted">Belum ada link meeting</p>
  );
}

/** The next session, big: the day number leads, then time and link. */
function NextSession({ meeting }: { meeting: Meeting }) {
  const date = new Date(meeting.scheduled_at);
  return (
    <div className="mb-6 flex items-center gap-5 rounded-[28px] bg-wd-accent-wash p-5 sm:gap-8 sm:p-7">
      <div className="flex w-24 shrink-0 flex-col items-center sm:w-28">
        <span className="text-sm font-semibold uppercase text-wd-accent-ink">{monthShort(date)}</span>
        <span className="wd-display text-[4rem] leading-none tabular-nums sm:text-[4.8rem]">{date.getDate()}</span>
        <span className="text-sm text-wd-text">{date.getFullYear()}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-wd-accent-ink">Sesi berikutnya</p>
        <p className="wd-display mt-1 text-[clamp(1.4rem,2.6vw,1.9rem)] leading-tight">
          {dayName(date)}, pukul {formatJam(meeting.scheduled_at)}
        </p>
        <div className="mt-1">
          <MeetingLink meeting={meeting} />
        </div>
      </div>
    </div>
  );
}

function SessionRow({ meeting, past = false }: { meeting: Meeting; past?: boolean }) {
  const date = new Date(meeting.scheduled_at);
  return (
    <li className={`flex items-center gap-4 border-b border-wd-line py-3 ${past ? "opacity-75" : ""}`}>
      <div className="flex w-14 shrink-0 flex-col items-center">
        <span className="text-xs font-semibold uppercase text-wd-text">{monthShort(date)}</span>
        <span className="wd-display text-[1.9rem] leading-none tabular-nums">{date.getDate()}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-wd-ink">
          {dayName(date)}, pukul {formatJam(meeting.scheduled_at)}
        </p>
        <MeetingLink meeting={meeting} />
      </div>
    </li>
  );
}
