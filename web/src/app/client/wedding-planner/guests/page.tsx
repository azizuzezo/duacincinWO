"use client";

import { useEffect, useState } from "react";

import { ErrorState, ERROR_TEXT, H2, ICON_BTN, INPUT, LINK, Skeleton, SkeletonList } from "@/app/client/_ui";
import { Button } from "@/components/Button";
import { CLIENT_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader }
 from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { WeddingPlannerTabs } from "@/components/WeddingPlannerTabs";
import { WithUser } from "@/components/WithUser";
import {
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
  apiPut,
  ApiError,
  type CurrentUser,
  type Guest,
  type GuestRSVPStatus,
  type RSVPLink,
} from "@/lib/api";

const STATUS_LABEL: Record<GuestRSVPStatus, string> = {
  pending: "Belum Konfirmasi",
  attending: "Hadir",
  not_attending: "Tidak Hadir",
};

const STATUS_TONE: Record<GuestRSVPStatus, "neutral" | "success" | "danger"> = {
  pending: "neutral",
  attending: "success",
  not_attending: "danger",
};

export default function GuestListPage() {
  return (
    <WithUser allowedRoles={["client"]} loginPath="/login">
      {(user) => <GuestListContent user={user} />}
    </WithUser>
  );
}

function GuestListContent({ user }: { user: CurrentUser }) {
  const { show } = useToast();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [link, setLink] = useState<RSVPLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingLink, setEditingLink] = useState(false);
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [venueNote, setVenueNote] = useState("");
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newPartySize, setNewPartySize] = useState("1");
  const [newStatus, setNewStatus] = useState<GuestRSVPStatus>("attending");
  const [saving, setSaving] = useState(false);

  function loadGuests() {
    return apiGet<Guest[]>("/api/v1/guests")
      .then((d) => setGuests(d ?? []))
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "Gagal memuat daftar tamu."));
  }

  function loadLink() {
    return apiGet<RSVPLink>("/api/v1/guests/rsvp-link").then((l) => {
      setLink(l);
      setEventName(l.event_name);
      setEventDate(l.event_date ?? "");
      setVenueNote(l.venue_note);
    });
  }

  function loadAll() {
    setLoading(true);
    setLoadError(null);
    Promise.all([loadGuests(), loadLink()])
      .catch(() => setLoadError((e) => e ?? "Gagal memuat link RSVP."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    queueMicrotask(loadAll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shareUrl = link && typeof window !== "undefined" ? `${window.location.origin}/rsvp/${link.token}` : "";

  async function handleCopyLink() {
    await navigator.clipboard.writeText(shareUrl);
    show("Link RSVP disalin.", "success");
  }

  async function handleSaveLinkSettings(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiPut("/api/v1/guests/rsvp-link", { event_name: eventName, event_date: eventDate || null, venue_note: venueNote });
      show("Pengaturan RSVP disimpan.", "success");
      setEditingLink(false);
      await loadLink();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menyimpan pengaturan.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddGuest(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    try {
      await apiPost("/api/v1/guests", {
        name: newName,
        phone: newPhone,
        party_size: Number(newPartySize) || 1,
        rsvp_status: newStatus,
      });
      setNewName("");
      setNewPhone("");
      setNewPartySize("1");
      setNewStatus("attending");
      setShowAddForm(false);
      show("Tamu ditambahkan.", "success");
      await loadGuests();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menambah tamu.");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(guest: Guest, status: GuestRSVPStatus) {
    setGuests((prev) => prev.map((g) => (g.id === guest.id ? { ...g, rsvp_status: status } : g)));
    try {
      await apiPatch(`/api/v1/guests/${guest.id}`, {
        name: guest.name,
        phone: guest.phone,
        party_size: guest.party_size,
        rsvp_status: status,
        message: guest.message,
      });
    } catch (err) {
      setGuests((prev) => prev.map((g) => (g.id === guest.id ? { ...g, rsvp_status: guest.rsvp_status } : g)));
      setError(err instanceof ApiError ? err.message : "Gagal memperbarui status.");
    }
  }

  async function handleDeleteGuest(id: string) {
    try {
      await apiDelete(`/api/v1/guests/${id}`);
      setGuests((prev) => prev.filter((g) => g.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menghapus tamu.");
    }
  }

  const attendingCount = guests.filter((g) => g.rsvp_status === "attending").reduce((sum, g) => sum + g.party_size, 0);
  const notAttendingCount = guests.filter((g) => g.rsvp_status === "not_attending").length;
  const pendingCount = guests.filter((g) => g.rsvp_status === "pending").length;

  return (
    <Shell user={user} navItems={CLIENT_NAV} loginPath="/login" eyebrow="Client">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-10">
        <WeddingPlannerTabs />
        <PageHeader title="Tamu & RSVP" subtitle="Bagikan link RSVP ke tamu, atau catat sendiri yang konfirmasi lewat telepon/WhatsApp." />

        {loading ? (
          <div role="status" aria-label="Memuat" className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-3">
              <Skeleton className="h-20 rounded-lg" />
              <Skeleton className="h-20 rounded-lg" />
              <Skeleton className="h-20 rounded-lg" />
            </div>
            <SkeletonList rows={3} />
          </div>
        ) : loadError ? (
          <ErrorState message={loadError} onRetry={loadAll} />
        ) : (
          <>
            {error && (
              <p role="alert" className={`mb-4 ${ERROR_TEXT}`}>
                {error}
              </p>
            )}

            <div className="mb-6 grid grid-cols-3 gap-3">
              {[
                { label: "Hadir (orang)", value: attendingCount },
                { label: "Tidak hadir", value: notAttendingCount },
                { label: "Belum konfirmasi", value: pendingCount },
              ].map((t) => (
                <Card key={t.label} className="p-3 sm:p-4">
                  <p className="font-sans text-2xl font-semibold tabular-nums tracking-tight text-dc-ink sm:text-3xl">{t.value}</p>
                  <p className="mt-1 text-xs text-dc-black/70">{t.label}</p>
                </Card>
              ))}
            </div>

            <Card className="mb-6 p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className={H2}>Link RSVP</h2>
                <button type="button" onClick={() => setEditingLink((v) => !v)} className={LINK}>
                  {editingLink ? "Batal" : "Atur"}
                </button>
              </div>

              {!editingLink ? (
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    readOnly
                    aria-label="Link RSVP"
                    value={shareUrl}
                    className={`${INPUT} min-w-0 flex-1 truncate bg-dc-cream text-dc-black/80`}
                  />
                  <Button className="w-auto" onClick={handleCopyLink}>
                    Salin
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSaveLinkSettings} className="mt-3 flex flex-col gap-3">
                  <input
                    type="text"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    aria-label="Nama acara"
                    placeholder="Nama acara (mis. Pernikahan Aziz & Dian)"
                    className={INPUT}
                  />
                  <input
                    type="date"
                    aria-label="Tanggal acara"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className={INPUT}
                  />
                  <textarea
                    aria-label="Catatan venue"
                    value={venueNote}
                    onChange={(e) => setVenueNote(e.target.value)}
                    rows={2}
                    placeholder="Catatan venue/lokasi untuk tamu"
                    className={INPUT}
                  />
                  <Button type="submit" className="w-auto" loading={saving}>
                    Simpan
                  </Button>
                </form>
              )}
            </Card>

            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className={H2}>Daftar Tamu</h2>
              <Button variant="ghost" className="w-auto" onClick={() => setShowAddForm((v) => !v)}>
                {showAddForm ? "Batal" : "+ Tambah Tamu"}
              </Button>
            </div>

            {showAddForm && (
              <Card className="mb-4 p-5">
                <form onSubmit={handleAddGuest} className="flex flex-col gap-3">
                  <input
                    type="text"
                    aria-label="Nama tamu"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Nama tamu"
                    required
                    className={INPUT}
                  />
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <input
                      type="text"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      aria-label="No. telepon"
                      placeholder="No. telepon"
                      className={INPUT}
                    />
                    <input
                      type="number"
                      min={1}
                      value={newPartySize}
                      onChange={(e) => setNewPartySize(e.target.value)}
                      aria-label="Jumlah orang"
                      placeholder="Jumlah orang"
                      className={INPUT}
                    />
                    <select
                      aria-label="Status RSVP"
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value as GuestRSVPStatus)}
                      className={INPUT}
                    >
                      <option value="attending">Hadir</option>
                      <option value="not_attending">Tidak Hadir</option>
                      <option value="pending">Belum Konfirmasi</option>
                    </select>
                  </div>
                  <Button type="submit" className="w-auto" loading={saving}>
                    Simpan Tamu
                  </Button>
                </form>
              </Card>
            )}

            {guests.length === 0 ? (
              <EmptyState title="Belum ada tamu" body="Bagikan link RSVP di atas, atau tambah tamu manual." />
            ) : (
              <ul className="flex flex-col gap-2">
                {guests.map((g) => (
                  <li key={g.id}>
                    <Card className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 p-4">
                      <div className="min-w-0">
                        <p className="break-words font-medium text-dc-ink">
                          {g.name} {g.party_size > 1 && <span className="font-normal text-dc-black/70">({g.party_size} orang)</span>}
                        </p>
                        {g.phone && <p className="text-xs tabular-nums text-dc-black/70">{g.phone}</p>}
                        {g.message && <p className="mt-0.5 break-words text-xs italic text-dc-black/70">&ldquo;{g.message}&rdquo;</p>}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge tone={STATUS_TONE[g.rsvp_status]}>{STATUS_LABEL[g.rsvp_status]}</Badge>
                        <select
                          aria-label={`Ubah status RSVP ${g.name}`}
                          value={g.rsvp_status}
                          onChange={(e) => handleStatusChange(g, e.target.value as GuestRSVPStatus)}
                          className={`${INPUT} w-auto text-xs`}
                        >
                          <option value="attending">Hadir</option>
                          <option value="not_attending">Tidak Hadir</option>
                          <option value="pending">Belum Konfirmasi</option>
                        </select>
                        <button type="button" onClick={() => handleDeleteGuest(g.id)} aria-label={`Hapus tamu: ${g.name}`} className={`${ICON_BTN} hover:text-red-700`}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M6 6l12 12M18 6 6 18" />
                          </svg>
                        </button>
                      </div>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </Shell>
  );
}
