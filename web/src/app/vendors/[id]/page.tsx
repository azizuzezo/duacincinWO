"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";

import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { WithUser } from "@/components/WithUser";
import { apiGet, apiPost, ApiError, categoryLabel, formatRupiah, type Booking, type Conversation, type VendorProfile } from "@/lib/api";

export default function VendorDetailPage({ params }: PageProps<"/vendors/[id]">) {
  const { id } = use(params);

  return (
    <WithUser allowedRoles={["client"]} loginPath="/client/login">
      {() => <VendorDetailContent id={id} />}
    </WithUser>
  );
}

function VendorDetailContent({ id }: { id: string }) {
  const router = useRouter();
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [eventDate, setEventDate] = useState("");
  const [packageDescription, setPackageDescription] = useState("");
  const [agreedPrice, setAgreedPrice] = useState("");
  const [bookingSaving, setBookingSaving] = useState(false);

  useEffect(() => {
    apiGet<VendorProfile>(`/api/v1/vendors/${id}`)
      .then(setProfile)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Vendor tidak ditemukan."));
  }, [id]);

  async function handleStartChat() {
    setStarting(true);
    try {
      const conv = await apiPost<Conversation>(`/api/v1/conversations/vendor/${id}`, {});
      router.push(`/client/messages/${conv.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memulai chat.");
      setStarting(false);
    }
  }

  async function handleSubmitBooking(e: React.FormEvent) {
    e.preventDefault();
    setBookingSaving(true);
    setError(null);
    try {
      const booking = await apiPost<Booking>("/api/v1/bookings", {
        vendor_id: id,
        event_date: eventDate,
        package_description: packageDescription,
        agreed_price: Number(agreedPrice) || 0,
      });
      router.push(`/client/bookings/${booking.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal mengajukan booking.");
      setBookingSaving(false);
    }
  }

  if (error) return <p className="mx-auto max-w-2xl px-4 py-10 text-red-600">{error}</p>;
  if (!profile) return <p className="mx-auto max-w-2xl px-4 py-10 text-dc-black/60">Memuat…</p>;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-dc-gold">{categoryLabel(profile.category)}</p>
      <h1 className="font-heading mt-1 text-2xl font-extrabold text-dc-navy sm:text-3xl">{profile.business_name}</h1>
      <p className="mt-1 text-dc-black/60">{profile.city}</p>
      <p className="mt-2 font-medium text-dc-navy">
        {formatRupiah(profile.price_min)} – {formatRupiah(profile.price_max)}
      </p>
      <p className="mt-4 whitespace-pre-line text-dc-black/80">{profile.description}</p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button className="w-auto" onClick={handleStartChat} loading={starting}>
          Chat dengan Vendor Ini
        </Button>
        <Button variant="ghost" className="w-auto" onClick={() => setShowBookingForm((v) => !v)}>
          Ajukan Booking
        </Button>
      </div>

      {showBookingForm && (
        <form onSubmit={handleSubmitBooking} className="mt-4 flex flex-col gap-4 rounded-2xl border border-dc-black/10 bg-dc-white p-5">
          <p className="text-sm text-dc-black/60">
            Ajukan booking setelah harga & paket disepakati lewat chat — Vendor akan mengonfirmasi sebelum kamu membayar DP.
          </p>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="event-date" className="text-sm font-medium text-dc-navy">
              Tanggal Acara
            </label>
            <input
              id="event-date"
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              required
              className="w-full rounded-xl border border-dc-black/15 bg-dc-white px-4 py-2.5 outline-none focus:border-dc-gold focus:ring-2 focus:ring-dc-gold/30"
            />
          </div>
          <TextField label="Deskripsi Paket" value={packageDescription} onChange={setPackageDescription} />
          <TextField label="Harga Disepakati (Rp)" type="number" value={agreedPrice} onChange={setAgreedPrice} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" loading={bookingSaving}>
            Kirim Pengajuan Booking
          </Button>
        </form>
      )}

      {profile.portfolio && profile.portfolio.length > 0 && (
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {profile.portfolio.map((p) => (
            <div key={p.id} className="relative aspect-square overflow-hidden rounded-xl bg-dc-offwhite">
              <Image src={p.url} alt={p.alt_text || "Portofolio vendor"} fill className="object-cover" unoptimized />
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
