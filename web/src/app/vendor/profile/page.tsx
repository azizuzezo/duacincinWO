"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

import { Button } from "@/components/Button";
import { PasswordSection } from "@/components/PasswordSection";
import { VENDOR_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { TextField } from "@/components/TextField";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { DashboardBanner } from "@/components/ui/DashboardBanner";
import { WithUser } from "@/components/WithUser";
import { apiGet, apiPost, apiPut, ApiError, VENDOR_CATEGORIES, type CurrentUser, type VendorProfile } from "@/lib/api";

const STATUS_LABEL: Record<VendorProfile["status"], { text: string; tone: "gold" | "success" | "danger" }> = {
  pending: { text: "Menunggu review Admin", tone: "gold" },
  approved: { text: "Disetujui, tampil di direktori", tone: "success" },
  rejected: { text: "Ditolak", tone: "danger" },
};

export default function VendorProfilePage() {
  return (
    <WithUser allowedRoles={["vendor"]} loginPath="/login">
      {(user) => <VendorProfileContent user={user} />}
    </WithUser>
  );
}

function VendorProfileContent({ user }: { user: CurrentUser }) {
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [category, setCategory] = useState(VENDOR_CATEGORIES[0].value);
  const [city, setCity] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function applyProfile(p: VendorProfile) {
    setProfile(p);
    setCategory(p.category);
    setCity(p.city);
    setPriceMin(String(p.price_min));
    setPriceMax(String(p.price_max));
    setDescription(p.description);
  }

  function loadProfile() {
    return apiGet<VendorProfile>("/api/v1/vendor/profile/me")
      .then(applyProfile)
      .catch(() => {
        /* belum punya profil — biarkan form kosong */
      });
  }

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const updated = await apiPut<VendorProfile>("/api/v1/vendor/profile", {
        business_name: profile?.business_name ?? "",
        category,
        city,
        price_min: Number(priceMin) || 0,
        price_max: Number(priceMax) || 0,
        description,
      });
      applyProfile(updated);
      setSuccess("Profil tersimpan.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menyimpan profil.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Shell user={user} navItems={VENDOR_NAV} loginPath="/login" eyebrow="Vendor">
      <DashboardBanner
        title={profile?.business_name || "Lengkapi Profil Vendor"}
        subtitle={
          profile
            ? "Perbarui detail usahamu supaya makin menarik di direktori."
            : "Isi profil usahamu supaya bisa mulai menerima booking dari calon pengantin."
        }
        action={profile && <Badge tone={STATUS_LABEL[profile.status].tone}>{STATUS_LABEL[profile.status].text}</Badge>}
      />

      <div className="mx-auto max-w-2xl px-4 py-10">
        {profile?.status === "rejected" && profile.rejection_reason && (
          <p className="mb-4 text-sm text-red-600">Alasan: {profile.rejection_reason}</p>
        )}

        {profile && (
          <Card className="mb-6 p-5">
            <NameChangeSection profile={profile} onRequested={loadProfile} />
          </Card>
        )}

        <Card className="p-5">
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="vendor-category" className="text-sm font-medium text-dc-navy">
                Kategori
              </label>
              <select
                id="vendor-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-dc-black/15 bg-dc-white px-4 py-2.5 outline-none focus:border-dc-gold focus:ring-2 focus:ring-dc-gold/30"
              >
                {VENDOR_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <TextField label="Kota" value={city} onChange={setCity} />

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="price-min" className="text-sm font-medium text-dc-navy">
                  Harga minimum (Rp)
                </label>
                <input
                  id="price-min"
                  type="text"
                  inputMode="numeric"
                  value={priceMin ? Number(priceMin).toLocaleString("id-ID") : ""}
                  onChange={(e) => setPriceMin(e.target.value.replace(/\D/g, ""))}
                  className="w-full rounded-xl border border-dc-black/15 bg-dc-white px-4 py-2.5 outline-none focus:border-dc-gold focus:ring-2 focus:ring-dc-gold/30"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="price-max" className="text-sm font-medium text-dc-navy">
                  Harga maksimum (Rp)
                </label>
                <input
                  id="price-max"
                  type="text"
                  inputMode="numeric"
                  value={priceMax ? Number(priceMax).toLocaleString("id-ID") : ""}
                  onChange={(e) => setPriceMax(e.target.value.replace(/\D/g, ""))}
                  className="w-full rounded-xl border border-dc-black/15 bg-dc-white px-4 py-2.5 outline-none focus:border-dc-gold focus:ring-2 focus:ring-dc-gold/30"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="vendor-description" className="text-sm font-medium text-dc-navy">
                Deskripsi
              </label>
              <textarea
                id="vendor-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full rounded-xl border border-dc-black/15 bg-dc-white px-4 py-2.5 outline-none focus:border-dc-gold focus:ring-2 focus:ring-dc-gold/30"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            <AnimatePresence>
              {success && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5 text-sm text-green-700"
                >
                  <CheckIcon /> {success}
                </motion.p>
              )}
            </AnimatePresence>
            <Button type="submit" loading={saving}>
              Simpan Profil
            </Button>
          </form>
        </Card>

        {profile && (
          <Link
            href="/vendor/portfolio"
            className="mt-6 flex items-center justify-between rounded-2xl bg-dc-white px-5 py-4 shadow-md shadow-dc-navy/6 transition hover:shadow-lg hover:shadow-dc-navy/10"
          >
            <div>
              <p className="font-heading font-bold text-dc-navy">Portofolio</p>
              <p className="text-sm text-dc-black/60">{profile.portfolio?.length ?? 0} foto tersimpan</p>
            </div>
            <ArrowIcon />
          </Link>
        )}

        {profile && (
          <Card className="mt-6 p-5">
            <h2 className="font-heading font-bold text-dc-navy">Ulasan</h2>
            <p className="mt-1 text-sm text-dc-black/60">
              {profile.review_count > 0
                ? `Rating rata-rata ★ ${profile.average_rating.toFixed(1)} dari ${profile.review_count} ulasan`
                : "Belum ada ulasan — tampil setelah booking pertamamu selesai dan direview client."}
            </p>
          </Card>
        )}

        <Card className="mt-6 p-5">
          <PasswordSection />
        </Card>
      </div>
    </Shell>
  );
}

function NameChangeSection({ profile, onRequested }: { profile: VendorProfile; onRequested: () => void }) {
  const [open, setOpen] = useState(false);
  const [requestedName, setRequestedName] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const pending = profile.pending_name_change;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await apiPost("/api/v1/vendor/profile/name-change", { requested_name: requestedName, reason });
      setRequestedName("");
      setReason("");
      setOpen(false);
      onRequested();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal mengirim permintaan.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-dc-black/50">Nama Vendor</p>
      <p className="font-heading mt-1 text-xl font-bold text-dc-navy">{profile.business_name}</p>

      {pending && pending.status === "pending" ? (
        <div className="mt-3 rounded-xl bg-dc-gold/10 p-3 text-sm text-dc-navy">
          Permintaan ganti nama menjadi <span className="font-semibold">&ldquo;{pending.requested_name}&rdquo;</span> sedang
          ditinjau Admin. Alasan: {pending.reason}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mt-3 text-sm font-semibold text-dc-gold hover:text-dc-navy"
        >
          {open ? "Batal" : "Ajukan Ganti Nama"}
        </button>
      )}

      <AnimatePresence initial={false}>
        {open && !pending && (
          <motion.form
            onSubmit={handleSubmit}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="mt-3 flex flex-col gap-3 overflow-hidden"
          >
            <TextField label="Nama vendor baru" value={requestedName} onChange={setRequestedName} />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="name-change-reason" className="text-sm font-medium text-dc-navy">
                Alasan perubahan
              </label>
              <textarea
                id="name-change-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                required
                className="w-full rounded-xl border border-dc-black/15 bg-dc-white px-4 py-2.5 outline-none focus:border-dc-gold focus:ring-2 focus:ring-dc-gold/30"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" loading={saving} className="w-auto">
              Kirim untuk Ditinjau
            </Button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0">
      <path d="M5 12l5 5L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-dc-navy/40">
      <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
