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
import { PageHeader } from "@/components/ui/PageHeader";
import { EtalaseTabs } from "@/components/vendor/EtalaseTabs";
import { WithUser } from "@/components/WithUser";
import {
  apiGet,
  apiPost,
  apiPut,
  ApiError,
  VENDOR_CATEGORIES,
  type CurrentUser,
  type VendorProfile,
} from "@/lib/api";

const STATUS_LABEL: Record<
  VendorProfile["status"],
  { text: string; tone: "gold" | "success" | "danger" }
> = {
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
      setError(
        err instanceof ApiError ? err.message : "Gagal menyimpan profil.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Shell
      user={user}
      navItems={VENDOR_NAV}
      loginPath="/login"
      eyebrow="Vendor"
    >
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <EtalaseTabs publicId={profile?.status === "approved" ? user.id : undefined} />
        <PageHeader
          title={profile?.business_name || "Lengkapi profil vendor"}
          subtitle={
            profile
              ? "Perbarui detail usahamu supaya makin menarik di direktori."
              : "Isi profil usahamu supaya bisa mulai menerima booking dari calon pengantin."
          }
          action={
            profile ? (
              <Badge tone={STATUS_LABEL[profile.status].tone}>
                {STATUS_LABEL[profile.status].text}
              </Badge>
            ) : undefined
          }
        />

        {profile?.status === "rejected" && profile.rejection_reason && (
          <p
            role="alert"
            className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            Alasan: {profile.rejection_reason}
          </p>
        )}

        {profile && (
          <Card className="mb-6 p-5">
            <NameChangeSection profile={profile} onRequested={loadProfile} />
          </Card>
        )}

        <Card className="p-5">
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="vendor-category"
                className="text-sm font-medium text-dc-ink"
              >
                Kategori
              </label>
              <select
                id="vendor-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="min-h-11 w-full rounded-md border border-dc-ink/20 bg-dc-white px-4 py-2.5 text-dc-black transition focus:border-dc-ink focus:outline-2 focus:outline-offset-2 focus:outline-dc-gold"
              >
                {VENDOR_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <TextField label="Kota" value={city} onChange={setCity} />

            <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="price-min"
                  className="text-sm font-medium text-dc-ink"
                >
                  Harga minimum (Rp)
                </label>
                <input
                  id="price-min"
                  type="text"
                  inputMode="numeric"
                  value={
                    priceMin ? Number(priceMin).toLocaleString("id-ID") : ""
                  }
                  onChange={(e) =>
                    setPriceMin(e.target.value.replace(/\D/g, ""))
                  }
                  className="min-h-11 w-full rounded-md border border-dc-ink/20 bg-dc-white px-4 py-2.5 text-dc-black transition focus:border-dc-ink focus:outline-2 focus:outline-offset-2 focus:outline-dc-gold"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="price-max"
                  className="text-sm font-medium text-dc-ink"
                >
                  Harga maksimum (Rp)
                </label>
                <input
                  id="price-max"
                  type="text"
                  inputMode="numeric"
                  value={
                    priceMax ? Number(priceMax).toLocaleString("id-ID") : ""
                  }
                  onChange={(e) =>
                    setPriceMax(e.target.value.replace(/\D/g, ""))
                  }
                  className="min-h-11 w-full rounded-md border border-dc-ink/20 bg-dc-white px-4 py-2.5 text-dc-black transition focus:border-dc-ink focus:outline-2 focus:outline-offset-2 focus:outline-dc-gold"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="vendor-description"
                className="text-sm font-medium text-dc-ink"
              >
                Deskripsi
              </label>
              <textarea
                id="vendor-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="min-h-11 w-full rounded-md border border-dc-ink/20 bg-dc-white px-4 py-2.5 text-dc-black transition focus:border-dc-ink focus:outline-2 focus:outline-offset-2 focus:outline-dc-gold"
              />
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
              >
                {error}
              </p>
            )}
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
            className="mt-6 flex min-h-11 items-center justify-between rounded-lg border border-dc-ink/10 bg-dc-white px-5 py-4 transition-colors hover:border-dc-ink/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold"
          >
            <div>
              <p className="font-heading text-xl text-dc-ink">Portofolio</p>
              <p className="text-sm text-dc-black/70">
                {profile.portfolio?.length ?? 0} foto tersimpan
              </p>
            </div>
            <ArrowIcon />
          </Link>
        )}

        {profile && (
          <Card className="mt-6 p-5">
            <h2 className="font-heading text-2xl text-dc-ink">Ulasan</h2>
            <p className="mt-1 text-sm text-dc-black/70">
              {profile.review_count > 0
                ? `Rating rata-rata ★ ${profile.average_rating.toFixed(1)} dari ${profile.review_count} ulasan`
                : "Belum ada ulasan, akan tampil setelah booking pertamamu selesai dan direview client."}
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

function NameChangeSection({
  profile,
  onRequested,
}: {
  profile: VendorProfile;
  onRequested: () => void;
}) {
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
      await apiPost("/api/v1/vendor/profile/name-change", {
        requested_name: requestedName,
        reason,
      });
      setRequestedName("");
      setReason("");
      setOpen(false);
      onRequested();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Gagal mengirim permintaan.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-dc-black/60">
        Nama vendor
      </p>
      <p className="font-heading mt-1 text-2xl text-dc-ink">
        {profile.business_name}
      </p>

      {pending && pending.status === "pending" ? (
        <div className="mt-3 rounded-md bg-dc-gold/10 p-3 text-sm text-dc-ink">
          Permintaan ganti nama menjadi{" "}
          <span className="font-semibold">
            &ldquo;{pending.requested_name}&rdquo;
          </span>{" "}
          sedang ditinjau Admin. Alasan: {pending.reason}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-dc-clay underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold"
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
            <TextField
              label="Nama vendor baru"
              value={requestedName}
              onChange={setRequestedName}
            />
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="name-change-reason"
                className="text-sm font-medium text-dc-ink"
              >
                Alasan perubahan
              </label>
              <textarea
                id="name-change-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                required
                className="min-h-11 w-full rounded-md border border-dc-ink/20 bg-dc-white px-4 py-2.5 text-dc-black transition focus:border-dc-ink focus:outline-2 focus:outline-offset-2 focus:outline-dc-gold"
              />
            </div>
            {error && (
              <p
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
              >
                {error}
              </p>
            )}
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
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      className="shrink-0"
    >
      <path d="M5 12l5 5L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="shrink-0 text-dc-ink/40"
    >
      <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
