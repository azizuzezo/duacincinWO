"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CheckIcon, friendlyError, RupiahInput } from "@/components/etalase/shared";
import { wdButton } from "@/components/home/ui";
import { PasswordSection } from "@/components/PasswordSection";
import { VENDOR_NAV } from "@/components/shell/navConfig";
import { AvatarEditor } from "@/components/client/AvatarEditor";
import { VendorShell } from "@/components/shell/VendorShell";
import { CityCombobox } from "@/components/ui/CityCombobox";
import { JABODETABEK } from "@/lib/wilayah";
import { useAIEnabled } from "@/lib/useAIEnabled";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Skeleton, SkeletonGroup } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { CategoryChips } from "@/components/vendor/CategoryChips";
import { EtalaseTabs } from "@/components/vendor/EtalaseTabs";
import { VendorCard } from "@/components/vendor/VendorCard";
import { WithUser } from "@/components/WithUser";
import { WhatsAppNumberCard } from "@/components/wa/WhatsAppVerify";
import {
  apiGet,
  apiPost,
  apiPut,
  ApiError,
  type CurrentUser,
  vendorCategoryList,
  type VendorPackage,
  type VendorProfile,
} from "@/lib/api";
import { EASE, useReducedMotion } from "@/lib/motion";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wd-ink";

const STATUS_LABEL: Record<VendorProfile["status"], { text: string; cls: string }> = {
  pending: { text: "Sedang ditinjau tim DuaCincin", cls: "bg-wd-accent-wash text-wd-accent-ink" },
  approved: { text: "Tampil di direktori", cls: "bg-wd-accent text-wd-ink" },
  rejected: { text: "Belum disetujui", cls: "bg-wd-blush text-wd-danger" },
};

/** A story shorter than this reads as a placeholder to couples. */
const STORY_GOAL = 120;
const PHOTO_GOAL = 3;

type FieldErrors = Partial<Record<"name" | "category" | "city" | "priceMin" | "priceMax", string>>;


export default function VendorProfilePage() {
  return (
    <WithUser allowedRoles={["vendor"]} loginPath="/login">
      {(user) => <VendorProfileContent user={user} />}
    </WithUser>
  );
}

function VendorProfileContent({ user }: { user: CurrentUser }) {
  const toast = useToast();
  const aiOn = useAIEnabled();
  const [aiBusy, setAiBusy] = useState(false);
  // What the description said before the AI draft replaced it, to undo.
  const [descBeforeAI, setDescBeforeAI] = useState<string | null>(null);
  async function writeWithAI() {
    setAiBusy(true);
    try {
      const r = await apiPost<{ draft: string }>("/api/v1/vendor/ai/describe", { notes: description });
      setDescBeforeAI(description);
      setDescription(r.draft);
    } catch (err) {
      toast.show(err instanceof Error && err.message ? err.message : "Draf belum bisa dibuat, coba lagi.", "danger");
    } finally {
      setAiBusy(false);
    }
  }
  // undefined = loading, null = no profile yet (404 is normal for a new vendor).
  const [profile, setProfile] = useState<VendorProfile | null | undefined>(undefined);
  const [packageCount, setPackageCount] = useState<number | null>(null);
  const [loadError, setLoadError] = useState(false);

  const [businessName, setBusinessName] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
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
  const [resubmitting, setResubmitting] = useState(false);

  function applyProfile(p: VendorProfile) {
    setProfile(p);
    setBusinessName(p.business_name);
    setCategories(vendorCategoryList(p));
    setCities(p.cities ?? []);
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
      ? !!(businessName || categories.length || cities.length || priceMin || priceMax || description)
      : cities.join("|") !== (profile.cities ?? []).join("|") ||
        categories.join("|") !== vendorCategoryList(profile).join("|") ||
        Number(priceMin || 0) !== profile.price_min ||
        Number(priceMax || 0) !== profile.price_max ||
        description !== profile.description);

  function validate(): FieldErrors {
    const e: FieldErrors = {};
    if (!profile && !businessName.trim()) e.name = "Tulis nama usahamu, nama ini yang dilihat calon pengantin.";
    if (categories.length === 0) e.category = "Pilih minimal satu kategori usaha.";
    if (cities.length === 0) e.city = "Pilih minimal satu kabupaten atau kota tempat usahamu melayani.";
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

  async function handleSave(e?: React.FormEvent): Promise<boolean> {
    e?.preventDefault();
    setSaveError(null);
    setSubmitted(true);
    if (Object.keys(allErrors).length) {
      // Error summary takes focus so keyboard and screen reader users land on what to fix.
      requestAnimationFrame(() => summaryRef.current?.focus());
      return false;
    }
    setSaving(true);
    try {
      const updated = await apiPut<VendorProfile>("/api/v1/vendor/profile", {
        business_name: profile?.business_name ?? businessName.trim(),
        categories,
        cities,
        price_min: Number(priceMin) || 0,
        price_max: Number(priceMax) || 0,
        description,
      });
      // PUT returns the profile without its portfolio; keep the photos we already have.
      applyProfile({ ...updated, portfolio: updated.portfolio ?? profile?.portfolio });
      toast.show("Profil tersimpan", "success");
      return true;
    } catch (err) {
      setSaveError(friendlyError(err, "Profil belum tersimpan. Periksa koneksi internetmu, lalu coba lagi."));
      return false;
    } finally {
      setSaving(false);
    }
  }

  /** A rejected profile goes back to review. Unsaved edits are saved first, so the team reviews what is on screen. */
  async function resubmit() {
    if (resubmitting || saving) return;
    if (dirty && !(await handleSave())) return;
    setResubmitting(true);
    try {
      const updated = await apiPost<VendorProfile>("/api/v1/vendor/profile/resubmit", {});
      applyProfile({ ...updated, portfolio: updated.portfolio ?? profile?.portfolio });
      toast.show("Pengajuan dikirim ulang. Tim DuaCincin akan meninjaunya lagi.", "success");
    } catch (err) {
      toast.show(friendlyError(err, "Pengajuan belum terkirim. Coba lagi sebentar."), "danger");
    } finally {
      setResubmitting(false);
    }
  }

  const photos = profile?.portfolio ?? [];
  const steps = useMemo(() => {
    const list: { label: string; done: boolean; href?: string }[] = [
      { label: "Nama usaha", done: !!(profile?.business_name || businessName.trim()) },
      { label: "Kabupaten/kota", done: cities.length > 0 },
      { label: "Nomor WhatsApp terverifikasi", done: !!profile?.whatsapp_number },
      { label: "Harga mulai dari", done: Number(priceMin || 0) > 0 },
      { label: `Cerita usaha minimal ${STORY_GOAL} huruf`, done: [...description.trim()].length >= STORY_GOAL },
      { label: `Minimal ${PHOTO_GOAL} foto portofolio`, done: photos.length >= PHOTO_GOAL, href: "/vendor/portfolio" },
    ];
    if (packageCount !== null) list.push({ label: "Minimal 1 paket harga", done: packageCount > 0, href: "/vendor/paket" });
    return list;
  }, [profile, businessName, cities, priceMin, description, photos.length, packageCount]);

  const loading = profile === undefined && !loadError;

  const statusPill = profile ? STATUS_LABEL[profile.status] : null;
  const showBar = !loading && !loadError && dirty;
  const saveLabel = profile ? "Simpan perubahan" : "Simpan profil";

  return (
    <VendorShell user={user} navItems={VENDOR_NAV} tone="wd" loginPath="/login" eyebrow="Vendor">
      <div className="wd-container pb-28 pt-8 sm:pt-10">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div className="min-w-0">
            <p className="wd-kicker">Etalase</p>
            <h1 className="wd-display mt-2 break-words text-[clamp(2.1rem,4.4vw,3.4rem)] leading-[1.05]">
              {profile ? (
                profile.business_name
              ) : (
                <>
                  Buka <em>etalase</em> usahamu
                </>
              )}
            </h1>
          </div>
          {statusPill && <span className={`rounded-full px-3.5 py-1.5 text-[0.82rem] font-semibold ${statusPill.cls}`}>{statusPill.text}</span>}
        </div>

        <EtalaseTabs publicId={profile?.status === "approved" ? user.id : undefined} status={profile?.status ?? null} />

        <div className="mt-8">
          {loadError ? (
            <ErrorState title="Profil belum bisa dimuat" onRetry={loadProfile} />
          ) : loading ? (
            <ProfileSkeleton />
          ) : (
            <>
              <p className="max-w-2xl text-[0.95rem] leading-relaxed text-wd-text">
                {profile
                  ? "Ini yang dibaca calon pengantin sebelum menghubungimu. Lengkapi, lalu lihat pratinjaunya."
                  : "Isi profil usahamu. Setelah ditinjau tim DuaCincin, etalasemu tampil di direktori dan bisa menerima booking."}
              </p>

              {profile?.status === "rejected" && (
                <section aria-labelledby="ditolak" className="mt-5 rounded-[24px] bg-wd-accent-wash p-5 ring-2 ring-wd-accent sm:p-6">
                  <h2 id="ditolak" className="wd-display text-[1.5rem] leading-tight">
                    Profilmu belum disetujui
                  </h2>
                  <p role="alert" className="mt-1.5 text-[0.95rem] leading-relaxed text-wd-text">
                    {profile.rejection_reason ? (
                      <>
                        Catatan dari tim: <span className="font-semibold text-wd-ink">{profile.rejection_reason}</span>
                      </>
                    ) : (
                      "Tim DuaCincin belum menyetujui profil ini."
                    )}
                  </p>
                  <ol className="mt-3 list-inside list-decimal text-sm leading-relaxed text-wd-text">
                    <li>Perbaiki data di bawah sesuai catatan, atau tambah foto dan paket.</li>
                    <li>Tekan Ajukan ulang. Perubahan yang belum disimpan ikut tersimpan.</li>
                    <li>Tim meninjau lagi. Begitu disetujui, etalasemu tampil di direktori.</li>
                  </ol>
                  <button type="button" onClick={() => void resubmit()} disabled={resubmitting || saving} aria-busy={resubmitting} className={`${wdButton({ variant: "gold", size: "md" })} mt-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wd-ink`}>
                    {resubmitting ? "Mengirim..." : dirty ? "Simpan dan ajukan ulang" : "Ajukan ulang"}
                  </button>
                </section>
              )}

              {/* Mobile: the meter leads so the vendor sees what is missing before scrolling the form. */}
              <div className="mt-6 lg:hidden">
                <Completeness steps={steps} />
              </div>

              <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-14">
                <form id="profile-form" onSubmit={handleSave} noValidate className="flex min-w-0 flex-col">
                  <FormSection n={1} title="Usaha" note="Nama usaha yang dilihat calon pengantin.">
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                      <AvatarEditor user={user} />
                      <p className="max-w-xs text-sm leading-relaxed text-wd-text">Foto profil tampil di pojok akunmu di Pusat vendor. Pakai foto yang jelas, bisa wajahmu atau logo usahamu.</p>
                    </div>
                    {profile ? (
                      <div className="rounded-[20px] bg-wd-paper px-5 py-4">
                        <p className="text-sm text-wd-muted">Nama usaha</p>
                        <p className="wd-display text-2xl leading-tight break-words">{profile.business_name}</p>
                        {profile.pending_name_change?.status === "pending" ? (
                          <p className="mt-2 text-sm leading-relaxed text-wd-text">
                            Permintaan ganti nama menjadi <span className="font-semibold text-wd-ink">&ldquo;{profile.pending_name_change.requested_name}&rdquo;</span> sedang ditinjau tim DuaCincin.
                          </p>
                        ) : (
                          <button type="button" onClick={() => setNameSheet(true)} className={`mt-1 -ml-3 inline-flex min-h-11 items-center rounded-full px-3 text-sm font-semibold text-wd-ink underline underline-offset-4 hover:bg-white ${FOCUS}`}>
                            Ajukan ganti nama
                          </button>
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
                  </FormSection>

                  <FormSection n={2} title="Kategori dan kota" note="Menentukan di mana kamu muncul saat calon pengantin mencari.">
                    <div id="f-category">
                      <CategoryChips values={categories} onChange={setCategories} error={errors.category} />
                    </div>
                    <CityCombobox
                      id="f-city"
                      label="Kabupaten/kota layanan"
                      values={cities}
                      onChange={setCities}
                      onBlur={blur("city")}
                      error={errors.city}
                      legacy={profile && (profile.cities ?? []).length === 0 && cities.length === 0 ? profile.city : null}
                      hint="Pilih semua kabupaten/kota yang kamu layani (maksimal 20), misalnya Bandung dan Sumedang. Melayani seluruh Jabodetabek? Pilih Jabodetabek di atas: dihitung 1 lokasi, dan calon pengantin yang mencari di salah satu dari 13 kotanya tetap menemukanmu."
                      groups={[{ name: "Jabodetabek", cities: JABODETABEK }]}
                    />
                  </FormSection>

                  <FormSection n={3} title="Harga" note="Isi hargamu sendiri. Client membayar harga itu ditambah biaya layanan 10%. Rincian per paket diatur di tab Paket.">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <RupiahInput id="f-pricemin" label="Harga mulai dari (Rp)" value={priceMin} onChange={setPriceMin} error={errors.priceMin} hint="Kosongkan bila harga dibahas lewat chat." />
                      <RupiahInput id="f-pricemax" label="Harga tertinggi (Rp)" value={priceMax} onChange={setPriceMax} onBlur={blur("priceMax")} error={errors.priceMax} />
                    </div>
                  </FormSection>

                  <FormSection n={4} title="Deskripsi" note="Ceritakan gaya, pengalaman, dan apa yang membuat hasil kerjamu berbeda.">
                    <Textarea
                      label="Deskripsi"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={6}
                      optional
                      placeholder="Contoh: Kami merias pengantin adat Jawa sejak 2012. Tim kami membawa busana dan aksesori sendiri."
                      hint={
                        <span className="flex justify-between gap-3">
                          <span>{[...description.trim()].length >= STORY_GOAL ? "Cukup untuk membuat calon pengantin mengenalmu." : `Usahakan minimal ${STORY_GOAL} huruf.`}</span>
                          <span className="tabular-nums">{[...description.trim()].length} huruf</span>
                        </span>
                      }
                    />
                    {aiOn && (
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <button type="button" onClick={writeWithAI} disabled={aiBusy} aria-busy={aiBusy} className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold text-wd-ink underline underline-offset-4 hover:bg-wd-paper disabled:opacity-60 ${FOCUS}`}>
                          {aiBusy ? "Menulis..." : description.trim() ? "Rapikan dengan AI" : "Bantu tulis dengan AI"}
                        </button>
                        {descBeforeAI !== null && (
                          <button
                            type="button"
                            onClick={() => {
                              setDescription(descBeforeAI);
                              setDescBeforeAI(null);
                            }}
                            className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold text-wd-ink underline underline-offset-4 hover:bg-wd-paper ${FOCUS}`}
                          >
                            Kembalikan tulisanku
                          </button>
                        )}
                        <p className="text-xs text-wd-muted">Draf memakai data profil yang sudah tersimpan dan tulisanmu di atas. Periksa dulu sebelum menyimpan.</p>
                      </div>
                    )}
                  </FormSection>

                  <FormSection n={5} title="WhatsApp" note="Dipakai untuk pemberitahuan booking.">
                    {/* Changed only by verifying a new number over WhatsApp. */}
                    <WhatsAppNumberCard />
                  </FormSection>

                  {showSummary && (
                    <div ref={summaryRef} tabIndex={-1} role="group" aria-labelledby="ringkasan-galat" className={`mt-6 rounded-[20px] bg-wd-blush px-5 py-4 ${FOCUS}`}>
                      <p id="ringkasan-galat" className="text-sm font-semibold text-wd-danger">
                        Profil belum tersimpan. Lengkapi dulu:
                      </p>
                      <ul className="mt-1 list-disc pl-5 text-sm text-wd-danger">
                        {(Object.entries(allErrors) as [keyof FieldErrors, string][]).map(([k, msg]) => (
                          <li key={k}>
                            <a href={`#f-${k.toLowerCase()}`} className={`inline-flex min-h-11 items-center underline underline-offset-4 ${FOCUS}`}>
                              {msg}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {saveError && !showBar && (
                    <p role="alert" className="mt-6 rounded-[20px] bg-wd-blush px-5 py-4 text-sm text-wd-danger">
                      {saveError}
                    </p>
                  )}
                </form>

                <aside aria-label="Pratinjau etalase" className="flex min-w-0 flex-col gap-8 lg:sticky lg:top-24 lg:self-start">
                  <div className="hidden lg:block">
                    <Completeness steps={steps} />
                  </div>
                  <div>
                    <p className="mb-3 text-sm font-semibold text-wd-ink">Begini tampilnya di marketplace</p>
                    {/* The real directory card, fed by the form as you type. Inert: it is a picture, not a link. */}
                    <div inert className="select-none">
                      <VendorCard
                        card={{
                          id: user.id,
                          business_name: profile?.business_name || businessName.trim() || "Nama usahamu",
                          category: categories[0] ?? "",
                          categories,
                          city: cities.join(", ") || "Kotamu",
                          price_min: Number(priceMin || 0),
                          price_max: Number(priceMax || 0),
                          sample_image: photos[0]?.url,
                          average_rating: profile?.average_rating ?? 0,
                          review_count: profile?.review_count ?? 0,
                        }}
                      />
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-wd-text">
                      {photos.length > 0 ? "Foto sampul diambil dari foto pertama di portofoliomu. " : "Kartu tanpa foto jarang dibuka. "}
                      <Link href="/vendor/portfolio" className={`inline-flex min-h-11 items-center font-semibold text-wd-ink underline underline-offset-4 ${FOCUS}`}>
                        {photos.length > 0 ? "Atur portofolio" : "Unggah foto pertama"}
                      </Link>
                    </p>
                  </div>
                  {profile && (
                    <div className="border-t border-wd-line pt-5">
                      <p className="text-sm font-semibold text-wd-ink">Ulasan</p>
                      {profile.review_count > 0 ? (
                        <p className="mt-1 flex items-baseline gap-2">
                          <span className="text-[2rem] font-bold leading-none tabular-nums text-wd-ink">{profile.average_rating.toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                          <span className="text-sm text-wd-text">dari {profile.review_count} ulasan client</span>
                        </p>
                      ) : (
                        <p className="mt-1 text-sm leading-relaxed text-wd-text">Ulasan muncul setelah booking pertamamu selesai dan dinilai client.</p>
                      )}
                    </div>
                  )}
                </aside>
              </div>

              <section aria-labelledby="keamanan-akun" className="mt-14 max-w-2xl border-t border-wd-line pt-8">
                <h2 id="keamanan-akun" className="wd-title text-[1.2rem]">
                  Keamanan akun
                </h2>
                <p className="mt-1 text-sm text-wd-text">Ganti kata sandi untuk masuk ke akun vendor.</p>
                <div className="mt-4">
                  <PasswordSection />
                </div>
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
      </div>

      {/* Floating save bar: appears only when something changed. */}
      {showBar && (
        <div className="fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-40 px-3 md:bottom-[calc(1rem+env(safe-area-inset-bottom))] md:px-6">
          <div role="region" aria-label="Simpan perubahan" className="mx-auto flex max-w-3xl animate-fade-up flex-wrap items-center justify-between gap-3 rounded-[22px] bg-white px-5 py-3 shadow-wd-pop ring-1 ring-wd-line">
            <div className="min-w-0">
              <p className="font-semibold text-wd-ink">Perubahan belum disimpan</p>
              {saveError ? (
                <p role="alert" className="text-sm text-wd-danger">
                  {saveError}
                </p>
              ) : (
                <p className="text-sm text-wd-text">Simpan supaya etalasemu diperbarui.</p>
              )}
            </div>
            <div className="flex gap-2">
              {profile && (
                <button
                  type="button"
                  onClick={() => {
                    applyProfile(profile);
                    setSaveError(null);
                    setSubmitted(false);
                    setTouched({});
                  }}
                  className={`${wdButton({ variant: "outline", size: "sm" })} ${FOCUS}`}
                >
                  Batalkan
                </button>
              )}
              <button type="submit" form="profile-form" disabled={saving} aria-busy={saving} className={`${wdButton({ variant: "ink", size: "sm" })} ${FOCUS}`}>
                {saving ? "Menyimpan..." : saveLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </VendorShell>
  );
}

function FormSection({ n, title, note, children }: { n: number; title: string; note: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`bagian-${n}`} className="border-t border-wd-line py-7 first:border-t-0 first:pt-0">
      <h2 id={`bagian-${n}`} className="wd-title text-[1.2rem] leading-tight">
        {title}
      </h2>
      <p className="mt-1 max-w-xl text-sm leading-relaxed text-wd-text">{note}</p>
      <div className="mt-5 flex flex-col gap-4">{children}</div>
    </section>
  );
}

/** Completeness meter. Every step is computed from the saved profile, the
 * form as typed, the portfolio, and the package list: no invented score. */
function Completeness({ steps }: { steps: { label: string; done: boolean; href?: string }[] }) {
  const reduced = useReducedMotion();
  const done = steps.filter((s) => s.done).length;
  const pct = Math.round((done / steps.length) * 100);
  const complete = done === steps.length;

  return (
    <section aria-label="Kelengkapan etalase" className="rounded-[24px] bg-wd-accent-wash p-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-wd-ink">Kelengkapan etalase</p>
          <p className="mt-0.5 text-sm text-wd-text">
            {done} dari {steps.length} langkah
          </p>
        </div>
        <p className="wd-display text-[2.4rem] leading-none tabular-nums">
          {pct}
          <span className="text-xl">%</span>
        </p>
      </div>
      <div role="progressbar" aria-label="Kelengkapan etalase" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} className="mt-4 h-1.5 overflow-hidden rounded-full bg-white">
        <motion.div className="h-full rounded-full bg-wd-ink" initial={false} animate={{ width: `${pct}%` }} transition={reduced ? { duration: 0 } : { duration: 0.6, ease: EASE }} />
      </div>
      {complete ? (
        <p className="mt-4 text-sm leading-relaxed text-wd-ok">Etalasemu lengkap. Calon pengantin punya semua yang mereka perlu untuk menghubungimu.</p>
      ) : (
        <ul className="mt-3">
          {steps.map((s) => (
            <li key={s.label} className="flex min-h-9 items-center gap-2.5 text-sm">
              <span aria-hidden className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${s.done ? "bg-wd-ink text-white" : "border border-wd-accent-line bg-white"}`}>
                {s.done && <CheckIcon className="h-3 w-3" />}
              </span>
              <span className="sr-only">{s.done ? "Sudah: " : "Belum: "}</span>
              {!s.done && s.href ? (
                <Link href={s.href} className={`inline-flex min-h-11 items-center font-semibold text-wd-ink underline underline-offset-4 ${FOCUS}`}>
                  {s.label}
                </Link>
              ) : (
                <span className={s.done ? "text-wd-text" : "text-wd-ink"}>{s.label}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
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
    <Modal open={open} onClose={onClose} title="Ajukan ganti nama" description="Perubahan nama usaha ditinjau tim DuaCincin lebih dulu. Sampai disetujui, nama lama tetap tampil.">
      <form ref={nameFormRef} onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <div className="rounded-[20px] bg-wd-paper px-4 py-3">
          <p className="text-sm text-wd-muted">Nama sekarang</p>
          <p className="wd-display text-xl break-words">{currentName}</p>
        </div>
        <Input label="Nama usaha baru" value={requestedName} onChange={(e) => setRequestedName(e.target.value)} error={errors.name} />
        <Textarea label="Alasan perubahan" value={reason} onChange={(e) => setReason(e.target.value)} error={errors.reason} rows={3} placeholder="Contoh: usaha kami berganti nama sejak bergabung dengan sanggar baru." />
        {error && (
          <p role="alert" className="text-sm text-wd-danger">
            {error}
          </p>
        )}
        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className={`${wdButton({ variant: "outline", size: "sm" })} ${FOCUS}`}>
            Batal
          </button>
          <button type="submit" disabled={saving} aria-busy={saving} className={`${wdButton({ variant: "ink", size: "sm" })} ${FOCUS}`}>
            {saving ? "Mengirim..." : "Kirim untuk ditinjau"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ProfileSkeleton() {
  return (
    <SkeletonGroup label="Memuat profil">
      <Skeleton className="h-5 w-full max-w-xl" />
      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-6">
          <Skeleton className="h-28 rounded-[20px]" />
          <Skeleton className="h-40 rounded-[20px]" />
          <Skeleton className="h-32 rounded-[20px]" />
        </div>
        <div className="flex flex-col gap-6">
          <Skeleton className="h-44 rounded-[24px]" />
          <Skeleton className="h-72 rounded-[24px]" />
        </div>
      </div>
    </SkeletonGroup>
  );
}
