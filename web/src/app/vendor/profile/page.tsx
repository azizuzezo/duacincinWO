"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CheckIcon, friendlyError, MobileActionBar, RupiahInput } from "@/components/etalase/shared";
import { PasswordSection } from "@/components/PasswordSection";
import { VENDOR_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { PageHeader } from "@/components/ui/PageHeader";
import { Sheet } from "@/components/ui/Sheet";
import { Skeleton, SkeletonGroup } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { EtalaseTabs } from "@/components/vendor/EtalaseTabs";
import { VendorCard } from "@/components/vendor/VendorCard";
import { WithUser } from "@/components/WithUser";
import {
  apiGet,
  apiPost,
  apiPut,
  ApiError,
  VENDOR_CATEGORIES,
  type CurrentUser,
  type VendorPackage,
  type VendorProfile,
} from "@/lib/api";
import { fadeUp, motionSafe, staggerList, useReducedMotion } from "@/lib/motion";

const STATUS_LABEL: Record<VendorProfile["status"], { text: string; tone: "gold" | "success" | "danger" }> = {
  pending: { text: "Sedang ditinjau tim DuaCincin", tone: "gold" },
  approved: { text: "Tampil di direktori", tone: "success" },
  rejected: { text: "Belum disetujui", tone: "danger" },
};

/** A story shorter than this reads as a placeholder to couples. */
const STORY_GOAL = 120;
const PHOTO_GOAL = 3;

type FieldErrors = Partial<Record<"name" | "city" | "priceMin" | "priceMax", string>>;

export default function VendorProfilePage() {
  return (
    <WithUser allowedRoles={["vendor"]} loginPath="/login">
      {(user) => <VendorProfileContent user={user} />}
    </WithUser>
  );
}

function VendorProfileContent({ user }: { user: CurrentUser }) {
  const toast = useToast();
  const reduced = useReducedMotion();

  // undefined = loading, null = no profile yet (404 is normal for a new vendor).
  const [profile, setProfile] = useState<VendorProfile | null | undefined>(undefined);
  const [packageCount, setPackageCount] = useState<number | null>(null);
  const [loadError, setLoadError] = useState(false);

  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState(VENDOR_CATEGORIES[0].value);
  const [city, setCity] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [description, setDescription] = useState("");
  // Errors are derived: a field shows its message once it was left (blur) or after a save attempt.
  const [touched, setTouched] = useState<Partial<Record<keyof FieldErrors, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [nameSheet, setNameSheet] = useState(false);

  function applyProfile(p: VendorProfile) {
    setProfile(p);
    setBusinessName(p.business_name);
    setCategory(p.category);
    setCity(p.city);
    setPriceMin(p.price_min ? String(p.price_min) : "");
    setPriceMax(p.price_max ? String(p.price_max) : "");
    setDescription(p.description);
  }

  const loadProfile = useCallback(() => {
    setLoadError(false);
    return apiGet<VendorProfile>("/api/v1/vendor/profile/me")
      .then(applyProfile)
      .catch((e) => {
        if (e instanceof ApiError && e.status === 404) setProfile(null);
        else setLoadError(true);
      });
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      loadProfile();
      // Only used for the completeness meter; if it fails the step is simply left out.
      apiGet<VendorPackage[]>("/api/v1/vendor/packages")
        .then((pk) => setPackageCount((pk ?? []).length))
        .catch(() => setPackageCount(null));
    });
  }, [loadProfile]);

  const dirty =
    profile !== undefined &&
    (profile === null
      ? !!(businessName || city || priceMin || priceMax || description)
      : city !== profile.city ||
        category !== profile.category ||
        Number(priceMin || 0) !== profile.price_min ||
        Number(priceMax || 0) !== profile.price_max ||
        description !== profile.description);

  function validate(): FieldErrors {
    const e: FieldErrors = {};
    if (!profile && !businessName.trim()) e.name = "Tulis nama usahamu, nama ini yang dilihat calon pengantin.";
    if (!city.trim()) e.city = "Isi kota tempat usahamu berada.";
    const min = Number(priceMin || 0);
    const max = Number(priceMax || 0);
    if (min > 0 && !priceMax) e.priceMax = "Isi harga tertinggi. Kalau harganya tetap, samakan dengan harga mulai.";
    else if (max < min) e.priceMax = "Harga tertinggi tidak boleh lebih kecil dari harga mulai.";
    return e;
  }

  const allErrors = validate();
  const errors: FieldErrors = submitted
    ? allErrors
    : Object.fromEntries(Object.entries(allErrors).filter(([k]) => touched[k as keyof FieldErrors]));
  const blur = (k: keyof FieldErrors) => () => setTouched((t) => ({ ...t, [k]: true }));
  const showSummary = submitted && Object.keys(allErrors).length > 0;

  async function handleSave(e?: React.FormEvent) {
    e?.preventDefault();
    setSaveError(null);
    setSubmitted(true);
    if (Object.keys(allErrors).length) {
      // Error summary takes focus so keyboard and screen reader users land on what to fix.
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    setSaving(true);
    try {
      const updated = await apiPut<VendorProfile>("/api/v1/vendor/profile", {
        business_name: profile?.business_name ?? businessName.trim(),
        category,
        city: city.trim(),
        price_min: Number(priceMin) || 0,
        price_max: Number(priceMax) || 0,
        description,
      });
      // PUT returns the profile without its portfolio; keep the photos we already have.
      applyProfile({ ...updated, portfolio: updated.portfolio ?? profile?.portfolio });
      toast.show("Profil tersimpan", "success");
    } catch (err) {
      setSaveError(friendlyError(err, "Profil belum tersimpan. Periksa koneksi internetmu, lalu coba lagi."));
    } finally {
      setSaving(false);
    }
  }

  const photos = profile?.portfolio ?? [];
  const steps = useMemo(() => {
    const list: { label: string; done: boolean; href?: string }[] = [
      { label: "Nama usaha", done: !!(profile?.business_name || businessName.trim()) },
      { label: "Kota", done: !!city.trim() },
      { label: "Harga mulai dari", done: Number(priceMin || 0) > 0 },
      { label: `Cerita usaha minimal ${STORY_GOAL} huruf`, done: [...description.trim()].length >= STORY_GOAL },
      { label: `Minimal ${PHOTO_GOAL} foto portofolio`, done: photos.length >= PHOTO_GOAL, href: "/vendor/portfolio" },
    ];
    if (packageCount !== null) list.push({ label: "Minimal 1 paket harga", done: packageCount > 0, href: "/vendor/paket" });
    return list;
  }, [profile, businessName, city, priceMin, description, photos.length, packageCount]);

  const loading = profile === undefined && !loadError;

  return (
    <Shell user={user} navItems={VENDOR_NAV} loginPath="/login" eyebrow="Vendor">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <EtalaseTabs publicId={profile?.status === "approved" ? user.id : undefined} status={profile?.status ?? null} />

        {loadError ? (
          <ErrorState title="Profil belum bisa dimuat" onRetry={loadProfile} />
        ) : loading ? (
          <ProfileSkeleton />
        ) : (
          <>
            <PageHeader
              title={
                profile ? (
                  profile.business_name
                ) : (
                  <>
                    Buka <span className="dc-em">etalase</span> usahamu
                  </>
                )
              }
              subtitle={
                profile
                  ? "Ini yang dibaca calon pengantin sebelum menghubungimu. Lengkapi, lalu lihat pratinjaunya di samping."
                  : "Isi profil usahamu. Setelah ditinjau tim DuaCincin, etalasemu tampil di direktori dan bisa menerima booking."
              }
              action={profile ? <Badge tone={STATUS_LABEL[profile.status].tone}>{STATUS_LABEL[profile.status].text}</Badge> : undefined}
            />

            {profile?.status === "rejected" && (
              <div role="alert" className="mb-8 rounded-xl border border-dc-danger/25 bg-dc-danger/[0.05] px-5 py-4">
                <p className="font-semibold text-dc-ink">Profilmu belum disetujui</p>
                <p className="mt-1 text-sm leading-relaxed text-dc-text-2">
                  {profile.rejection_reason ? <>Catatan dari tim: {profile.rejection_reason}</> : "Tim DuaCincin belum menyetujui profil ini."}
                </p>
              </div>
            )}

            {/* Mobile: the meter leads so the vendor sees what is missing before scrolling the form. */}
            <div className="mb-6 lg:hidden">
              <Completeness steps={steps} compact />
            </div>

            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-10">
              <motion.form
                onSubmit={handleSave}
                noValidate
                className="flex min-w-0 flex-col gap-6"
                initial="hidden"
                animate="visible"
                // Sections settle in order: identity, price, story, the way a couple reads the card.
                variants={motionSafe(reduced, staggerList)}
              >
                <FormSection n={1} title="Identitas usaha" note="Nama dan kategori menentukan di mana kamu muncul saat calon pengantin mencari.">
                  {profile ? (
                    <div className="rounded-lg bg-dc-cream px-4 py-3.5">
                      <p className="text-sm text-dc-text-2">Nama usaha</p>
                      <p className="font-heading text-2xl leading-tight text-dc-ink">{profile.business_name}</p>
                      {profile.pending_name_change?.status === "pending" ? (
                        <p className="mt-2 text-sm leading-relaxed text-dc-text-2">
                          Permintaan ganti nama menjadi <span className="font-semibold text-dc-ink">&ldquo;{profile.pending_name_change.requested_name}&rdquo;</span> sedang ditinjau tim DuaCincin.
                        </p>
                      ) : (
                        <Button variant="quiet" size="sm" className="mt-1 -ml-2" onClick={() => setNameSheet(true)}>
                          Ajukan ganti nama
                        </Button>
                      )}
                    </div>
                  ) : (
                    <Input
                      label="Nama usaha"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      id="f-name"
                      error={errors.name}
                      onBlur={blur("name")}
                      hint="Setelah disimpan, nama hanya bisa diganti lewat persetujuan tim."
                      autoComplete="organization"
                    />
                  )}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Select label="Kategori" value={category} onChange={(e) => setCategory(e.target.value)}>
                      {VENDOR_CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </Select>
                    <Input id="f-city" label="Kota" value={city} onChange={(e) => setCity(e.target.value)} onBlur={blur("city")} error={errors.city} placeholder="Contoh: Yogyakarta" autoComplete="address-level2" />
                  </div>
                </FormSection>

                <FormSection n={2} title="Kisaran harga" note="Harga mulai dari tampil di kartu direktori. Rincian per paket diatur di halaman Paket harga.">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <RupiahInput id="f-pricemin" label="Harga mulai dari (Rp)" value={priceMin} onChange={setPriceMin} error={errors.priceMin} hint="Kosongkan bila harga dibahas lewat chat." />
                    <RupiahInput id="f-pricemax" label="Harga tertinggi (Rp)" value={priceMax} onChange={setPriceMax} onBlur={blur("priceMax")} error={errors.priceMax} />
                  </div>
                </FormSection>

                <FormSection n={3} title="Cerita usaha" note="Ceritakan gaya, pengalaman, dan apa yang membuat hasil kerjamu berbeda.">
                  <Textarea
                    label="Deskripsi"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={6}
                    optional
                    placeholder="Contoh: Kami merias pengantin adat Jawa sejak 2012. Tim kami membawa busana dan aksesori sendiri."
                    hint={
                      <span className="flex justify-between gap-3">
                        <span>
                          {[...description.trim()].length >= STORY_GOAL ? "Cukup untuk membuat calon pengantin mengenalmu." : `Usahakan minimal ${STORY_GOAL} huruf.`}
                        </span>
                        <span className="tabular-nums">{[...description.trim()].length} huruf</span>
                      </span>
                    }
                  />
                </FormSection>

                {showSummary && (
                  <div ref={summaryRef} tabIndex={-1} role="group" aria-labelledby="ringkasan-galat" className="rounded-lg border border-dc-danger/25 bg-dc-danger/[0.05] px-4 py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold">
                    <p id="ringkasan-galat" className="text-sm font-semibold text-dc-danger">
                      Profil belum tersimpan. Lengkapi dulu:
                    </p>
                    <ul className="mt-1 list-disc pl-5 text-sm text-dc-danger">
                      {(Object.entries(allErrors) as [keyof FieldErrors, string][]).map(([k, msg]) => (
                        <li key={k}>
                          <a href={`#f-${k.toLowerCase()}`} className="inline-flex min-h-9 items-center underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold">
                            {msg}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {saveError && (
                  <p role="alert" className="rounded-lg border border-dc-danger/25 bg-dc-danger/[0.05] px-4 py-3 text-sm text-dc-danger">
                    {saveError}
                  </p>
                )}

                {/* Desktop keeps the save inline at the end of the form; mobile uses the pinned bar. */}
                <div className="hidden items-center justify-end gap-4 md:flex">
                  <SaveHint dirty={dirty} />
                  <Button type="submit" loading={saving}>
                    {profile ? "Simpan perubahan" : "Simpan profil"}
                  </Button>
                </div>
                <MobileActionBar>
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <SaveHint dirty={dirty} />
                    </div>
                    <Button type="submit" loading={saving} className="shrink-0">
                      {profile ? "Simpan" : "Simpan profil"}
                    </Button>
                  </div>
                </MobileActionBar>
              </motion.form>

              <aside aria-label="Pratinjau etalase" className="flex min-w-0 flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
                <div className="hidden lg:block">
                  <Completeness steps={steps} />
                </div>
                <div>
                  <p className="mb-3 text-sm font-semibold text-dc-ink">Begini calon pengantin melihatmu</p>
                  {/* The real directory card, fed by the form as you type. Inert: it is a picture, not a link. */}
                  <div inert className="select-none">
                    <VendorCard
                      card={{
                        id: user.id,
                        business_name: profile?.business_name || businessName.trim() || "Nama usahamu",
                        category,
                        city: city.trim() || "Kotamu",
                        price_min: Number(priceMin || 0),
                        price_max: Number(priceMax || 0),
                        sample_image: photos[0]?.url,
                        average_rating: profile?.average_rating ?? 0,
                        review_count: profile?.review_count ?? 0,
                      }}
                    />
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-dc-text-2">
                    {photos.length > 0 ? (
                      <>Foto sampul diambil dari foto pertama di portofoliomu. </>
                    ) : (
                      <>Kartu tanpa foto jarang dibuka. </>
                    )}
                    <Link href="/vendor/portfolio" className="inline-flex min-h-11 items-center font-semibold text-dc-clay underline underline-offset-4 hover:text-dc-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold">
                      {photos.length > 0 ? "Atur portofolio" : "Unggah foto pertama"}
                    </Link>
                  </p>
                </div>
                {profile && (
                  <Card tone="paper" className="p-5">
                    <p className="text-sm font-semibold text-dc-ink">Ulasan</p>
                    {profile.review_count > 0 ? (
                      <p className="mt-1 flex items-baseline gap-2">
                        <span className="text-[2rem] font-bold leading-none tracking-tight tabular-nums text-dc-ink">{profile.average_rating.toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                        <span className="text-sm text-dc-text-2">dari {profile.review_count} ulasan client</span>
                      </p>
                    ) : (
                      <p className="mt-1 text-sm leading-relaxed text-dc-text-2">Ulasan muncul setelah booking pertamamu selesai dan dinilai client.</p>
                    )}
                  </Card>
                )}
              </aside>
            </div>

            <section aria-labelledby="keamanan-akun" className="mt-14 max-w-2xl">
              <h2 id="keamanan-akun" className="font-heading text-3xl text-dc-ink">
                Keamanan akun
              </h2>
              <p className="mt-1 text-sm text-dc-text-2">Ganti kata sandi untuk masuk ke akun vendor.</p>
              <Card className="mt-4 p-5 sm:p-6">
                <PasswordSection />
              </Card>
            </section>

            {profile && (
              <NameChangeSheet
                open={nameSheet}
                onClose={() => setNameSheet(false)}
                currentName={profile.business_name}
                onRequested={() => {
                  setNameSheet(false);
                  toast.show("Permintaan ganti nama terkirim", "success");
                  loadProfile();
                }}
              />
            )}
          </>
        )}
      </div>
    </Shell>
  );
}

function FormSection({ n, title, note, children }: { n: number; title: string; note: string; children: React.ReactNode }) {
  const reduced = useReducedMotion();
  return (
    <motion.section variants={motionSafe(reduced, fadeUp)} aria-labelledby={`bagian-${n}`}>
      <Card className="p-5 sm:p-7">
        <div className="mb-5 flex gap-4">
          <span aria-hidden className="font-heading text-3xl italic leading-none text-dc-clay">
            {n}
          </span>
          <div>
            <h2 id={`bagian-${n}`} className="font-heading text-[1.75rem] leading-tight text-dc-ink">
              {title}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-dc-text-2">{note}</p>
          </div>
        </div>
        <div className="flex flex-col gap-4">{children}</div>
      </Card>
    </motion.section>
  );
}

function SaveHint({ dirty }: { dirty: boolean }) {
  return (
    <p aria-live="polite" className="text-sm text-dc-text-2">
      {dirty ? "Ada perubahan yang belum disimpan" : "Semua perubahan tersimpan"}
    </p>
  );
}

/** Completeness meter. Every step is computed from the saved profile, the
 * form as typed, the portfolio, and the package list: no invented score. */
function Completeness({ steps, compact = false }: { steps: { label: string; done: boolean; href?: string }[]; compact?: boolean }) {
  const reduced = useReducedMotion();
  const done = steps.filter((s) => s.done).length;
  const pct = Math.round((done / steps.length) * 100);
  const complete = done === steps.length;

  return (
    <Card className={compact ? "p-5" : "p-6"}>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-dc-ink">Kelengkapan etalase</p>
          <p className="mt-0.5 text-sm text-dc-text-2">
            {done} dari {steps.length} langkah
          </p>
        </div>
        <p className="text-[2.6rem] font-bold leading-none tracking-tight tabular-nums text-dc-ink">
          {pct}
          <span className="ml-0.5 text-xl font-semibold text-dc-clay">%</span>
        </p>
      </div>
      <div
        role="progressbar"
        aria-label="Kelengkapan etalase"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className="mt-4 h-2 overflow-hidden rounded-full bg-dc-cream"
      >
        {/* The bar fills as the vendor types: feedback that each field counts. */}
        <motion.div
          className="h-full rounded-full bg-dc-gold"
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={reduced ? { duration: 0 } : { duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
      {complete ? (
        <div className="mt-4 flex items-center gap-4">
          {/* Milestone: the two rings draw themselves once, the brand's way of saying "lengkap". */}
          <svg aria-hidden viewBox="0 0 64 40" fill="none" className="h-10 w-16 shrink-0 text-dc-gold">
            {[24, 40].map((cx, i) => (
              <motion.circle
                key={cx}
                cx={cx}
                cy="20"
                r="15"
                stroke="currentColor"
                strokeWidth="1.6"
                initial={reduced ? false : { pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.9, delay: 0.15 * i, ease: [0.16, 1, 0.3, 1] }}
              />
            ))}
          </svg>
          <p className="text-sm leading-relaxed text-dc-success">Etalasemu lengkap. Calon pengantin punya semua yang mereka perlu untuk menghubungimu.</p>
        </div>
      ) : (
        <ul className={`mt-4 grid gap-1 ${compact ? "sm:grid-cols-2" : ""}`}>
          {steps.map((s) => (
            <li key={s.label} className="flex min-h-9 items-center gap-2.5 text-sm">
              <span
                aria-hidden
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${s.done ? "bg-dc-success text-white" : "border border-dc-line-strong"}`}
              >
                {s.done && <CheckIcon className="h-3 w-3" />}
              </span>
              <span className="sr-only">{s.done ? "Sudah: " : "Belum: "}</span>
              {!s.done && s.href ? (
                <Link href={s.href} className="inline-flex min-h-11 items-center font-semibold text-dc-clay underline underline-offset-4 hover:text-dc-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold">
                  {s.label}
                </Link>
              ) : (
                <span className={s.done ? "text-dc-text-2" : "text-dc-ink"}>{s.label}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function NameChangeSheet({
  open,
  onClose,
  currentName,
  onRequested,
}: {
  open: boolean;
  onClose: () => void;
  currentName: string;
  onRequested: () => void;
}) {
  const [requestedName, setRequestedName] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<{ name?: string; reason?: string }>({});
  const nameFormRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    const v: { name?: string; reason?: string } = {};
    if (!requestedName.trim()) v.name = "Tulis nama baru yang kamu inginkan.";
    else if (requestedName.trim() === currentName) v.name = "Nama baru masih sama dengan nama sekarang.";
    if (!reason.trim()) v.reason = "Ceritakan singkat alasannya, supaya tim bisa meninjau lebih cepat.";
    setErrors(v);
    if (Object.keys(v).length) {
      requestAnimationFrame(() => nameFormRef.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus());
      return;
    }
    setSaving(true);
    try {
      await apiPost("/api/v1/vendor/profile/name-change", { requested_name: requestedName, reason });
      setRequestedName("");
      setReason("");
      onRequested();
    } catch (err) {
      setError(friendlyError(err, "Permintaan belum terkirim. Coba lagi sebentar lagi."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Ajukan ganti nama"
      description="Perubahan nama usaha ditinjau tim DuaCincin lebih dulu. Sampai disetujui, nama lama tetap tampil."
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose}>
            Batal
          </Button>
          <Button onClick={() => handleSubmit()} loading={saving}>
            Kirim untuk ditinjau
          </Button>
        </div>
      }
    >
      <form ref={nameFormRef} onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <div className="rounded-lg bg-dc-cream px-4 py-3">
          <p className="text-sm text-dc-text-2">Nama sekarang</p>
          <p className="font-heading text-xl text-dc-ink">{currentName}</p>
        </div>
        <Input label="Nama usaha baru" value={requestedName} onChange={(e) => setRequestedName(e.target.value)} error={errors.name} />
        <Textarea label="Alasan perubahan" value={reason} onChange={(e) => setReason(e.target.value)} error={errors.reason} rows={3} placeholder="Contoh: usaha kami berganti nama sejak bergabung dengan sanggar baru." />
        {error && (
          <p role="alert" className="text-sm text-dc-danger">
            {error}
          </p>
        )}
        <button type="submit" hidden />
      </form>
    </Sheet>
  );
}

function ProfileSkeleton() {
  return (
    <SkeletonGroup label="Memuat profil">
      <Skeleton className="h-12 w-2/3 max-w-md" />
      <Skeleton className="mt-3 h-5 w-full max-w-xl" />
      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-6">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
        <div className="flex flex-col gap-6">
          <Skeleton className="h-44 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    </SkeletonGroup>
  );
}
