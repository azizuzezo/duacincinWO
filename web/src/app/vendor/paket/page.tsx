"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { CharCount, friendlyError, PencilIcon, PlusIcon, RupiahInput, TrashIcon } from "@/components/etalase/shared";
import { ClientArt } from "@/components/home/ClientArt";
import { wdButton } from "@/components/home/ui";
import { VENDOR_NAV } from "@/components/shell/navConfig";
import { VendorShell } from "@/components/shell/VendorShell";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Skeleton, SkeletonGroup } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { EtalaseTabs } from "@/components/vendor/EtalaseTabs";
import { WithUser } from "@/components/WithUser";
import {
  apiDelete,
  apiGet,
  apiPost,
  apiPut,
  ApiError,
  formatRupiah,
  type CurrentUser,
  type VendorPackage,
  type VendorProfile,
} from "@/lib/api";
import { EASE, useReducedMotion } from "@/lib/motion";

// Mirrors server/internal/vendors/handlers_packages.go.
const MAX_PACKAGES = 12;
const MAX_NAME = 80;
const MAX_DESC = 600;

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wd-ink";

export default function VendorPackagesPage() {
  return (
    <WithUser allowedRoles={["vendor"]} loginPath="/login">
      {(user) => <VendorPackagesContent user={user} />}
    </WithUser>
  );
}

function VendorPackagesContent({ user }: { user: CurrentUser }) {
  const toast = useToast();
  const reduced = useReducedMotion();
  const [profile, setProfile] = useState<VendorProfile | null | undefined>(undefined);
  const [packages, setPackages] = useState<VendorPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Editor: a package id, "new", or null (closed).
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [toDelete, setToDelete] = useState<VendorPackage | null>(null);
  const [deleting, setDeleting] = useState(false);
  // The row just saved is washed in gold for a moment so the eye finds it.
  const [justSaved, setJustSaved] = useState<string | null>(null);
  useEffect(() => {
    if (!justSaved) return;
    const t = setTimeout(() => setJustSaved(null), 2200);
    return () => clearTimeout(t);
  }, [justSaved]);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    Promise.all([
      apiGet<VendorProfile>("/api/v1/vendor/profile/me").catch((e) => {
        if (e instanceof ApiError && e.status === 404) return null; // no profile yet is normal
        throw e;
      }),
      apiGet<VendorPackage[]>("/api/v1/vendor/packages"),
    ])
      .then(([p, pk]) => {
        setProfile(p);
        setPackages(pk ?? []);
      })
      .catch((e) => setLoadError(friendlyError(e, "Periksa koneksi internetmu, lalu coba lagi.")))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    queueMicrotask(load);
  }, [load]);

  async function handleDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await apiDelete(`/api/v1/vendor/packages/${toDelete.id}`);
      setPackages((list) => list.filter((p) => p.id !== toDelete.id));
      toast.show("Paket dihapus", "success");
    } catch (err) {
      toast.show(friendlyError(err, "Paket belum terhapus. Coba lagi."), "danger");
    } finally {
      setToDelete(null);
      setDeleting(false);
    }
  }

  const atLimit = packages.length >= MAX_PACKAGES;
  const current = editing && editing !== "new" ? packages.find((p) => p.id === editing) : undefined;

  return (
    <VendorShell user={user} navItems={VENDOR_NAV} tone="wd" loginPath="/login" eyebrow="Vendor">
      <div className="wd-container pb-16 pt-8 sm:pt-10">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <div className="min-w-0">
            <p className="wd-kicker">Etalase</p>
            <h1 className="wd-display mt-2 text-[clamp(2.1rem,4.4vw,3.4rem)] leading-[1.05]">
              Paket yang mudah <em>dipilih</em>
            </h1>
          </div>
          {!loading && !loadError && profile && (
            <button type="button" onClick={() => setEditing("new")} disabled={atLimit} className={`${wdButton({ variant: "ink" })} ${FOCUS}`}>
              <PlusIcon />
              Tambah paket
            </button>
          )}
        </div>

        <EtalaseTabs publicId={profile?.status === "approved" ? user.id : undefined} status={profile?.status ?? null} />

        <div className="mt-8">
          {loading ? (
            <PackagesSkeleton />
          ) : loadError ? (
            <ErrorState title="Paket belum bisa dimuat" body={loadError} onRetry={load} />
          ) : profile == null ? (
            <div className="flex flex-col items-start gap-4 py-4 sm:flex-row sm:items-center">
              <span aria-hidden className="h-20 w-20 shrink-0 rounded-3xl bg-wd-accent-wash p-3.5">
                <ClientArt kind="shop" />
              </span>
              <div>
                <p className="font-semibold text-wd-ink">Lengkapi profil dulu</p>
                <p className="mt-0.5 max-w-md text-sm leading-relaxed text-wd-text">Paket tampil di etalase usahamu, jadi profil perlu dibuat lebih dulu.</p>
                <Link href="/vendor/profile" className={`${wdButton({ variant: "gold", size: "sm" })} mt-3 ${FOCUS}`}>
                  Ke halaman Profil
                </Link>
              </div>
            </div>
          ) : (
            <>
              <p className="max-w-2xl text-[0.95rem] leading-relaxed text-wd-text">
                Tulis isi tiap paket dengan jelas supaya calon pengantin bisa membandingkan sebelum chat. Isi hargamu sendiri: client membayar harga itu ditambah biaya layanan 10%.
              </p>

              <p className="mt-5 rounded-[20px] bg-wd-accent-wash px-5 py-4 text-sm leading-relaxed text-wd-text">
                <span className="font-semibold text-wd-ink">Dana Aman.</span> Client membayar DP 30% saat memesan. Dana ditahan DuaCincin dan diteruskan ke kamu setelah client mengonfirmasi pekerjaan selesai.
              </p>

              {packages.length === 0 ? (
                <div className="flex flex-col items-start gap-5 py-10 sm:flex-row sm:items-center">
                  <span aria-hidden className="h-24 w-24 shrink-0 rounded-3xl bg-wd-accent-wash p-4">
                    <ClientArt kind="clipboard" />
                  </span>
                  <div>
                    <h2 className="wd-title text-[1.4rem] leading-tight">Belum ada paket</h2>
                    <p className="mt-1 max-w-md text-sm leading-relaxed text-wd-text">Mulai dari paket yang paling sering dipesan. Harga yang jelas membuat calon pengantin lebih cepat menghubungimu.</p>
                    <button type="button" onClick={() => setEditing("new")} className={`${wdButton({ variant: "gold" })} mt-4 ${FOCUS}`}>
                      <PlusIcon />
                      Buat paket pertama
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mt-8 flex items-center justify-between gap-3 border-b border-wd-line pb-3">
                    <h2 className="wd-title text-[1.2rem]">Daftar paket</h2>
                    <p className="text-sm tabular-nums text-wd-muted">
                      {packages.length} dari {MAX_PACKAGES}
                    </p>
                  </div>
                  <ul>
                    <AnimatePresence initial={false}>
                      {packages.map((p) => (
                        <motion.li
                          key={p.id}
                          layout={reduced ? false : "position"}
                          initial={reduced ? false : { opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0, transition: { duration: reduced ? 0 : 0.28, ease: EASE } }}
                          exit={{ opacity: 0, transition: { duration: reduced ? 0 : 0.18 } }}
                          className="border-b border-wd-line"
                        >
                          <PackageRow pkg={p} highlight={justSaved === p.id} onEdit={() => setEditing(p.id)} onDelete={() => setToDelete(p)} />
                        </motion.li>
                      ))}
                    </AnimatePresence>
                  </ul>
                  {atLimit ? (
                    <p className="mt-5 text-sm leading-relaxed text-wd-text">Sudah {MAX_PACKAGES} paket, batas maksimal. Hapus atau gabungkan paket untuk menambah yang baru.</p>
                  ) : (
                    <button type="button" onClick={() => setEditing("new")} className={`mt-4 inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold text-wd-ink hover:bg-wd-paper ${FOCUS}`}>
                      <PlusIcon />
                      Tambah paket
                    </button>
                  )}

                  <div className="mt-10 flex flex-wrap items-center justify-between gap-3 rounded-[20px] bg-wd-paper px-5 py-4">
                    <p className="text-sm text-wd-text">{profile.status === "approved" ? "Lihat paketmu seperti yang dilihat calon pengantin." : "Pastikan profilmu lengkap supaya cepat disetujui."}</p>
                    {profile.status === "approved" ? (
                      <Link href={`/vendors/${user.id}`} target="_blank" rel="noopener noreferrer" className={`${wdButton({ variant: "outline", size: "sm" })} ${FOCUS}`}>
                        Lihat etalase publik
                        <span className="sr-only">(buka di tab baru)</span>
                      </Link>
                    ) : (
                      <Link href="/vendor/profile" className={`${wdButton({ variant: "outline", size: "sm" })} ${FOCUS}`}>
                        Cek profil
                      </Link>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={current ? "Ubah paket" : "Paket baru"}
        description="Nama, harga, dan isi paket tampil persis seperti ini di etalase publikmu."
      >
        {editing !== null && (
          <PackageForm
            key={current?.id ?? "new"}
            pkg={current}
            onClose={() => setEditing(null)}
            onSaved={(saved, isNew) => {
              setPackages((list) => (isNew ? [...list, saved] : list.map((p) => (p.id === saved.id ? saved : p))));
              setEditing(null);
              setJustSaved(saved.id);
              toast.show(isNew ? "Paket ditambahkan" : "Paket diperbarui", "success");
            }}
          />
        )}
      </Modal>

      <Modal open={toDelete !== null} onClose={() => setToDelete(null)} title="Hapus paket ini?" size="sm">
        <p className="text-sm leading-relaxed text-wd-text">
          Paket <span className="font-semibold text-wd-ink">{toDelete?.name}</span> tidak tampil lagi di etalase publikmu. Booking yang sudah berjalan tidak terpengaruh.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => setToDelete(null)} className={`${wdButton({ variant: "outline", size: "sm" })} ${FOCUS}`}>
            Batal
          </button>
          <button type="button" onClick={handleDelete} disabled={deleting} aria-busy={deleting} className={`${wdButton({ variant: "ink", size: "sm" })} ${FOCUS}`}>
            {deleting ? "Menghapus..." : "Ya, hapus paket"}
          </button>
        </div>
      </Modal>
    </VendorShell>
  );
}

function PackageRow({ pkg, highlight, onEdit, onDelete }: { pkg: VendorPackage; highlight: boolean; onEdit: () => void; onDelete: () => void }) {
  // Vendors write one point per line; the row shows them as a short summary.
  const lines = pkg.description
    .split("\n")
    .map((l) => l.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);

  return (
    <div className={`flex flex-col gap-3 rounded-2xl px-2 py-5 transition-colors duration-700 sm:flex-row sm:items-start sm:gap-6 sm:px-3 ${highlight ? "bg-wd-accent-wash" : "bg-transparent"}`}>
      <div className="min-w-0 flex-1">
        <h3 className="break-words font-semibold leading-snug text-wd-ink">{pkg.name}</h3>
        {lines.length > 0 ? (
          <ul className="mt-2 flex flex-col gap-1 text-sm leading-relaxed text-wd-text">
            {lines.slice(0, 4).map((l, i) => (
              <li key={i} className="flex gap-2.5 break-words">
                <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-wd-accent" />
                <span className="min-w-0">{l}</span>
              </li>
            ))}
            {lines.length > 4 && <li className="pl-4 text-wd-muted">dan {lines.length - 4} poin lain</li>}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-wd-muted">Belum ada rincian isi paket.</p>
        )}
      </div>
      <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
        <p className="text-lg font-bold tabular-nums text-wd-ink">{pkg.price > 0 ? formatRupiah(pkg.price) : "Gratis"}</p>
        <div className="flex gap-1">
          <button type="button" onClick={onEdit} aria-label={`Ubah paket ${pkg.name}`} className={`inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-semibold text-wd-ink hover:bg-wd-paper ${FOCUS}`}>
            <PencilIcon />
            Ubah
          </button>
          <button type="button" onClick={onDelete} aria-label={`Hapus paket ${pkg.name}`} className={`inline-flex h-11 w-11 items-center justify-center rounded-full text-wd-danger hover:bg-wd-blush ${FOCUS}`}>
            <TrashIcon />
          </button>
        </div>
      </div>
    </div>
  );
}

type SheetErrors = Partial<Record<"name" | "description" | "price", string>>;

function PackageForm({ pkg, onClose, onSaved }: { pkg?: VendorPackage; onClose: () => void; onSaved: (saved: VendorPackage, isNew: boolean) => void }) {
  const [name, setName] = useState(pkg?.name ?? "");
  const [description, setDescription] = useState(pkg?.description ?? "");
  const [price, setPrice] = useState(pkg ? String(pkg.price) : "");
  const [errors, setErrors] = useState<SheetErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSave(e?: React.FormEvent) {
    e?.preventDefault();
    setFormError(null);
    const v: SheetErrors = {};
    const n = name.trim();
    if (!n) v.name = "Beri nama paketnya, misalnya Paket Akad Nikah.";
    else if ([...n].length > MAX_NAME) v.name = `Nama paket maksimal ${MAX_NAME} huruf.`;
    if ([...description.trim()].length > MAX_DESC) v.description = `Isi paket maksimal ${MAX_DESC} huruf. Ringkas beberapa poin.`;
    if (price === "") v.price = "Isi harga paket. Tulis 0 bila paket ini gratis.";
    setErrors(v);
    if (Object.keys(v).length) {
      // Move focus to the first field that needs fixing; its message is linked via aria-describedby.
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus());
      return;
    }

    setSaving(true);
    try {
      const body = { name: n, description: description.trim(), price: Number(price) };
      if (pkg) {
        const updated = await apiPut<VendorPackage>(`/api/v1/vendor/packages/${pkg.id}`, body);
        onSaved(updated, false);
      } else {
        const created = await apiPost<VendorPackage>("/api/v1/vendor/packages", body);
        onSaved(created, true);
      }
    } catch (err) {
      setFormError(friendlyError(err, "Paket belum tersimpan. Periksa koneksi internetmu, lalu coba lagi."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSave} noValidate className="flex flex-col gap-5">
      <Input
        label="Nama paket"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={errors.name}
        placeholder="Contoh: Paket Akad Nikah"
        hint={<CharCount value={name} max={MAX_NAME} />}
      />
      <RupiahInput label="Harga (Rp)" value={price} onChange={setPrice} error={errors.price} hint={price ? `Tampil sebagai ${Number(price) > 0 ? formatRupiah(Number(price)) : "Gratis"}` : "Harga total paket, sudah termasuk semua isi di bawah."} />
      <Textarea
        label="Isi paket"
        optional
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        error={errors.description}
        rows={7}
        placeholder={"Rias akad dan resepsi\nTim 3 orang\nBusana adat sudah termasuk"}
        hint={
          <span className="flex justify-between gap-3">
            <span>Satu baris untuk satu poin.</span>
            <CharCount value={description.trim()} max={MAX_DESC} />
          </span>
        }
      />
      {formError && (
        <p role="alert" className="rounded-2xl bg-wd-blush px-4 py-3 text-sm text-wd-danger">
          {formError}
        </p>
      )}
      <div className="flex flex-col-reverse gap-2 border-t border-wd-line pt-5 sm:flex-row sm:justify-end">
        <button type="button" onClick={onClose} className={`${wdButton({ variant: "outline", size: "sm" })} ${FOCUS}`}>
          Batal
        </button>
        <button type="submit" disabled={saving} aria-busy={saving} className={`${wdButton({ variant: "ink", size: "sm" })} ${FOCUS}`}>
          {saving ? "Menyimpan..." : pkg ? "Simpan perubahan" : "Simpan paket"}
        </button>
      </div>
    </form>
  );
}

function PackagesSkeleton() {
  return (
    <SkeletonGroup label="Memuat paket">
      <Skeleton className="h-5 w-full max-w-xl" />
      <Skeleton className="mt-5 h-14 rounded-[20px]" />
      <div className="mt-8 flex flex-col gap-4">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
    </SkeletonGroup>
  );
}
