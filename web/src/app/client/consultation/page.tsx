"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/Button";
import { CLIENT_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
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

function ClientConsultationContent({ user }: { user: CurrentUser }) {
  const router = useRouter();
  const { show } = useToast();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scheduledAt, setScheduledAt] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [saving, setSaving] = useState(false);

  function load() {
    return apiGet<Meeting[]>("/api/v1/meetings/consultation")
      .then((d) => setMeetings(d ?? []))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Gagal memuat jadwal konsultasi."))
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
      show("Sesi konsultasi dijadwalkan.", "success");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menjadwalkan sesi.");
    } finally {
      setSaving(false);
    }
  }

  async function handleChat() {
    const conv = await apiPost<Conversation>("/api/v1/conversations/consultation", {});
    router.push(`/client/messages/${conv.id}`);
  }

  const sorted = [...meetings].sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));

  return (
    <Shell user={user} navItems={CLIENT_NAV} loginPath="/login" eyebrow="Client">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <PageHeader
          title="Konsultasi"
          subtitle="Jadwalkan sesi dengan Wedding Consultant, atau chat langsung kapan saja."
          action={
            <Button className="w-auto" onClick={handleChat}>
              Chat Sekarang
            </Button>
          }
        />

        <Card className="mb-6 p-5">
          <h2 className="font-heading text-lg font-bold text-dc-navy">Jadwalkan Sesi Baru</h2>
          <form onSubmit={handleSchedule} className="mt-4 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="scheduled-at" className="text-sm font-medium text-dc-navy">
                Tanggal &amp; waktu
              </label>
              <input
                id="scheduled-at"
                type="datetime-local"
                required
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full rounded-xl border border-dc-black/15 px-4 py-2.5 outline-none focus:border-dc-gold focus:ring-2 focus:ring-dc-gold/30"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="meeting-link" className="text-sm font-medium text-dc-navy">
                Link meeting (opsional, Zoom/Meet)
              </label>
              <input
                id="meeting-link"
                type="text"
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                placeholder="https://meet.google.com/…"
                className="w-full rounded-xl border border-dc-black/15 px-4 py-2.5 outline-none focus:border-dc-gold focus:ring-2 focus:ring-dc-gold/30"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" loading={saving} className="w-auto">
              Jadwalkan
            </Button>
          </form>
        </Card>

        <h2 className="font-heading mb-3 text-lg font-bold text-dc-navy">Jadwal Konsultasi</h2>
        {loading ? (
          <p className="text-sm text-dc-black/60">Memuat…</p>
        ) : sorted.length === 0 ? (
          <EmptyState title="Belum ada sesi terjadwal" body="Jadwalkan sesi baru di atas." />
        ) : (
          <ul className="space-y-3">
            {sorted.map((m) => (
              <li key={m.id}>
                <MeetingCard meeting={m} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </Shell>
  );
}

function MeetingCard({ meeting }: { meeting: Meeting }) {
  const date = new Date(meeting.scheduled_at);
  return (
    <Card className="flex items-center justify-between p-4">
      <div>
        <p className="font-semibold text-dc-navy">
          {date.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
        <p className="text-sm text-dc-black/60">{date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB</p>
      </div>
      {meeting.meeting_link && (
        <a
          href={meeting.meeting_link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold text-dc-gold hover:text-dc-navy"
        >
          Buka Link →
        </a>
      )}
    </Card>
  );
}
