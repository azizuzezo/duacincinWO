"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { WithUser } from "@/components/WithUser";
import { apiDelete, apiGet, apiPostForm, ApiError, type InspirationItem } from "@/lib/api";

export default function AdminInspirasiPage() {
  return (
    <WithUser allowedRoles={["admin"]} loginPath="/internal/login">
      {() => <AdminInspirasiContent />}
    </WithUser>
  );
}

function AdminInspirasiContent() {
  const [items, setItems] = useState<InspirationItem[]>([]);
  const [category, setCategory] = useState("");
  const [caption, setCaption] = useState("");
  const [altText, setAltText] = useState("");
  const [sourceCredit, setSourceCredit] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  function loadItems() {
    apiGet<InspirationItem[]>("/api/v1/inspiration")
      .then((data) => setItems(data ?? []))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Gagal memuat galeri."));
  }

  useEffect(() => {
    loadItems();
  }, []);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    const fileInput = document.getElementById("inspirasi-file") as HTMLInputElement;
    const file = fileInput?.files?.[0];
    if (!file) {
      setError("Pilih file gambar dulu.");
      return;
    }
    if (!category.trim()) {
      setError("Kategori wajib diisi.");
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("category", category);
      form.append("caption", caption);
      form.append("alt_text", altText);
      form.append("source_credit", sourceCredit);
      await apiPostForm("/api/v1/admin/inspiration", form);
      setCategory("");
      setCaption("");
      setAltText("");
      setSourceCredit("");
      fileInput.value = "";
      loadItems();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal mengunggah gambar.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Hapus item ini dari galeri Inspirasi?")) return;
    try {
      await apiDelete(`/api/v1/admin/inspiration/${id}`);
      loadItems();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menghapus item.");
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-heading text-2xl font-extrabold text-dc-navy">Kelola Galeri Inspirasi</h1>
        <Link href="/internal/admin/vendors" className="text-sm font-semibold text-dc-navy hover:text-dc-gold">
          ← Vendor Menunggu Review
        </Link>
      </div>

      <form onSubmit={handleUpload} className="flex flex-col gap-4 rounded-2xl border border-dc-black/10 bg-dc-white p-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="inspirasi-file" className="text-sm font-medium text-dc-navy">
            Gambar (JPEG/PNG/WEBP, maks 5MB)
          </label>
          <input id="inspirasi-file" type="file" accept="image/jpeg,image/png,image/webp" />
        </div>
        <TextField label="Kategori" value={category} onChange={setCategory} placeholder="mis. Dekorasi Outdoor" />
        <TextField label="Caption" value={caption} onChange={setCaption} required={false} />
        <TextField label="Alt text (deskripsi gambar)" value={altText} onChange={setAltText} required={false} />
        <TextField label="Sumber/kredit" value={sourceCredit} onChange={setSourceCredit} required={false} placeholder="mis. Vendor: Nama Vendor" />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" loading={uploading}>
          Unggah
        </Button>
      </form>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {items.map((item) => (
          <div key={item.id} className="overflow-hidden rounded-xl border border-dc-black/10 bg-dc-white">
            <div className="relative aspect-square w-full">
              <Image src={item.url} alt={item.alt_text || item.caption} fill className="object-cover" unoptimized />
            </div>
            <div className="p-2">
              <p className="truncate text-xs font-semibold text-dc-navy">{item.category}</p>
              <button onClick={() => handleDelete(item.id)} className="mt-1 text-xs text-red-600 hover:underline">
                Hapus
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
