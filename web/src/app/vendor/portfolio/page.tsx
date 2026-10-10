"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

import { VENDOR_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { WithUser } from "@/components/WithUser";
import {
  apiDelete,
  apiGet,
  apiPostForm,
  ApiError,
  type CurrentUser,
  type VendorProfile,
} from "@/lib/api";

export default function VendorPortfolioPage() {
  return (
    <WithUser allowedRoles={["vendor"]} loginPath="/login">
      {(user) => <VendorPortfolioContent user={user} />}
    </WithUser>
  );
}

function VendorPortfolioContent({ user }: { user: CurrentUser }) {
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [deletingID, setDeletingID] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function loadProfile() {
    return apiGet<VendorProfile>("/api/v1/vendor/profile/me")
      .then(setProfile)
      .catch(() => {
        /* belum punya profil */
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadProfile();
  }, []);

  async function uploadFile(file: File) {
    if (!profile) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("alt_text", `Contoh portofolio ${profile.business_name}`);
      await apiPostForm("/api/v1/vendor/portfolio", form);
      await loadProfile();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Gagal mengunggah gambar.",
      );
    } finally {
      setUploading(false);
    }
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Hapus foto ini dari portofolio?")) return;
    setDeletingID(id);
    setError(null);
    try {
      await apiDelete(`/api/v1/vendor/portfolio/${id}`);
      await loadProfile();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menghapus foto.");
    } finally {
      setDeletingID(null);
    }
  }

  const count = profile?.portfolio?.length ?? 0;

  return (
    <Shell
      user={user}
      navItems={VENDOR_NAV}
      loginPath="/login"
      eyebrow="Vendor"
    >
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <PageHeader
          title="Portofolio"
          subtitle="Foto yang tampil di halaman profilmu untuk calon pengantin."
          action={
            !loading && profile ? (
              <Badge tone="gold">{count} foto</Badge>
            ) : undefined
          }
        />
        {loading ? (
          <PortfolioSkeleton />
        ) : !profile ? (
          <EmptyState
            title="Lengkapi profil dulu"
            body="Isi Nama Vendor, kategori, dan detail usaha di halaman Profil sebelum menambah portofolio."
            actionHref="/vendor/profile"
            actionLabel="Ke Halaman Profil"
          />
        ) : (
          <>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              role="button"
              tabIndex={0}
              aria-label="Unggah foto portofolio"
              className={`flex min-h-11 cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed px-6 py-8 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold ${
                dragOver
                  ? "border-dc-clay bg-dc-clay/5"
                  : "border-dc-ink/25 bg-dc-white/60 hover:border-dc-ink/50"
              }`}
            >
              <UploadIcon />
              <p className="font-heading text-2xl text-dc-ink">
                {uploading
                  ? "Mengunggah…"
                  : "Seret foto ke sini, atau klik untuk pilih"}
              </p>
              <p className="text-sm text-dc-black/70">
                JPEG, PNG, atau WEBP, maksimal 5MB per foto.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileInput}
                className="hidden"
                disabled={uploading}
              />
            </div>

            {error && (
              <p
                role="alert"
                className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
              >
                {error}
              </p>
            )}

            {count === 0 ? (
              <div className="mt-6">
                <EmptyState
                  title="Belum ada foto portofolio"
                  body="Unggah contoh hasil kerjamu supaya calon pengantin lebih yakin."
                />
              </div>
            ) : (
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                <AnimatePresence initial={false}>
                  {profile.portfolio?.map((p) => (
                    <motion.div
                      key={p.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="relative aspect-[4/5] overflow-hidden rounded-lg border border-dc-ink/10 bg-dc-cream"
                    >
                      <Image
                        src={p.url}
                        alt={p.alt_text}
                        fill
                        sizes="(min-width: 1024px) 256px, (min-width: 640px) 33vw, 50vw"
                        className="object-cover"
                        unoptimized
                      />
                      <button
                        type="button"
                        onClick={() => handleDelete(p.id)}
                        disabled={deletingID === p.id}
                        aria-label="Hapus foto"
                        className="absolute right-1 top-1 flex h-11 w-11 items-center justify-center rounded-md bg-dc-ink/75 text-dc-white transition-colors hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold disabled:opacity-70"
                      >
                        {deletingID === p.id ? <Spinner /> : <TrashIcon />}
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </>
        )}
      </div>
    </Shell>
  );
}

function PortfolioSkeleton() {
  return (
    <div
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4"
      aria-busy="true"
      aria-label="Memuat portofolio"
    >
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="aspect-[4/5] animate-pulse rounded-lg bg-dc-ink/5"
        />
      ))}
    </div>
  );
}

function UploadIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="text-dc-ink/40"
    >
      <path
        d="M12 16V4M6 10l6-6 6 6M4 20h16"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path
        d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Spinner() {
  return (
    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
  );
}
