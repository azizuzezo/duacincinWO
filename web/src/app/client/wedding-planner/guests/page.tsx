"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/Button";
import { CLIENT_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
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
      .catch((err) => setError(err instanceof ApiError ? err.message : "Gagal memuat daftar tamu."));
  }

  function loadLink() {
    return apiGet<RSVPLink>("/api/v1/guests/rsvp-link").then((l) => {
      setLink(l);
      setEventName(l.event_name);
      setEventDate(l.event_date ?? "");
      setVenueNote(l.venue_note);
    });
  }

  useEffect(() => {
    Promise.all([loadGuests(), loadLink()]).finally(() => setLoading(false));
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
      <div className="mx-auto max-w-2xl px-4 py-10">
        <WeddingPlannerTabs />
        <PageHeader title="Tamu & RSVP" subtitle="Bagikan link RSVP ke tamu, atau catat sendiri yang konfirmasi lewat telepon/WhatsApp." />

        {loading ? (
          <p className="text-dc-black/60">Memuat…</p>
        ) : (
          <>
            {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

            <div className="mb-6 grid grid-cols-3 gap-3">
              <Card className="p-4 text-center">
                <p className="font-heading text-xl font-extrabold text-dc-navy">{attendingCount}</p>
                <p className="text-xs text-dc-black/50">Hadir (orang)</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="font-heading text-xl font-extrabold text-dc-navy">{notAttendingCount}</p>
                <p className="text-xs text-dc-black/50">Tidak Hadir</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="font-heading text-xl font-extrabold text-dc-navy">{pendingCount}</p>
                <p className="text-xs text-dc-black/50">Belum Konfirmasi</p>
              </Card>
            </div>

            <Card className="mb-6 p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-heading font-bold text-dc-navy">Link RSVP</h2>
                <button onClick={() => setEditingLink((v) => !v)} className="text-sm font-semibold text-dc-gold hover:text-dc-navy">
                  {editingLink ? "Batal" : "Atur"}
                </button>
              </div>

              {!editingLink ? (
                <div className="mt-3 flex items-center gap-2">
                  <input
                    readOnly
                    value={shareUrl}
                    className="flex-1 truncate rounded-xl border border-dc-black/15 bg-dc-offwhite px-3 py-2 text-sm text-dc-black/70"
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
                    placeholder="Nama acara (mis. Pernikahan Aziz & Dian)"
                    className="w-full rounded-xl border border-dc-black/15 px-4 py-2.5 outline-none focus:border-dc-gold focus:ring-2 focus:ring-dc-gold/30"
                  />
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full rounded-xl border border-dc-black/15 px-4 py-2.5 outline-none focus:border-dc-gold focus:ring-2 focus:ring-dc-gold/30"
                  />
                  <textarea
                    value={venueNote}
                    onChange={(e) => setVenueNote(e.target.value)}
                    rows={2}
                    placeholder="Catatan venue/lokasi untuk tamu"
                    className="w-full rounded-xl border border-dc-black/15 px-4 py-2.5 outline-none focus:border-dc-gold focus:ring-2 focus:ring-dc-gold/30"
                  />
                  <Button type="submit" className="w-auto" loading={saving}>
                    Simpan
                  </Button>
                </form>
              )}
            </Card>

            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-heading font-bold text-dc-navy">Daftar Tamu</h2>
              <Button variant="ghost" className="w-auto" onClick={() => setShowAddForm((v) => !v)}>
                {showAddForm ? "Batal" : "+ Tambah Tamu"}
              </Button>
            </div>

            {showAddForm && (
              <Card className="mb-4 p-5">
                <form onSubmit={handleAddGuest} className="flex flex-col gap-3">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Nama tamu"
                    required
                    className="w-full rounded-xl border border-dc-black/15 px-4 py-2.5 outline-none focus:border-dc-gold focus:ring-2 focus:ring-dc-gold/30"
                  />
                  <div className="grid grid-cols-3 gap-3">
                    <input
                      type="text"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      placeholder="No. telepon"
                      className="col-span-1 rounded-xl border border-dc-black/15 px-3 py-2.5 outline-none focus:border-dc-gold focus:ring-2 focus:ring-dc-gold/30"
                    />
                    <input
                      type="number"
                      min={1}
                      value={newPartySize}
                      onChange={(e) => setNewPartySize(e.target.value)}
                      placeholder="Jumlah orang"
                      className="col-span-1 rounded-xl border border-dc-black/15 px-3 py-2.5 outline-none focus:border-dc-gold focus:ring-2 focus:ring-dc-gold/30"
                    />
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value as GuestRSVPStatus)}
                      className="col-span-1 rounded-xl border border-dc-black/15 px-3 py-2.5 outline-none focus:border-dc-gold focus:ring-2 focus:ring-dc-gold/30"
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
                    <Card className="flex items-center justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-dc-navy">
                          {g.name} {g.party_size > 1 && <span className="text-dc-black/50">({g.party_size} orang)</span>}
                        </p>
                        {g.phone && <p className="text-xs text-dc-black/50">{g.phone}</p>}
                        {g.message && <p className="mt-0.5 text-xs italic text-dc-black/50">&ldquo;{g.message}&rdquo;</p>}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <select
                          value={g.rsvp_status}
                          onChange={(e) => handleStatusChange(g, e.target.value as GuestRSVPStatus)}
                          className="rounded-lg border border-dc-black/15 px-2 py-1 text-xs outline-none"
                        >
                          <option value="attending">Hadir</option>
                          <option value="not_attending">Tidak Hadir</option>
                          <option value="pending">Belum Konfirmasi</option>
                        </select>
                        <Badge tone={STATUS_TONE[g.rsvp_status]}>{STATUS_LABEL[g.rsvp_status]}</Badge>
                        <button onClick={() => handleDeleteGuest(g.id)} aria-label="Hapus tamu" className="text-dc-black/30 hover:text-red-600">
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
