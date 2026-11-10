"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

import { CheckIcon, friendlyError, NextStep, PhotoIcon, PlusIcon, TrashIcon } from "@/components/etalase/shared";
import { VENDOR_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton, SkeletonGroup } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { EtalaseTabs } from "@/components/vendor/EtalaseTabs";
import { WithUser } from "@/components/WithUser";
import { apiDelete, apiGet, apiPostForm, ApiError, type CurrentUser, type VendorProfile } from "@/lib/api";
import { EASE, fadeUp, motionSafe, staggerList, useReducedMotion } from "@/lib/motion";

type Photo = NonNullable<VendorProfile["portfolio"]>[number];

/** Mirrors server/internal/imageupload: JPEG/PNG/WEBP, 5 MB. Checked here first
 * so the vendor hears about a wrong file before waiting for an upload. */
const ACCEPT = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

type QueueItem = {
  key: string;
  file: File;
  preview: string;
  caption: string;
  state: "waiting" | "uploading" | "done" | "failed";
  error?: string;
};

export default function VendorPortfolioPage() {
  return (
    <WithUser allowedRoles={["vendor"]} loginPath="/login">
      {(user) => <VendorPortfolioContent user={user} />}
    </WithUser>
  );
}

function VendorPortfolioContent({ user }: { user: CurrentUser }) {
  const toast = useToast();
  const reduced = useReducedMotion();
  // undefined = loading, null = no profile yet.
  const [profile, setProfile] = useState<VendorProfile | null | undefined>(undefined);
  const [loadError, setLoadError] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [rejected, setRejected] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [toDelete, setToDelete] = useState<Photo | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queueRef = useRef<QueueItem[]>([]);
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  const loadProfile = useCallback(() => {
    setLoadError(false);
    return apiGet<VendorProfile>("/api/v1/vendor/profile/me")
      .then(setProfile)
      .catch((e) => {
        if (e instanceof ApiError && e.status === 404) setProfile(null);
        else setLoadError(true);
      });
  }, []);

  useEffect(() => {
    queueMicrotask(loadProfile);
  }, [loadProfile]);

  // Free the preview blobs when leaving the page.
  useEffect(() => () => queueRef.current.forEach((q) => URL.revokeObjectURL(q.preview)), []);

  function addFiles(files: FileList | File[]) {
    const ok: QueueItem[] = [];
    const bad: string[] = [];
    for (const file of Array.from(files)) {
      if (!ACCEPT.includes(file.type)) bad.push(`${file.name}: hanya foto JPG, PNG, atau WEBP yang bisa diunggah.`);
      else if (file.size > MAX_BYTES) bad.push(`${file.name}: ukurannya lebih dari 5 MB. Perkecil dulu, lalu pilih lagi.`);
      else ok.push({ key: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`, file, preview: URL.createObjectURL(file), caption: "", state: "waiting" });
    }
    setRejected(bad);
    if (ok.length) setQueue((q) => [...q.filter((i) => i.state !== "done"), ...ok]);
  }

  function updateItem(key: string, patch: Partial<QueueItem>) {
    setQueue((q) => q.map((i) => (i.key === key ? { ...i, ...patch } : i)));
  }

  function removeItem(key: string) {
    setQueue((q) => {
      const item = q.find((i) => i.key === key);
      if (item) URL.revokeObjectURL(item.preview);
      return q.filter((i) => i.key !== key);
    });
  }

  async function uploadAll() {
    if (!profile) return;
    const todo = queue.filter((i) => i.state === "waiting" || i.state === "failed");
    if (!todo.length) return;
    setUploading(true);
    let okCount = 0;
    // One at a time: honest per-photo progress, and a slow connection is not flooded.
    for (const item of todo) {
      updateItem(item.key, { state: "uploading", error: undefined });
      try {
        const form = new FormData();
        form.append("file", item.file);
        form.append("alt_text", item.caption.trim() || `Contoh portofolio ${profile.business_name}`);
        const created = await apiPostForm<Photo>("/api/v1/vendor/portfolio", form);
        okCount++;
        updateItem(item.key, { state: "done" });
        setProfile((p) => (p ? { ...p, portfolio: [...(p.portfolio ?? []), created] } : p));
      } catch (err) {
        updateItem(item.key, { state: "failed", error: friendlyError(err, "Foto ini gagal diunggah. Coba lagi.") });
      }
    }
    setUploading(false);
    if (okCount) toast.show(`${okCount} foto masuk ke portofolio`, "success");
    // Sync order and URLs with the server once the batch is done.
    await loadProfile();
    // Finished rows leave after a beat so the vendor sees them tick.
    setTimeout(() => {
      setQueue((q) => {
        q.filter((i) => i.state === "done").forEach((i) => URL.revokeObjectURL(i.preview));
        return q.filter((i) => i.state !== "done");
      });
    }, 1600);
  }

  async function handleDelete() {
    if (!toDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await apiDelete(`/api/v1/vendor/portfolio/${toDelete.id}`);
      setProfile((p) => (p ? { ...p, portfolio: (p.portfolio ?? []).filter((x) => x.id !== toDelete.id) } : p));
      setToDelete(null);
      toast.show("Foto dihapus", "success");
    } catch (err) {
      setDeleteError(friendlyError(err, "Foto belum terhapus. Coba lagi."));
    } finally {
      setDeleting(false);
    }
  }

  const photos = profile?.portfolio ?? [];
  const pending = queue.filter((i) => i.state === "waiting" || i.state === "failed").length;
  const finished = queue.filter((i) => i.state === "done").length;
  const inBatch = queue.length;

  return (
    <Shell user={user} navItems={VENDOR_NAV} loginPath="/login" eyebrow="Vendor">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <EtalaseTabs publicId={profile?.status === "approved" ? user.id : undefined} status={profile?.status ?? null} />

        {loadError ? (
          <ErrorState title="Portofolio belum bisa dimuat" onRetry={loadProfile} />
        ) : profile === undefined ? (
          <PortfolioSkeleton />
        ) : profile === null ? (
          <EmptyState
            title="Lengkapi profil dulu"
            body="Portofolio tampil di etalase usahamu, jadi isi nama usaha, kategori, dan kota di halaman Profil lebih dulu."
            actionHref="/vendor/profile"
            actionLabel="Ke halaman Profil"
          />
        ) : (
          <>
            <PageHeader
              title={
                <>
                  Hasil kerja yang <span className="dc-em">bercerita</span>
                </>
              }
              subtitle="Calon pengantin memutuskan dari foto. Pilih yang paling mewakili gayamu, terang, dan tajam."
              action={<Badge tone="gold">{photos.length} foto</Badge>}
            />

            {/* Drop zone doubles as the empty state: with no photos it is the whole invitation to start. */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
              }}
              className={`relative flex flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 text-center transition-colors ${
                photos.length === 0 ? "py-14 sm:py-20" : "py-8"
              } ${dragOver ? "border-dc-gold bg-dc-gold/10" : "border-dc-line-strong bg-dc-white"}`}
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-dc-cream text-dc-clay">
                <PhotoIcon />
              </span>
              <p className="font-heading text-[1.75rem] leading-tight text-dc-ink">
                {photos.length === 0 ? "Unggah foto pertamamu" : "Tambah foto baru"}
              </p>
              <p className="max-w-md text-sm leading-relaxed text-dc-text-2">
                Seret foto ke sini, atau pilih dari galeri. Bisa beberapa sekaligus. JPG, PNG, atau WEBP, maksimal 5 MB per foto.
              </p>
              <Button variant={pending > 0 ? "ghost" : "primary"} onClick={() => fileInputRef.current?.click()} disabled={uploading} className="mt-2">
                <PlusIcon />
                Pilih foto
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={ACCEPT.join(",")}
                onChange={(e) => {
                  if (e.target.files?.length) addFiles(e.target.files);
                  e.target.value = "";
                }}
                className="sr-only"
                tabIndex={-1}
                aria-hidden
              />
            </div>

            {rejected.length > 0 && (
              <div role="alert" className="mt-4 rounded-lg border border-dc-danger/25 bg-dc-danger/[0.05] px-4 py-3 text-sm text-dc-danger">
                <p className="font-semibold">Beberapa file tidak bisa dipakai</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-5">
                  {rejected.map((r) => (
                    <li key={r} className="break-words">
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <AnimatePresence initial={false}>
              {queue.length > 0 && (
                <motion.section
                  aria-labelledby="antrean-title"
                  initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35, ease: EASE }}
                  className="mt-6 rounded-xl border border-dc-line bg-dc-white p-5 shadow-soft sm:p-6"
                >
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <h2 id="antrean-title" className="font-heading text-[1.65rem] leading-tight text-dc-ink">
                        Siap diunggah
                      </h2>
                      <p className="mt-0.5 text-sm text-dc-text-2">Tulis keterangan singkat. Keterangan tidak bisa diubah setelah foto diunggah.</p>
                    </div>
                    {uploading || finished > 0 ? (
                      <p aria-live="polite" className="text-sm font-semibold tabular-nums text-dc-ink">
                        {finished} dari {inBatch} foto terunggah
                      </p>
                    ) : null}
                  </div>
                  {(uploading || finished > 0) && (
                    <div
                      role="progressbar"
                      aria-label="Kemajuan unggahan"
                      aria-valuemin={0}
                      aria-valuemax={inBatch}
                      aria-valuenow={finished}
                      className="mt-3 h-1.5 overflow-hidden rounded-full bg-dc-cream"
                    >
                      <motion.div className="h-full bg-dc-gold" initial={false} animate={{ width: `${(finished / Math.max(inBatch, 1)) * 100}%` }} transition={{ duration: reduced ? 0 : 0.4, ease: EASE }} />
                    </div>
                  )}

                  <ul className="mt-5 flex flex-col gap-4">
                    {queue.map((item) => (
                      <li key={item.key} className="flex flex-col gap-3 border-t border-dc-line pt-4 first:border-t-0 first:pt-0 sm:flex-row sm:items-start">
                        <div className="relative aspect-4/3 w-full shrink-0 overflow-hidden rounded-lg bg-dc-cream sm:w-36">
                          {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview, next/image cannot load it */}
                          <img src={item.preview} alt="" className="h-full w-full object-cover" />
                          {item.state === "uploading" && (
                            <span className="absolute inset-0 flex items-center justify-center bg-dc-ink/40">
                              <span aria-hidden className="h-7 w-7 animate-spin rounded-full border-2 border-white border-t-transparent motion-reduce:animate-none" />
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <Input
                            label={<span className="break-all">Keterangan untuk {item.file.name}</span>}
                            value={item.caption}
                            onChange={(e) => updateItem(item.key, { caption: e.target.value })}
                            placeholder="Contoh: Rias paes ageng di Pendopo Sriwedari"
                            disabled={item.state === "uploading" || item.state === "done"}
                            optional
                          />
                          <p className="mt-2 flex min-h-6 items-center gap-1.5 text-sm" aria-live="polite">
                            {item.state === "waiting" && <span className="text-dc-text-2">Menunggu diunggah</span>}
                            {item.state === "uploading" && <span className="font-semibold text-dc-ink">Mengunggah…</span>}
                            {item.state === "done" && (
                              <span className="flex items-center gap-1.5 font-semibold text-dc-success">
                                <CheckIcon /> Terunggah
                              </span>
                            )}
                            {item.state === "failed" && <span className="text-dc-danger">{item.error}</span>}
                          </p>
                        </div>
                        {(item.state === "waiting" || item.state === "failed") && !uploading && (
                          <Button variant="ghost" size="sm" onClick={() => removeItem(item.key)} aria-label={`Batalkan ${item.file.name}`} className="self-start">
                            Batalkan
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>

                  {pending > 0 && (
                    <div className="mt-5 flex flex-col gap-2 border-t border-dc-line pt-5 sm:flex-row sm:justify-end">
                      <Button onClick={uploadAll} loading={uploading} size="md">
                        {queue.some((i) => i.state === "failed") && !queue.some((i) => i.state === "waiting") ? "Coba unggah lagi" : `Unggah ${pending} foto`}
                      </Button>
                    </div>
                  )}
                </motion.section>
              )}
            </AnimatePresence>

            {photos.length > 0 && (
              <section aria-labelledby="galeri-title" className="mt-12">
                <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
                  <h2 id="galeri-title" className="font-heading text-3xl text-dc-ink">
                    Galeri etalase
                  </h2>
                  <p className="max-w-md text-sm leading-relaxed text-dc-text-2">
                    Foto pertama jadi sampul di kartu direktori. Untuk mengganti sampul, hapus foto pertama, foto berikutnya otomatis naik.
                  </p>
                </div>
                <motion.ul
                  className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4"
                  // Existing photos show at once (they are the content); only new uploads fade in where they join.
                  initial={false}
                  animate="visible"
                  variants={motionSafe(reduced, staggerList)}
                >
                  <AnimatePresence initial={false}>
                    {photos.map((p, i) => (
                      <motion.li
                        key={p.id}
                        layout={!reduced}
                        variants={motionSafe(reduced, fadeUp)}
                        exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.2 } }}
                        className={`flex flex-col ${i === 0 ? "col-span-2 row-span-2" : ""}`}
                      >
                        <figure className="contents">
                          <div className={`group relative overflow-hidden rounded-xl bg-dc-cream ${i === 0 ? "aspect-4/3 sm:aspect-auto sm:min-h-80 sm:flex-1" : "aspect-4/5"}`}>
                            <Image
                              src={p.url}
                              alt={p.alt_text}
                              fill
                              sizes={i === 0 ? "(min-width: 1024px) 560px, (min-width: 640px) 66vw, 100vw" : "(min-width: 1024px) 280px, (min-width: 640px) 33vw, 50vw"}
                              className="object-cover transition-transform duration-700 ease-dc group-hover:scale-[1.03] motion-reduce:transition-none"
                              unoptimized
                            />
                            {i === 0 && (
                              <span className="absolute left-3 top-3 rounded-full bg-dc-ink/85 px-3 py-1 text-xs font-semibold text-dc-on-dark">Sampul</span>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteError(null);
                                setToDelete(p);
                              }}
                              aria-label={`Hapus foto: ${p.alt_text || "tanpa keterangan"}`}
                              className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full bg-dc-ink/80 text-white transition-colors hover:bg-dc-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold"
                            >
                              <TrashIcon />
                            </button>
                          </div>
                          {/* Caption sits under the photo: readable on any image, and the photo stays uncovered. */}
                          <figcaption aria-hidden className={`mt-2 line-clamp-2 text-sm leading-snug ${p.alt_text ? "text-dc-text-2" : "italic text-dc-text-3"}`}>
                            {p.alt_text || "Tanpa keterangan"}
                          </figcaption>
                        </figure>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </motion.ul>
              </section>
            )}

            {photos.length > 0 && (
              <NextStep href="/vendor/paket" label="Atur paket harga" note="Foto sudah ada. Sekarang tulis paket supaya calon pengantin tahu pilihan dan harganya." />
            )}
          </>
        )}
      </div>

      <Modal open={toDelete !== null} onClose={() => setToDelete(null)} title="Hapus foto ini?">
        {toDelete && (
          <div className="flex gap-4">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-dc-cream">
              <Image src={toDelete.url} alt="" fill sizes="80px" className="object-cover" unoptimized />
            </div>
            <p className="text-sm leading-relaxed text-dc-text-2">
              Foto ini hilang dari etalase publikmu dan tidak bisa dikembalikan. {photos[0]?.id === toDelete.id && photos.length > 1 ? "Foto berikutnya akan jadi sampul." : ""}
            </p>
          </div>
        )}
        {deleteError && (
          <p role="alert" className="mt-3 text-sm text-dc-danger">
            {deleteError}
          </p>
        )}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => setToDelete(null)}>
            Batal
          </Button>
          <Button variant="danger" onClick={handleDelete} loading={deleting}>
            Ya, hapus foto
          </Button>
        </div>
      </Modal>
    </Shell>
  );
}

function PortfolioSkeleton() {
  return (
    <SkeletonGroup label="Memuat portofolio">
      <Skeleton className="h-12 w-2/3 max-w-md" />
      <Skeleton className="mt-8 h-48 rounded-xl" />
      <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        <Skeleton className="col-span-2 row-span-2 aspect-4/3 rounded-xl sm:aspect-auto sm:min-h-88" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="aspect-4/5 rounded-xl" />
        ))}
      </div>
    </SkeletonGroup>
  );
}
