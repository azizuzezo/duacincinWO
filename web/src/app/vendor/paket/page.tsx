"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

import { CharCount, friendlyError, MobileActionBar, NextStep, PencilIcon, PlusIcon, RupiahInput, TrashIcon } from "@/components/etalase/shared";
import { VENDOR_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Sheet } from "@/components/ui/Sheet";
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
import { fadeUp, motionSafe, staggerList, useReducedMotion } from "@/lib/motion";

// Mirrors server/internal/vendors/handlers_packages.go.
const MAX_PACKAGES = 12;
const MAX_NAME = 80;
const MAX_DESC = 600;

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
  // Success state: the card just saved glows gold for a moment so the eye finds it.
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
    <Shell user={user} navItems={VENDOR_NAV} loginPath="/login" eyebrow="Vendor">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <EtalaseTabs publicId={profile?.status === "approved" ? user.id : undefined} status={profile?.status ?? null} />

        {loading ? (
          <PackagesSkeleton />
        ) : loadError ? (
          <ErrorState title="Paket belum bisa dimuat" body={loadError} onRetry={load} />
        ) : profile === null ? (
          <EmptyState
            title="Lengkapi profil dulu"
            body="Paket harga ditampilkan di etalase usahamu, jadi profil perlu dibuat lebih dulu."
            actionHref="/vendor/profile"
            actionLabel="Ke halaman Profil"
          />
        ) : (
          <>
            <PageHeader
              title={
                <>
                  Paket yang mudah <span className="dc-em">dipilih</span>
                </>
              }
              subtitle="Tulis isi tiap paket dengan jelas supaya calon pengantin bisa membandingkan sebelum chat. Harga mulai dari di kartu direktori tetap diatur di halaman Profil."
              action={
                <div className="hidden items-center gap-4 md:flex">
                  <p className="text-sm tabular-nums text-dc-text-2">
                    {packages.length} dari {MAX_PACKAGES} paket
                  </p>
                  <Button onClick={() => setEditing("new")} disabled={atLimit}>
                    <PlusIcon />
                    Tambah paket
                  </Button>
                </div>
              }
            />

            <div className="mb-8 flex items-start gap-3 rounded-xl bg-dc-cream px-5 py-4">
              <span aria-hidden className="mt-1.5 flex shrink-0 items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-dc-gold" />
                <span className="h-2 w-2 rounded-full bg-dc-gold" />
                <span className="h-2 w-2 rounded-full border border-dc-line-strong" />
              </span>
              <p className="text-sm leading-relaxed text-dc-text-2">
                <span className="font-semibold text-dc-ink">Dana ditahan escrow.</span> Saat calon pengantin memesan paketmu, pembayarannya ditahan DuaCincin dan diteruskan ke kamu setelah acara selesai.
              </p>
            </div>

            {packages.length === 0 ? (
              <EmptyState
                title="Belum ada paket"
                body="Mulai dari paket yang paling sering dipesan. Calon pengantin lebih cepat menghubungi vendor yang harganya jelas."
                action={
                  <Button onClick={() => setEditing("new")}>
                    <PlusIcon />
                    Buat paket pertama
                  </Button>
                }
              />
            ) : (
              <motion.ul
                className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3"
                initial="hidden"
                animate="visible"
                // Cards settle in reading order, so the list reads as a menu, not a table dump.
                variants={motionSafe(reduced, staggerList)}
              >
                <AnimatePresence initial={false}>
                  {packages.map((p, i) => (
                    <motion.li
                      key={p.id}
                      layout={!reduced}
                      variants={motionSafe(reduced, fadeUp)}
                      exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.18 } }}
                    >
                      <PackageCard pkg={p} index={i} highlight={justSaved === p.id} onEdit={() => setEditing(p.id)} onDelete={() => setToDelete(p)} />
                    </motion.li>
                  ))}
                  {!atLimit && (
                    <motion.li key="tambah" layout={!reduced} variants={motionSafe(reduced, fadeUp)} className="hidden md:block">
                      <button
                        type="button"
                        onClick={() => setEditing("new")}
                        className="flex h-full min-h-56 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-dc-line-strong text-dc-text-2 transition-colors hover:border-dc-gold hover:text-dc-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold"
                      >
                        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-dc-cream text-dc-clay">
                          <PlusIcon />
                        </span>
                        <span className="font-semibold">Tambah paket</span>
                        <span className="text-sm text-dc-text-3">Masih bisa {MAX_PACKAGES - packages.length} lagi</span>
                      </button>
                    </motion.li>
                  )}
                </AnimatePresence>
              </motion.ul>
            )}

            {atLimit && (
              <p className="mt-6 text-sm leading-relaxed text-dc-text-2">
                Sudah {MAX_PACKAGES} paket, batas maksimal. Hapus atau gabungkan paket untuk menambah yang baru.
              </p>
            )}

            {packages.length > 0 &&
              (profile?.status === "approved" ? (
                <NextStep href={`/vendors/${user.id}`} external label="Lihat etalase publik" note="Cek tampilan etalasemu persis seperti yang dilihat calon pengantin." />
              ) : (
                <NextStep href="/vendor/profile" label="Cek kelengkapan profil" note="Paket tersimpan. Pastikan profilmu lengkap supaya cepat disetujui dan tampil di direktori." />
              ))}

            {!atLimit && packages.length > 0 && (
              <MobileActionBar>
                <div className="flex items-center gap-3">
                  <p className="min-w-0 flex-1 text-sm tabular-nums text-dc-text-2">
                    {packages.length} dari {MAX_PACKAGES} paket
                  </p>
                  <Button onClick={() => setEditing("new")}>
                    <PlusIcon />
                    Tambah paket
                  </Button>
                </div>
              </MobileActionBar>
            )}
          </>
        )}
      </div>

      <PackageSheet
        open={editing !== null}
        pkg={current}
        onClose={() => setEditing(null)}
        onSaved={(saved, isNew) => {
          setPackages((list) => (isNew ? [...list, saved] : list.map((p) => (p.id === saved.id ? saved : p))));
          setEditing(null);
          setJustSaved(saved.id);
          toast.show(isNew ? "Paket ditambahkan" : "Paket diperbarui", "success");
        }}
      />

      <Modal open={toDelete !== null} onClose={() => setToDelete(null)} title="Hapus paket ini?">
        <p className="text-sm leading-relaxed text-dc-text-2">
          Paket <span className="font-semibold text-dc-ink">{toDelete?.name}</span> tidak tampil lagi di etalase publikmu. Booking yang sudah berjalan tidak terpengaruh.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => setToDelete(null)}>
            Batal
          </Button>
          <Button variant="danger" onClick={handleDelete} loading={deleting}>
            Ya, hapus paket
          </Button>
        </div>
      </Modal>
    </Shell>
  );
}

function PackageCard({ pkg, index, highlight, onEdit, onDelete }: { pkg: VendorPackage; index: number; highlight: boolean; onEdit: () => void; onDelete: () => void }) {
  // Vendors write one point per line; show those as a list so the contents scan.
  const lines = pkg.description
    .split("\n")
    .map((l) => l.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);

  return (
    <Card className={`flex h-full flex-col p-6 transition-shadow duration-700 ${highlight ? "ring-2 ring-dc-gold" : "ring-0 ring-transparent"}`}>
      <div className="flex items-start justify-between gap-3">
        <span aria-hidden className="font-heading text-2xl italic leading-none text-dc-clay">
          {String(index + 1).padStart(2, "0")}
        </span>
      </div>
      <h3 className="mt-3 break-words font-heading text-[1.75rem] leading-tight text-dc-ink">{pkg.name}</h3>
      <p className="mt-3 text-[1.6rem] font-bold leading-none tracking-tight tabular-nums text-dc-ink">{pkg.price > 0 ? formatRupiah(pkg.price) : "Gratis"}</p>

      {lines.length > 1 ? (
        <ul className="mt-5 flex flex-col gap-2 border-t border-dc-line pt-4 text-sm leading-relaxed text-dc-text-2">
          {lines.map((l, i) => (
            <li key={i} className="flex gap-2.5 break-words">
              <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-dc-gold" />
              <span className="min-w-0">{l}</span>
            </li>
          ))}
        </ul>
      ) : lines.length === 1 ? (
        <p className="mt-5 break-words border-t border-dc-line pt-4 text-sm leading-relaxed text-dc-text-2">{lines[0]}</p>
      ) : (
        <p className="mt-5 border-t border-dc-line pt-4 text-sm text-dc-text-3">Belum ada rincian isi paket.</p>
      )}

      <div className="mt-auto flex gap-2 pt-6">
        <Button variant="ghost" size="sm" onClick={onEdit} aria-label={`Ubah paket ${pkg.name}`} className="flex-1">
          <PencilIcon />
          Ubah
        </Button>
        <Button variant="quiet" size="sm" onClick={onDelete} aria-label={`Hapus paket ${pkg.name}`} className="text-dc-danger!">
          <TrashIcon />
          Hapus
        </Button>
      </div>
    </Card>
  );
}

type SheetErrors = Partial<Record<"name" | "description" | "price", string>>;

/** Editor for one package. Remounts its form on each open so fields always
 * start from the package being edited (or empty for a new one). */
function PackageSheet({
  open,
  pkg,
  onClose,
  onSaved,
}: {
  open: boolean;
  pkg?: VendorPackage;
  onClose: () => void;
  onSaved: (saved: VendorPackage, isNew: boolean) => void;
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={pkg ? "Ubah paket" : "Paket baru"}
      description="Nama, harga, dan isi paket tampil persis seperti ini di etalase publikmu."
    >
      {open && <PackageForm key={pkg?.id ?? "new"} pkg={pkg} onClose={onClose} onSaved={onSaved} />}
    </Sheet>
  );
}

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
        <p role="alert" className="rounded-lg border border-dc-danger/25 bg-dc-danger/[0.05] px-4 py-3 text-sm text-dc-danger">
          {formError}
        </p>
      )}
      <div className="flex flex-col-reverse gap-2 border-t border-dc-line pt-5 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onClose}>
          Batal
        </Button>
        <Button type="submit" loading={saving}>
          {pkg ? "Simpan perubahan" : "Simpan paket"}
        </Button>
      </div>
    </form>
  );
}

function PackagesSkeleton() {
  return (
    <SkeletonGroup label="Memuat paket">
      <Skeleton className="h-12 w-2/3 max-w-md" />
      <Skeleton className="mt-3 h-5 w-full max-w-xl" />
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-72 rounded-xl" />
        ))}
      </div>
    </SkeletonGroup>
  );
}
