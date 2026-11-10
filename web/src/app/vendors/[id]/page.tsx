"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";

import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";
import { Reveal } from "@/components/landing/Reveal";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { GlowPanel } from "@/components/ui/GlowPanel";
import { Skeleton, SkeletonGroup, SkeletonText } from "@/components/ui/Skeleton";
import { TabPanel, Tabs } from "@/components/ui/Tabs";
import { REVIEW_SOURCE_NOTE, ReviewList, ReviewSummary, Stars } from "@/components/vendor/Reviews";
import {
  apiGet,
  apiPost,
  ApiError,
  categoryLabel,
  type Booking,
  type Conversation,
  type CurrentUser,
  type Review,
  type VendorPackage,
  type VendorProfile,
} from "@/lib/api";
import { blurReveal, fadeUp, motionSafe, useReducedMotion } from "@/lib/motion";
import { citySlug } from "@/lib/server-api";

import { BookingCard, BookingSheet, EscrowSteps, MobileActionBar } from "./_ui/Booking";
import { Gallery, Lightbox, PortfolioGrid } from "./_ui/Gallery";
import { PackageCards } from "./_ui/Packages";

type Load = "loading" | "ok" | "error";
type Tab = "portofolio" | "paket" | "ulasan";

export default function VendorDetailPage({ params }: PageProps<"/vendors/[id]">) {
  const { id } = use(params);
  const router = useRouter();
  const reduced = useReducedMotion();

  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [packages, setPackages] = useState<VendorPackage[]>([]);
  const [pkgLoad, setPkgLoad] = useState<Load>("loading");
  const [revLoad, setRevLoad] = useState<Load>("loading");
  // Vendor profiles are public (see engineering.md). Chat and booking still
  // need a Client account, so we check the session without redirecting
  // an anonymous visitor away from the profile itself.
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [checkingUser, setCheckingUser] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [eventDate, setEventDateRaw] = useState("");
  const [dateError, setDateError] = useState<string | null>(null);
  const [packageDescription, setPackageDescription] = useState("");
  const [agreedPrice, setAgreedPrice] = useState("");
  const [bookingSaving, setBookingSaving] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>("paket");
  const [reloadKey, setReloadKey] = useState(0);
  const [pkgKey, setPkgKey] = useState(0);
  const [revKey, setRevKey] = useState(0);

  useEffect(() => {
    apiGet<VendorProfile>(`/api/v1/vendors/${id}`)
      .then(setProfile)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Vendor tidak ditemukan."));
  }, [id, reloadKey]);

  useEffect(() => {
    apiGet<VendorPackage[]>(`/api/v1/vendors/${id}/packages`)
      .then((d) => {
        setPackages(d ?? []);
        setPkgLoad("ok");
      })
      .catch(() => setPkgLoad("error"));
  }, [id, reloadKey, pkgKey]);

  useEffect(() => {
    apiGet<Review[]>(`/api/v1/vendors/${id}/reviews`)
      .then((d) => {
        setReviews(d ?? []);
        setRevLoad("ok");
      })
      .catch(() => setRevLoad("error"));
  }, [id, reloadKey, revKey]);

  useEffect(() => {
    apiGet<CurrentUser>("/api/v1/auth/me")
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setCheckingUser(false));
  }, []);

  function retryLoad() {
    setError(null);
    setPkgLoad("loading");
    setRevLoad("loading");
    setReloadKey((k) => k + 1);
  }

  async function handleStartChat() {
    setStarting(true);
    try {
      const conv = await apiPost<Conversation>(`/api/v1/conversations/vendor/${id}`, {});
      router.push(`/client/messages/${conv.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memulai chat.");
      setStarting(false);
    }
  }

  function setEventDate(v: string) {
    setEventDateRaw(v);
    if (v) setDateError(null);
  }

  async function handleSubmitBooking(e: React.FormEvent) {
    e.preventDefault();
    // The calendar is a custom control, so the browser cannot enforce
    // "required" on it: check here and point at the field.
    if (!eventDate) {
      setDateError("Pilih tanggal acara dulu.");
      document.querySelector<HTMLButtonElement>("#booking-form button[aria-expanded]")?.focus();
      return;
    }
    setBookingSaving(true);
    setError(null);
    try {
      const booking = await apiPost<Booking>("/api/v1/bookings", {
        vendor_id: id,
        event_date: eventDate,
        package_description: packageDescription,
        agreed_price: Number(agreedPrice) || 0,
      });
      router.push(`/client/bookings/${booking.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal mengajukan booking.");
      setBookingSaving(false);
    }
  }

  function fillPackage(p: VendorPackage) {
    setPackageDescription(p.name);
    setAgreedPrice(p.price > 0 ? String(p.price) : "");
  }

  function choosePackage(p: VendorPackage) {
    fillPackage(p);
    setSheetOpen(true);
  }

  function clearPackage() {
    setPackageDescription("");
    setAgreedPrice("");
  }

  function openTab(t: Tab) {
    setTab(t);
    document.getElementById("detail-vendor")?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  }

  const isClient = user?.role === "client";
  const portfolio = profile?.portfolio ?? [];
  const selected = packages.find((p) => p.name === packageDescription) ?? null;

  const actions = {
    isClient,
    checkingUser,
    starting,
    onChat: handleStartChat,
    onBook: () => setSheetOpen(true),
  };

  return (
    <div className="flex min-h-screen flex-col bg-dc-ivory">
      <Navbar />
      <main id="konten" className="flex-1 pb-28 lg:pb-0">
        <div className="dc-container pb-20 pt-5 lg:pt-8">
          {error && !profile ? (
            <div className="mt-10">
              <ErrorState title="Profil vendor belum bisa dibuka" body={error} onRetry={retryLoad} />
              <div className="mt-4 flex justify-center">
                <ButtonLink href="/vendors" variant="quiet" size="sm">
                  Lihat vendor lain
                </ButtonLink>
              </div>
            </div>
          ) : !profile ? (
            <DetailSkeleton />
          ) : (
            <>
              <nav aria-label="Lokasi halaman" className="text-sm text-dc-text-2">
                <ol className="flex flex-wrap items-center gap-x-1">
                  <li>
                    <Link href="/vendors" className="inline-flex min-h-11 items-center rounded-md px-1 hover:text-dc-ink hover:underline focus-visible:outline-2 focus-visible:outline-dc-gold">
                      Vendor
                    </Link>
                  </li>
                  <li aria-hidden className="text-dc-text-3">/</li>
                  <li>
                    <Link
                      href={`/kategori/${profile.category}`}
                      className="inline-flex min-h-11 items-center rounded-md px-1 hover:text-dc-ink hover:underline focus-visible:outline-2 focus-visible:outline-dc-gold"
                    >
                      {categoryLabel(profile.category)}
                    </Link>
                  </li>
                  <li aria-hidden className="text-dc-text-3">/</li>
                  <li aria-current="page" className="min-w-0 truncate px-1 font-semibold text-dc-ink">
                    {profile.business_name}
                  </li>
                </ol>
              </nav>

              {/* Arrival: the name settles out of a light blur, the page's one entrance. */}
              <motion.header className="mt-2 sm:mt-4" variants={motionSafe(reduced, blurReveal)} initial="hidden" animate="visible">
                <p className="dc-eyebrow">
                  {categoryLabel(profile.category)}
                  {profile.city ? ` di ${profile.city}` : ""}
                </p>
                <h1 className="font-heading mt-3 max-w-4xl break-words text-[2.6rem] leading-[1.02] text-dc-ink sm:text-6xl lg:text-7xl">{profile.business_name}</h1>
                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
                  {profile.review_count > 0 ? (
                    <button
                      type="button"
                      onClick={() => openTab("ulasan")}
                      className="-ml-1 inline-flex min-h-11 items-center gap-2 rounded-md px-1 text-dc-ink focus-visible:outline-2 focus-visible:outline-dc-gold"
                    >
                      <Stars rating={profile.average_rating} />
                      <span className="font-bold tabular-nums">{profile.average_rating.toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                      <span className="text-sm text-dc-text-2 underline underline-offset-4">{profile.review_count} ulasan</span>
                    </button>
                  ) : (
                    <span className="inline-flex min-h-11 items-center text-sm text-dc-text-2">Belum ada ulasan</span>
                  )}
                  {profile.status === "approved" && (
                    <Badge tone="success">
                      <svg aria-hidden width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10 2.5 16 5v4.6c0 3.6-2.5 6.4-6 7.9-3.5-1.5-6-4.3-6-7.9V5z" />
                        <path d="m7.2 10 2 2 3.6-3.8" />
                      </svg>
                      Terverifikasi DuaCincin
                    </Badge>
                  )}
                  {profile.city && (
                    <Link
                      href={`/kategori/${profile.category}/${citySlug(profile.city)}`}
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-1 text-sm text-dc-text-2 hover:text-dc-ink hover:underline focus-visible:outline-2 focus-visible:outline-dc-gold"
                    >
                      <svg aria-hidden width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7">
                        <path d="M10 18s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z" />
                        <circle cx="10" cy="8" r="2.2" />
                      </svg>
                      {profile.city}
                    </Link>
                  )}
                </div>
              </motion.header>

              <div className="mt-6 sm:mt-8">
                {portfolio.length > 0 ? (
                  <Gallery items={portfolio} onOpen={setLightbox} />
                ) : (
                  <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-dc-line-strong bg-dc-cream/60 px-6 text-center">
                    <p className="font-heading text-2xl text-dc-ink">Foto portofolio belum diunggah</p>
                    <p className="mt-1 max-w-sm text-sm text-dc-text-2">Minta contoh hasil kerja lewat chat dengan vendor.</p>
                  </div>
                )}
              </div>

              <div className="mt-10 grid gap-10 lg:mt-14 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-14">
                <div className="min-w-0">
                  <section aria-labelledby="tentang">
                    <h2 id="tentang" className="font-heading text-[2.1rem] leading-tight text-dc-ink sm:text-[2.5rem]">
                      Tentang <span className="dc-em">{profile.business_name}</span>
                    </h2>
                    <p className="mt-4 max-w-2xl whitespace-pre-line break-words text-[1.02rem] leading-relaxed text-dc-text-2">
                      {profile.description || "Vendor belum menambahkan deskripsi. Tanyakan detail layanan lewat chat."}
                    </p>
                  </section>

                  <div className="mt-8 lg:hidden">
                    <BookingCard
                      profile={profile}
                      {...actions}
                      eventDate={eventDate}
                      setEventDate={setEventDate}
                      selected={selected}
                      onClearPackage={clearPackage}
                      onSeePackages={() => openTab("paket")}
                      error={sheetOpen ? null : error}
                    />
                  </div>

                  <section id="detail-vendor" aria-label="Portofolio, paket, dan ulasan" className="mt-12 scroll-mt-24">
                    <Tabs
                      label="Detail vendor"
                      idBase="vendor"
                      value={tab}
                      onChange={(t) => setTab(t as Tab)}
                      items={[
                        { id: "portofolio", label: "Portofolio", count: portfolio.length },
                        { id: "paket", label: "Paket", count: pkgLoad === "ok" ? packages.length : undefined },
                        { id: "ulasan", label: "Ulasan", count: revLoad === "ok" ? reviews.length : undefined },
                      ]}
                    />

                    <TabPanel idBase="vendor" id="portofolio" value={tab} className="mt-6">
                      {portfolio.length > 0 ? (
                        <PortfolioGrid items={portfolio} onOpen={setLightbox} />
                      ) : (
                        <EmptyState title="Belum ada foto" body="Vendor ini belum mengunggah portofolio. Kamu bisa meminta contoh hasil kerja lewat chat." />
                      )}
                    </TabPanel>

                    <TabPanel idBase="vendor" id="paket" value={tab} className="mt-6">
                      {pkgLoad === "loading" ? (
                        <SkeletonGroup label="Memuat paket" className="grid gap-4 sm:grid-cols-2">
                          <Skeleton className="h-56 rounded-xl" />
                          <Skeleton className="h-56 rounded-xl" />
                        </SkeletonGroup>
                      ) : pkgLoad === "error" ? (
                        <ErrorState
                          compact
                          title="Paket belum bisa dimuat"
                          onRetry={() => {
                            setPkgLoad("loading");
                            setPkgKey((k) => k + 1);
                          }}
                        />
                      ) : packages.length === 0 ? (
                        <EmptyState title="Belum ada paket tertulis" body={`Harga ${profile.business_name} disesuaikan dengan kebutuhanmu. Tanyakan lewat chat.`} />
                      ) : (
                        <>
                          <p className="mb-4 text-sm text-dc-text-2">Harga final tetap disepakati lewat chat. Memilih paket hanya mengisi form booking.</p>
                          <PackageCards packages={packages} selectedId={selected?.id ?? null} isClient={isClient} onChoose={choosePackage} />
                        </>
                      )}
                    </TabPanel>

                    <TabPanel idBase="vendor" id="ulasan" value={tab} className="mt-6">
                      {revLoad === "loading" ? (
                        <SkeletonGroup label="Memuat ulasan" className="grid gap-3">
                          <Skeleton className="h-40 rounded-xl" />
                          <SkeletonText lines={3} />
                        </SkeletonGroup>
                      ) : revLoad === "error" ? (
                        <ErrorState
                          compact
                          title="Ulasan belum bisa dimuat"
                          onRetry={() => {
                            setRevLoad("loading");
                            setRevKey((k) => k + 1);
                          }}
                        />
                      ) : reviews.length === 0 ? (
                        <EmptyState title="Belum ada ulasan" body="Ulasan muncul setelah client menyelesaikan booking dengan vendor ini lewat DuaCincin." />
                      ) : (
                        <motion.div variants={motionSafe(reduced, fadeUp)} initial="hidden" animate="visible">
                          <ReviewSummary reviews={reviews} />
                          <p className="mt-4 flex items-start gap-2 text-sm leading-relaxed text-dc-text-2">
                            <svg aria-hidden width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-dc-success">
                              <path d="M10 2.5 16 5v4.6c0 3.6-2.5 6.4-6 7.9-3.5-1.5-6-4.3-6-7.9V5z" />
                              <path d="m7.2 10 2 2 3.6-3.8" />
                            </svg>
                            {REVIEW_SOURCE_NOTE}
                          </p>
                          <div className="mt-6">
                            <ReviewList reviews={reviews} initial={6} />
                          </div>
                        </motion.div>
                      )}
                    </TabPanel>
                  </section>

                  <Reveal className="mt-16">
                    <GlowPanel
                      title={
                        <>
                          Kenapa booking <span className="dc-em-light">lewat DuaCincin</span>
                        </>
                      }
                      subtitle="Semua chat, kesepakatan, dan pembayaran tercatat di satu tempat, jadi ada bukti bila terjadi masalah."
                    >
                      <div className="mt-7 grid gap-8 md:grid-cols-2">
                        <div>
                          <p className="mb-4 text-sm font-semibold text-dc-gold-antique">Alur dana escrow</p>
                          <EscrowSteps tone="ink" />
                        </div>
                        <ul className="grid content-start gap-5">
                          <li>
                            <p className="font-semibold text-dc-on-dark">Ulasan hanya dari booking selesai</p>
                            <p className="mt-1 text-sm leading-relaxed text-dc-on-dark/80">Tidak ada yang bisa menulis ulasan tanpa menyelesaikan booking lewat DuaCincin.</p>
                          </li>
                          <li>
                            <p className="font-semibold text-dc-on-dark">Didampingi Wedding Consultant</p>
                            <p className="mt-1 text-sm leading-relaxed text-dc-on-dark/80">Masih ragu memilih? Tim DuaCincin membantu lewat chat konsultasi sampai hari H.</p>
                            <ButtonLink href="/client/consultation" variant="ghostLight" size="sm" className="mt-3">
                              Chat Wedding Consultant
                            </ButtonLink>
                          </li>
                        </ul>
                      </div>
                    </GlowPanel>
                  </Reveal>
                </div>

                <aside aria-label="Chat dan booking" className="hidden lg:block">
                  <div className="sticky top-24">
                    <BookingCard
                      profile={profile}
                      {...actions}
                      eventDate={eventDate}
                      setEventDate={setEventDate}
                      selected={selected}
                      onClearPackage={clearPackage}
                      onSeePackages={() => openTab("paket")}
                      error={sheetOpen ? null : error}
                    />
                  </div>
                </aside>
              </div>
            </>
          )}
        </div>
      </main>

      {profile && <MobileActionBar profile={profile} {...actions} />}
      <Footer />

      {isClient && (
        <BookingSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          packages={packages}
          eventDate={eventDate}
          setEventDate={setEventDate}
          packageDescription={packageDescription}
          setPackageDescription={setPackageDescription}
          agreedPrice={agreedPrice}
          setAgreedPrice={setAgreedPrice}
          onPickPackage={fillPackage}
          saving={bookingSaving}
          error={error}
          dateError={dateError}
          onSubmit={handleSubmitBooking}
        />
      )}

      {profile && lightbox !== null && portfolio[lightbox] && (
        <Lightbox items={portfolio} index={lightbox} onChange={setLightbox} onClose={() => setLightbox(null)} />
      )}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <SkeletonGroup label="Memuat profil vendor" className="pt-6">
      <Skeleton className="h-4 w-48 rounded-full" />
      <Skeleton className="mt-5 h-4 w-40 rounded-full" />
      <Skeleton className="mt-4 h-14 w-3/4 max-w-2xl rounded-xl" />
      <Skeleton className="mt-4 h-5 w-56 rounded-full" />
      <div className="mt-8 grid gap-3 md:h-[min(62vh,560px)] md:grid-cols-4 md:grid-rows-2">
        <Skeleton className="aspect-[4/5] rounded-2xl md:col-span-2 md:row-span-2 md:aspect-auto md:h-full" />
        <Skeleton className="hidden h-full rounded-xl md:block" />
        <Skeleton className="hidden h-full rounded-xl md:block" />
        <Skeleton className="hidden h-full rounded-xl md:block" />
        <Skeleton className="hidden h-full rounded-xl md:block" />
      </div>
      <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
        <SkeletonText lines={4} className="max-w-2xl" />
        <Skeleton className="hidden h-96 rounded-2xl lg:block" />
      </div>
    </SkeletonGroup>
  );
}
