"use client";

import { useEffect, useState } from "react";

import { Button, buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { controlClasses, Input, Select, Textarea } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Sheet";
import { Skeleton, SkeletonGroup } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { WithUser } from "@/components/WithUser";
import { CountUp, MotionItem, MotionList } from "@/components/ui/Motion";
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

import { FilterChips, formatTanggal, Icon, Initials, InlineAlert, MobileActionBar, PlannerFrame, PlannerTitle } from "../_parts";

const STATUS_LABEL: Record<GuestRSVPStatus, string> = {
  pending: "Belum konfirmasi",
  attending: "Hadir",
  not_attending: "Tidak hadir",
};

// The status select carries its state in text color + label (never color alone).
const STATUS_TONE: Record<GuestRSVPStatus, string> = {
  pending: "text-dc-text-2",
  attending: "text-dc-success",
  not_attending: "text-dc-danger",
};

type Filter = "all" | GuestRSVPStatus;

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
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

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
    try {
      await navigator.clipboard.writeText(shareUrl);
      show("Link RSVP disalin.", "success");
    } catch {
      show("Link belum bisa disalin. Tekan lama pada link untuk menyalin.", "danger");
    }
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
      setEditingLink(false);
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
      setShowAddForm(false);
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
    setConfirmDelete(null);
    try {
      await apiDelete(`/api/v1/guests/${id}`);
      setGuests((prev) => prev.filter((g) => g.id !== id));
      show("Tamu dihapus.", "success");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menghapus tamu.");
    }
  }

  const attendingCount = guests.filter((g) => g.rsvp_status === "attending").reduce((sum, g) => sum + g.party_size, 0);
  const notAttendingCount = guests.filter((g) => g.rsvp_status === "not_attending").length;
  const pendingCount = guests.filter((g) => g.rsvp_status === "pending").length;
  const attendingGuests = guests.filter((g) => g.rsvp_status === "attending").length;
  const total = guests.length;

  const q = query.trim().toLowerCase();
  const shown = guests.filter((g) => (filter === "all" || g.rsvp_status === filter) && (!q || g.name.toLowerCase().includes(q) || g.phone.includes(q)));

  const waShare = shareUrl
    ? `https://wa.me/?text=${encodeURIComponent(`Mohon konfirmasi kehadiran di ${link?.event_name || "pernikahan kami"} lewat link ini: ${shareUrl}`)}`
    : "";

  const addButton = (
    <Button variant="gold" onClick={() => setShowAddForm(true)}>
      <Icon name="plus" size={18} />
      Tambah tamu
    </Button>
  );

  return (
    <PlannerFrame user={user} bottomBar>
      <PlannerTitle
        title="Tamu,"
        accent="dan siapa yang datang"
        subtitle="Bagikan link RSVP ke tamu, atau catat sendiri yang konfirmasi lewat telepon dan WhatsApp."
        action={addButton}
      />

      <InlineAlert message={error} onClose={() => setError(null)} />

      {loading ? (
        <SkeletonGroup label="Memuat daftar tamu" className="flex flex-col gap-6">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <Skeleton className="h-60 rounded-2xl" />
            <Skeleton className="h-60 rounded-2xl" />
          </div>
          <Skeleton className="h-11 w-80 rounded-full" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </SkeletonGroup>
      ) : loadError ? (
        <ErrorState title="Daftar tamu belum termuat" body={loadError} onRetry={loadAll} />
      ) : (
        <>
          <div className="mb-10 grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
            {/* Focal point: how many people are coming (what venue and catering need). */}
            <section aria-label="Ringkasan RSVP" className="rounded-2xl border border-dc-line bg-dc-white p-6 shadow-soft sm:p-8">
              <p className="text-sm font-semibold text-dc-text-2">Akan hadir</p>
              <p className="mt-1 flex flex-wrap items-baseline gap-x-3">
                <span className="font-heading text-[4.2rem] font-semibold leading-none text-dc-ink [font-variant-numeric:lining-nums_tabular-nums]">
                  <CountUp value={attendingCount} />
                </span>
                <span className="text-dc-text-2">orang, dari {attendingGuests} undangan</span>
              </p>
              {total > 0 && (
                <div aria-hidden className="mt-6 flex h-2.5 w-full overflow-hidden rounded-full bg-dc-cream">
                  <span className="h-full bg-dc-gold" style={{ width: `${(attendingGuests / total) * 100}%` }} />
                  <span className="h-full bg-dc-line-strong" style={{ width: `${(pendingCount / total) * 100}%` }} />
                  <span className="h-full bg-dc-text-3" style={{ width: `${(notAttendingCount / total) * 100}%` }} />
                </div>
              )}
              <dl className="mt-5 grid grid-cols-3 gap-3">
                {[
                  { label: "Hadir", value: attendingGuests, dot: "bg-dc-gold" },
                  { label: "Belum konfirmasi", value: pendingCount, dot: "bg-dc-line-strong" },
                  { label: "Tidak hadir", value: notAttendingCount, dot: "bg-dc-text-3" },
                ].map((t) => (
                  <div key={t.label} className="flex min-w-0 flex-col-reverse justify-end">
                    <dt className="mt-1 flex items-start gap-1.5 text-xs leading-snug text-dc-text-2 sm:text-sm">
                      <span aria-hidden className={`mt-1 h-2 w-2 shrink-0 rounded-full ${t.dot}`} />
                      {t.label}
                    </dt>
                    <dd className="font-heading text-[1.9rem] font-semibold leading-none text-dc-ink [font-variant-numeric:lining-nums_tabular-nums]">{t.value}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 text-xs text-dc-text-3">Hitungan per undangan. Jumlah orang di atas sudah termasuk pendamping.</p>
            </section>

            <section aria-labelledby="rsvp-link-h" className="flex flex-col rounded-2xl bg-dc-cream p-6 sm:p-8">
              <div className="flex items-start justify-between gap-3">
                <h2 id="rsvp-link-h" className="font-heading text-[1.9rem] leading-tight text-dc-ink">
                  Link RSVP
                </h2>
                <Button variant="quiet" size="sm" onClick={() => setEditingLink(true)}>
                  <Icon name="pencil" size={16} />
                  Atur acara
                </Button>
              </div>
              {link && (
                <ul className="mt-2 flex flex-col gap-1.5 text-sm text-dc-text-2">
                  <li className="font-semibold text-dc-ink">{link.event_name || "Nama acara belum diisi"}</li>
                  <li className="inline-flex items-center gap-2">
                    <Icon name="calendar" size={16} className="text-dc-clay" />
                    {link.event_date ? formatTanggal(link.event_date) : "Tanggal belum diisi"}
                  </li>
                  {link.venue_note && (
                    <li className="inline-flex items-start gap-2">
                      <Icon name="pin" size={16} className="mt-0.5 shrink-0 text-dc-clay" />
                      <span className="min-w-0 break-words">{link.venue_note}</span>
                    </li>
                  )}
                </ul>
              )}
              <div className="mt-auto pt-5">
                <label htmlFor="rsvp-url" className="sr-only">
                  Link RSVP
                </label>
                <input id="rsvp-url" readOnly value={shareUrl} onFocus={(e) => e.currentTarget.select()} className={`${controlClasses} truncate text-sm text-dc-text-2`} />
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="primary" size="sm" onClick={handleCopyLink}>
                    <Icon name="copy" size={16} />
                    Salin link
                  </Button>
                  {waShare && (
                    <a href={waShare} target="_blank" rel="noopener noreferrer" className={buttonClasses({ variant: "ghost", size: "sm" })}>
                      <Icon name="send" size={16} />
                      Kirim lewat WhatsApp
                    </a>
                  )}
                </div>
              </div>
            </section>
          </div>

          <section aria-labelledby="daftar-h">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <h2 id="daftar-h" className="font-heading text-[2rem] leading-tight text-dc-ink">
                Daftar tamu <span className="text-dc-text-3 [font-variant-numeric:lining-nums]">({total})</span>
              </h2>
            </div>

            {total === 0 ? (
              <EmptyState
                title="Belum ada tamu"
                body="Bagikan link RSVP di atas, atau tambah tamu yang sudah konfirmasi lewat telepon."
                action={
                  <Button variant="primary" size="sm" onClick={() => setShowAddForm(true)}>
                    Tambah tamu pertama
                  </Button>
                }
              />
            ) : (
              <>
                <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <FilterChips<Filter>
                    label="Saring status RSVP"
                    value={filter}
                    onChange={setFilter}
                    options={[
                      { value: "all", label: "Semua", count: total },
                      { value: "attending", label: "Hadir", count: attendingGuests },
                      { value: "pending", label: "Belum", count: pendingCount },
                      { value: "not_attending", label: "Tidak", count: notAttendingCount },
                    ]}
                  />
                  <div className="relative lg:w-72">
                    <label htmlFor="cari-tamu" className="sr-only">
                      Cari tamu
                    </label>
                    <Icon name="search" size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-dc-text-3" />
                    <input
                      id="cari-tamu"
                      type="search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Cari nama atau nomor"
                      className={`${controlClasses} pl-11`}
                    />
                  </div>
                </div>

                {shown.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-dc-line-strong bg-dc-white/70 px-6 py-10 text-center text-dc-text-2">
                    Tidak ada tamu yang cocok. Coba kata lain atau pilih &quot;Semua&quot;.
                  </p>
                ) : (
                  // Rows arrive in sequence so a long list reads as a list, not a wall.
                  <MotionList className="divide-y divide-dc-line overflow-hidden rounded-xl border border-dc-line bg-dc-white shadow-soft">
                    {shown.map((g) => (
                      <MotionItem key={g.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4 sm:px-5">
                        <Initials name={g.name} className="h-11 w-11 text-lg" />
                        <div className="min-w-0 flex-1 basis-48">
                          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="break-words font-semibold text-dc-ink">{g.name}</span>
                            {g.party_size > 1 && <span className="text-sm text-dc-text-2">bersama {g.party_size - 1} orang</span>}
                          </p>
                          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-sm text-dc-text-3">
                            {g.phone && (
                              <span className="inline-flex items-center gap-1.5 tabular-nums">
                                <Icon name="phone" size={14} />
                                {g.phone}
                              </span>
                            )}
                            <span>{g.source === "rsvp_form" ? "Isi sendiri lewat link" : "Dicatat manual"}</span>
                          </p>
                          {g.message && <p className="mt-1.5 break-words font-heading text-lg italic leading-snug text-dc-clay">&ldquo;{g.message}&rdquo;</p>}
                        </div>
                        <div className="flex w-full items-center gap-2 sm:w-auto">
                          <label htmlFor={`st-${g.id}`} className="sr-only">
                            Ubah status RSVP {g.name}
                          </label>
                          <select
                            id={`st-${g.id}`}
                            value={g.rsvp_status}
                            onChange={(e) => handleStatusChange(g, e.target.value as GuestRSVPStatus)}
                            className={`${controlClasses} min-h-11 flex-1 py-0 text-sm font-semibold sm:w-48 sm:flex-none ${STATUS_TONE[g.rsvp_status]}`}
                          >
                            {(["attending", "not_attending", "pending"] as GuestRSVPStatus[]).map((v) => (
                              <option key={v} value={v}>
                                {STATUS_LABEL[v]}
                              </option>
                            ))}
                          </select>
                          {confirmDelete === g.id ? (
                            <span className="flex items-center gap-1">
                              <Button variant="danger" size="sm" onClick={() => handleDeleteGuest(g.id)} aria-label={`Ya, hapus ${g.name}`}>
                                Hapus
                              </Button>
                              <Button variant="quiet" size="sm" onClick={() => setConfirmDelete(null)}>
                                Batal
                              </Button>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDelete(g.id)}
                              aria-label={`Hapus tamu: ${g.name}`}
                              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-dc-text-3 transition-colors hover:bg-dc-danger/10 hover:text-dc-danger"
                            >
                              <Icon name="trash" size={18} />
                            </button>
                          )}
                        </div>
                      </MotionItem>
                    ))}
                  </MotionList>
                )}
              </>
            )}
          </section>
        </>
      )}

      {!loading && !loadError && (
        <MobileActionBar>
          <Button variant="gold" block onClick={() => setShowAddForm(true)}>
            <Icon name="plus" size={18} />
            Tambah tamu
          </Button>
        </MobileActionBar>
      )}

      <Sheet
        open={showAddForm}
        onClose={() => setShowAddForm(false)}
        title="Tambah tamu"
        description="Untuk tamu yang konfirmasi lewat telepon atau WhatsApp."
        footer={
          <Button type="submit" form="add-guest" variant="primary" block loading={saving}>
            Simpan tamu
          </Button>
        }
      >
        <form id="add-guest" onSubmit={handleAddGuest} className="flex flex-col gap-5">
          <Input label="Nama tamu" value={newName} onChange={(e) => setNewName(e.target.value)} required autoComplete="off" />
          <Input label="Nomor WhatsApp" optional type="tel" inputMode="tel" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="08xx" />
          <Input label="Jumlah orang" type="number" inputMode="numeric" min={1} value={newPartySize} onChange={(e) => setNewPartySize(e.target.value)} hint="Termasuk tamu itu sendiri." />
          <Select label="Status RSVP" value={newStatus} onChange={(e) => setNewStatus(e.target.value as GuestRSVPStatus)}>
            <option value="attending">Hadir</option>
            <option value="not_attending">Tidak hadir</option>
            <option value="pending">Belum konfirmasi</option>
          </Select>
        </form>
      </Sheet>

      <Sheet
        open={editingLink}
        onClose={() => setEditingLink(false)}
        title="Atur acara"
        description="Yang dilihat tamu saat membuka link RSVP."
        footer={
          <Button type="submit" form="rsvp-settings" variant="primary" block loading={saving}>
            Simpan
          </Button>
        }
      >
        <form id="rsvp-settings" onSubmit={handleSaveLinkSettings} className="flex flex-col gap-5">
          <Input label="Nama acara" value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="Misalnya: Pernikahan Aziz & Dian" />
          <Input label="Tanggal acara" type="date" value={eventDate ? eventDate.slice(0, 10) : ""} onChange={(e) => setEventDate(e.target.value)} hint={eventDate ? formatTanggal(eventDate) : undefined} />
          <Textarea label="Catatan lokasi" value={venueNote} onChange={(e) => setVenueNote(e.target.value)} rows={3} placeholder="Alamat atau petunjuk lokasi untuk tamu" />
        </form>
      </Sheet>
    </PlannerFrame>
  );
}
