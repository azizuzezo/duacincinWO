"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { CheckIcon, friendlyError, PhotoIcon, PlusIcon, TrashIcon } from "@/components/etalase/shared";
import { ClientArt } from "@/components/home/ClientArt";
import { wdButton } from "@/components/home/ui";
import { VENDOR_NAV } from "@/components/shell/navConfig";
import { VendorShell } from "@/components/shell/VendorShell";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/Field";
import { Skeleton, SkeletonGroup } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { EtalaseTabs } from "@/components/vendor/EtalaseTabs";
import { WithUser } from "@/components/WithUser";
import { apiDelete, apiGet, apiPostForm, ApiError, type CurrentUser, type VendorProfile } from "@/lib/api";
import { EASE, useReducedMotion } from "@/lib/motion";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wd-ink";

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
  const [selected, setSelected] = useState<Photo | null>(null);
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

  async function handleDelete(photo: Photo) {
    setDeleting(true);
    setDeleteError(null);
    try {
      await apiDelete(`/api/v1/vendor/portfolio/${photo.id}`);
      setProfile((p) => (p ? { ...p, portfolio: (p.portfolio ?? []).filter((x) => x.id !== photo.id) } : p));
      setSelected(null);
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
    <VendorShell user={user} navItems={VENDOR_NAV} tone="wd" loginPath="/login" eyebrow="Vendor">
      <div className="wd-container pb-16 pt-8 sm:pt-10">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div className="min-w-0">
            <p className="wd-kicker">Etalase</p>
            <h1 className="wd-display mt-2 text-[clamp(2.1rem,4.4vw,3.4rem)] leading-[1.05]">
              Hasil kerja yang <em>bercerita</em>
            </h1>
          </div>
          {profile && photos.length > 0 && <p className="text-sm font-semibold tabular-nums text-wd-muted">{photos.length} foto</p>}
        </div>

        <EtalaseTabs publicId={profile?.status === "approved" ? user.id : undefined} status={profile?.status ?? null} />

        <div className="mt-8">
          {loadError ? (
            <ErrorState title="Portofolio belum bisa dimuat" onRetry={loadProfile} />
          ) : profile === undefined ? (
            <PortfolioSkeleton />
          ) : profile === null ? (
            <div className="flex flex-col items-start gap-4 py-4 sm:flex-row sm:items-center">
              <span aria-hidden className="h-20 w-20 shrink-0 rounded-3xl bg-wd-accent-wash p-3.5">
                <ClientArt kind="shop" />
              </span>
              <div>
                <p className="font-semibold text-wd-ink">Lengkapi profil dulu</p>
                <p className="mt-0.5 max-w-md text-sm leading-relaxed text-wd-text">Portofolio tampil di etalase usahamu. Isi nama usaha, kategori, dan kota di halaman Profil lebih dulu.</p>
                <Link href="/vendor/profile" className={`${wdButton({ variant: "gold", size: "sm" })} mt-3 ${FOCUS}`}>
                  Ke halaman Profil
                </Link>
              </div>
            </div>
          ) : (
            <>
              <p className="max-w-2xl text-[0.95rem] leading-relaxed text-wd-text">
                Calon pengantin memutuskan dari foto. Pilih yang paling mewakili gayamu, terang, dan tajam. Foto pertama jadi sampul di direktori.
              </p>

              {rejected.length > 0 && (
                <div role="alert" className="mt-5 rounded-2xl bg-wd-blush px-5 py-4 text-sm text-wd-danger">
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
                    transition={{ duration: reduced ? 0 : 0.35, ease: EASE }}
                    className="mt-6 rounded-[24px] bg-wd-accent-wash p-5 sm:p-6"
                  >
                    <div className="flex flex-wrap items-end justify-between gap-3">
                      <div>
                        <h2 id="antrean-title" className="wd-title text-[1.2rem]">
                          Siap diunggah
                        </h2>
                        <p className="mt-0.5 text-sm text-wd-text">Tulis keterangan singkat. Keterangan tidak bisa diubah setelah foto diunggah.</p>
                      </div>
                      {uploading || finished > 0 ? (
                        <p aria-live="polite" className="text-sm font-semibold tabular-nums text-wd-ink">
                          {finished} dari {inBatch} foto terunggah
                        </p>
                      ) : null}
                    </div>
                    {(uploading || finished > 0) && (
                      <div role="progressbar" aria-label="Kemajuan unggahan" aria-valuemin={0} aria-valuemax={inBatch} aria-valuenow={finished} className="mt-3 h-1.5 overflow-hidden rounded-full bg-white">
                        <motion.div className="h-full bg-wd-ink" initial={false} animate={{ width: `${(finished / Math.max(inBatch, 1)) * 100}%` }} transition={{ duration: reduced ? 0 : 0.4, ease: EASE }} />
                      </div>
                    )}

                    <ul className="mt-5 flex flex-col">
                      {queue.map((item) => (
                        <li key={item.key} className="flex flex-col gap-3 border-t border-wd-accent-line py-4 first:border-t-0 sm:flex-row sm:items-start">
                          <div className="relative aspect-4/3 w-full shrink-0 overflow-hidden rounded-2xl bg-white sm:w-36">
                            {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview, next/image cannot load it */}
                            <img src={item.preview} alt="" className="h-full w-full object-cover" />
                            {item.state === "uploading" && (
                              <span className="absolute inset-0 flex items-center justify-center bg-wd-ink/40">
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
                              {item.state === "waiting" && <span className="text-wd-text">Menunggu diunggah</span>}
                              {item.state === "uploading" && <span className="font-semibold text-wd-ink">Mengunggah...</span>}
                              {item.state === "done" && (
                                <span className="flex items-center gap-1.5 font-semibold text-wd-ok">
                                  <CheckIcon /> Terunggah
                                </span>
                              )}
                              {item.state === "failed" && <span className="text-wd-danger">{item.error}</span>}
                            </p>
                          </div>
                          {(item.state === "waiting" || item.state === "failed") && !uploading && (
                            <button type="button" onClick={() => removeItem(item.key)} aria-label={`Batalkan ${item.file.name}`} className={`${wdButton({ variant: "white", size: "sm" })} self-start ${FOCUS}`}>
                              Batalkan
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>

                    {pending > 0 && (
                      <div className="mt-4 flex sm:justify-end">
                        <button type="button" onClick={uploadAll} disabled={uploading} aria-busy={uploading} className={`${wdButton({ variant: "ink" })} ${FOCUS}`}>
                          {uploading ? "Mengunggah..." : queue.some((i) => i.state === "failed") && !queue.some((i) => i.state === "waiting") ? "Coba unggah lagi" : `Unggah ${pending} foto`}
                        </button>
                      </div>
                    )}
                  </motion.section>
                )}
              </AnimatePresence>

              {/* Gallery. The upload tile is part of the grid, and the whole grid is a drop target. */}
              <section
                aria-label="Galeri etalase"
                className="mt-8"
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
              >
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
                {photos.length === 0 ? (
                  <div className={`flex flex-col items-center gap-3 rounded-[28px] px-6 py-14 text-center transition-colors sm:py-20 ${dragOver ? "bg-wd-accent-soft" : "bg-wd-accent-wash"}`}>
                    <span aria-hidden className="h-24 w-24 rounded-3xl bg-white p-4">
                      <ClientArt kind="camera" />
                    </span>
                    <h2 className="wd-title text-[1.4rem] leading-tight">Unggah foto pertamamu</h2>
                    <p className="max-w-md text-sm leading-relaxed text-wd-text">Seret foto ke sini, atau pilih dari galeri. Bisa beberapa sekaligus. JPG, PNG, atau WEBP, maksimal 5 MB per foto.</p>
                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className={`${wdButton({ variant: "ink" })} mt-2 ${FOCUS}`}>
                      <PlusIcon />
                      Pilih foto
                    </button>
                  </div>
                ) : (
                  <ul className="grid grid-flow-dense grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                    {photos.map((p, i) => (
                      <li key={p.id} className={i === 0 ? "col-span-2 row-span-2" : ""}>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteError(null);
                            setSelected(p);
                          }}
                          aria-label={`Buka foto: ${p.alt_text || "tanpa keterangan"}`}
                          className={`group relative block w-full overflow-hidden rounded-[22px] bg-wd-paper ${FOCUS} ${i === 0 ? "aspect-4/3 sm:h-full sm:min-h-72" : i % 3 === 1 ? "aspect-4/5" : "aspect-square"}`}
                        >
                          <Image
                            src={p.url}
                            alt=""
                            fill
                            sizes={i === 0 ? "(min-width: 1024px) 560px, 100vw" : "(min-width: 1024px) 280px, (min-width: 640px) 33vw, 50vw"}
                            className="object-cover transition-transform duration-700 group-hover:scale-[1.03] motion-reduce:transition-none"
                            unoptimized
                          />
                          {i === 0 && <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-xs font-semibold text-wd-ink">Sampul</span>}
                        </button>
                      </li>
                    ))}
                    <li>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className={`flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-[22px] text-wd-ink transition-colors ${dragOver ? "bg-wd-accent-soft" : "bg-wd-accent-wash hover:bg-wd-accent-soft"} disabled:opacity-60 ${FOCUS}`}
                      >
                        <PhotoIcon />
                        <span className="text-sm font-semibold">{uploading ? "Mengunggah..." : "Tambah foto"}</span>
                        <span className="px-3 text-xs text-wd-text">JPG, PNG, WEBP, maks 5 MB</span>
                      </button>
                    </li>
                  </ul>
                )}
              </section>

              {photos.length > 0 && (
                <div className="mt-10 flex flex-wrap items-center justify-between gap-3 rounded-[20px] bg-wd-paper px-5 py-4">
                  <p className="text-sm text-wd-text">Foto sudah ada. Sekarang tulis paket supaya calon pengantin tahu pilihan dan harganya.</p>
                  <Link href="/vendor/paket" className={`${wdButton({ variant: "outline", size: "sm" })} ${FOCUS}`}>
                    Atur paket
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {selected && (
        <PhotoDialog
          key={selected.id}
          photo={selected}
          isCover={photos[0]?.id === selected.id}
          hasNext={photos.length > 1}
          deleting={deleting}
          error={deleteError}
          onClose={() => setSelected(null)}
          onDelete={() => handleDelete(selected)}
        />
      )}
    </VendorShell>
  );
}

/** Native <dialog>: showModal gives focus trapping, Escape and the top layer
 * for free; a click on the backdrop (the dialog element itself) closes it.
 * The delete confirmation lives inside it, since a separate modal would sit
 * beneath the top layer. */
function PhotoDialog({
  photo,
  isCover,
  hasNext,
  deleting,
  error,
  onClose,
  onDelete,
}: {
  photo: Photo;
  isCover: boolean;
  hasNext: boolean;
  deleting: boolean;
  error: string | null;
  onClose: () => void;
  onDelete: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-label="Foto portofolio"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) ref.current?.close();
      }}
      className="m-auto max-h-[calc(100svh-1.5rem)] w-[calc(100vw-1.5rem)] max-w-3xl overflow-y-auto rounded-[24px] bg-white p-0 text-wd-ink shadow-[0_30px_80px_-20px_rgba(0,0,0,0.45)] backdrop:bg-wd-ink/60"
    >
      <div className="relative bg-wd-paper">
        {/* eslint-disable-next-line @next/next/no-img-element -- natural-size preview of an uploaded photo */}
        <img src={photo.url} alt={photo.alt_text} className="mx-auto max-h-[62svh] w-auto max-w-full object-contain" />
        <button
          type="button"
          onClick={() => ref.current?.close()}
          aria-label="Tutup foto"
          className={`absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-white text-wd-ink shadow-sm hover:bg-wd-blush ${FOCUS}`}
        >
          <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>
      <div className="p-5 sm:p-6">
        {isCover && <p className="wd-kicker">Sampul</p>}
        <p className={`mt-1 break-words ${photo.alt_text ? "text-wd-ink" : "italic text-wd-muted"}`}>{photo.alt_text || "Tanpa keterangan"}</p>
        {confirming ? (
          <div role="alertdialog" aria-label="Hapus foto" className="mt-4 rounded-2xl bg-wd-blush p-4">
            <p className="text-sm leading-relaxed text-wd-text">
              Foto ini hilang dari etalase publikmu dan tidak bisa dikembalikan. {isCover && hasNext ? "Foto berikutnya akan jadi sampul." : ""}
            </p>
            {error && (
              <p role="alert" className="mt-2 text-sm text-wd-danger">
                {error}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => setConfirming(false)} disabled={deleting} className={`${wdButton({ variant: "white", size: "sm" })} ${FOCUS}`}>
                Batal
              </button>
              <button type="button" onClick={onDelete} disabled={deleting} aria-busy={deleting} className={`${wdButton({ variant: "ink", size: "sm" })} ${FOCUS}`}>
                {deleting ? "Menghapus..." : "Ya, hapus foto"}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-sm text-xs leading-relaxed text-wd-muted">Keterangan ditulis saat foto diunggah. Untuk menggantinya, unggah ulang fotonya.</p>
            <button type="button" onClick={() => setConfirming(true)} className={`${wdButton({ variant: "outline", size: "sm" })} text-wd-danger ${FOCUS}`}>
              <TrashIcon />
              Hapus foto
            </button>
          </div>
        )}
      </div>
    </dialog>
  );
}

function PortfolioSkeleton() {
  return (
    <SkeletonGroup label="Memuat portofolio">
      <Skeleton className="h-5 w-full max-w-xl" />
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        <Skeleton className="col-span-2 row-span-2 aspect-4/3 rounded-[22px] sm:aspect-auto sm:min-h-72" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-[22px]" />
        ))}
      </div>
    </SkeletonGroup>
  );
}
