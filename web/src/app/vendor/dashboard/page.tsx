"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { WithUser } from "@/components/WithUser";
import {
  apiGet,
  apiPost,
  apiPostForm,
  apiPut,
  ApiError,
  VENDOR_CATEGORIES,
  type VendorProfile,
} from "@/lib/api";

const STATUS_LABEL: Record<VendorProfile["status"], { text: string; className: string }> = {
  pending: { text: "Menunggu review Admin", className: "bg-dc-gold/20 text-dc-navy" },
  approved: { text: "Disetujui — tampil di direktori", className: "bg-green-100 text-green-800" },
  rejected: { text: "Ditolak", className: "bg-red-100 text-red-700" },
};

export default function VendorDashboardPage() {
  return (
    <WithUser allowedRoles={["vendor"]} loginPath="/vendor/login">
      {() => <VendorDashboardContent />}
    </WithUser>
  );
}

function VendorDashboardContent() {
  const router = useRouter();
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState(VENDOR_CATEGORIES[0].value);
  const [city, setCity] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  function applyProfile(p: VendorProfile) {
    setProfile(p);
    setBusinessName(p.business_name);
    setCategory(p.category);
    setCity(p.city);
    setPriceMin(String(p.price_min));
    setPriceMax(String(p.price_max));
    setDescription(p.description);
  }

  useEffect(() => {
    apiGet<VendorProfile>("/api/v1/vendor/profile/me")
      .then(applyProfile)
      .catch(() => {
        /* belum punya profil — biarkan form kosong */
      });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const updated = await apiPut<VendorProfile>("/api/v1/vendor/profile", {
        business_name: businessName,
        category,
        city,
        price_min: Number(priceMin) || 0,
        price_max: Number(priceMax) || 0,
        description,
      });
      applyProfile(updated);
      setSuccess("Profil disimpan — sedang direview Admin, biasanya 1-3 hari kerja.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menyimpan profil.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("alt_text", `Contoh portofolio ${businessName || "vendor"}`);
      await apiPostForm("/api/v1/vendor/portfolio", form);
      const updated = await apiGet<VendorProfile>("/api/v1/vendor/profile/me");
      applyProfile(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal mengunggah gambar.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleLogout() {
    await apiPost("/api/v1/auth/logout", {});
    router.replace("/vendor/login");
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-heading text-2xl font-extrabold text-dc-navy">Profil Vendor</h1>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/vendor/bookings" className="font-semibold text-dc-navy hover:text-dc-gold">
            Booking
          </Link>
          <Link href="/vendor/messages" className="font-semibold text-dc-navy hover:text-dc-gold">
            Pesan
          </Link>
          <button onClick={handleLogout} className="text-dc-black/60 hover:text-dc-navy">
            Keluar
          </button>
        </div>
      </div>

      {profile && (
        <span className={`mb-6 inline-block rounded-full px-3 py-1 text-xs font-semibold ${STATUS_LABEL[profile.status].className}`}>
          {STATUS_LABEL[profile.status].text}
        </span>
      )}
      {profile?.status === "rejected" && profile.rejection_reason && (
        <p className="mb-4 text-sm text-red-600">Alasan: {profile.rejection_reason}</p>
      )}

      <form onSubmit={handleSave} className="flex flex-col gap-4">
        <TextField label="Nama usaha" value={businessName} onChange={setBusinessName} />

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
          <TextField label="Harga minimum (Rp)" type="number" value={priceMin} onChange={setPriceMin} />
          <TextField label="Harga maksimum (Rp)" type="number" value={priceMax} onChange={setPriceMax} />
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
        {success && <p className="text-sm text-green-700">{success}</p>}
        <Button type="submit" loading={saving}>
          Simpan Profil
        </Button>
      </form>

      {profile && (
        <div className="mt-8">
          <h2 className="font-heading mb-3 text-lg font-bold text-dc-navy">Portofolio</h2>
          <div className="grid grid-cols-3 gap-3">
            {profile.portfolio?.map((p) => (
              <div key={p.id} className="relative aspect-square overflow-hidden rounded-xl bg-dc-offwhite">
                <Image src={p.url} alt={p.alt_text} fill className="object-cover" unoptimized />
              </div>
            ))}
          </div>
          <label className="mt-3 inline-block cursor-pointer rounded-xl border border-dashed border-dc-black/20 px-4 py-2.5 text-sm font-medium text-dc-navy hover:bg-dc-offwhite">
            {uploading ? "Mengunggah…" : "+ Tambah Foto Portofolio (JPEG/PNG/WEBP, maks 5MB)"}
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleUpload} className="hidden" disabled={uploading} />
          </label>
        </div>
      )}
    </main>
  );
}
