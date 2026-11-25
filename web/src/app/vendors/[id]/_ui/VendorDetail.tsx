"use client";

import { LayoutGroup, motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { Shield, wdButton } from "@/components/home/ui";
import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";
import { Stars } from "@/components/vendor/Reviews";
import {
  apiGet,
  apiPost,
  ApiError,
  categoryLabel,
  vendorCities,
  categoriesLabel,
  type Booking,
  type Conversation,
  type CurrentUser,
  type Review,
  type VendorPackage,
  type VendorProfile,
} from "@/lib/api";
import { fadeUp, motionSafe, SPRING_SNAPPY, useReducedMotion } from "@/lib/motion";
import { citySlug } from "@/lib/server-api";

import { BookingCard, BookingSheet, EscrowSteps, MobileActionBar } from "./Booking";
import { Gallery, Lightbox, PortfolioGrid } from "./Gallery";
import { PackageCards } from "./Packages";
import { ReviewsBlock } from "./ReviewsBlock";
import { ExpandableText } from "./Expandable";
import { ShareButton } from "./Share";
import { EmptyNote, Pulse, RetryNote, WdButton } from "./wd";

type Load = "loading" | "ok" | "error";
type Section = "tentang" | "foto" | "paket" | "ulasan";

const RATING = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** The public vendor profile, Bridestory layout in the "Putih" system:
 * photo mosaic, name and facts, an anchor bar over the sections, and a
 * sticky decision card on the right (a bottom bar on phones). The server
 * page passes what it already fetched (profile, packages, reviews) so the
 * HTML search engines read carries the whole profile; the browser then
 * refreshes it like before. */
export function VendorDetail({
  id,
  initialProfile = null,
  initialPackages,
  initialReviews,
}: {
  id: string;
  initialProfile?: VendorProfile | null;
  initialPackages?: VendorPackage[] | null;
  initialReviews?: Review[] | null;
}) {
  const router = useRouter();
  const reduced = useReducedMotion();

  const [profile, setProfile] = useState<VendorProfile | null>(initialProfile);
  const [reviews, setReviews] = useState<Review[]>(initialReviews ?? []);
  const [packages, setPackages] = useState<VendorPackage[]>(initialPackages ?? []);
  const [pkgLoad, setPkgLoad] = useState<Load>(initialPackages ? "ok" : "loading");
  const [revLoad, setRevLoad] = useState<Load>(initialReviews ? "ok" : "loading");
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
  const [active, setActive] = useState<Section>("tentang");
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

  function goTo(s: Section) {
    setActive(s);
    document.getElementById(s)?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    history.replaceState(null, "", `#${s}`);
  }

  const isClient = user?.role === "client";
  const portfolio = profile?.portfolio ?? [];
  const selected = packages.find((p) => p.name === packageDescription) ?? null;

  const sections: { id: Section; label: string; count?: number }[] = [
    { id: "tentang", label: "Tentang" },
    ...(portfolio.length > 0 ? [{ id: "foto" as const, label: "Foto", count: portfolio.length }] : []),
    { id: "paket", label: "Paket", count: pkgLoad === "ok" ? packages.length : undefined },
    { id: "ulasan", label: "Ulasan", count: revLoad === "ok" ? reviews.length : undefined },
  ];
  const sectionKey = sections.map((s) => s.id).join(",");

  // Scroll spy: the anchor bar marks the section being read.
  useEffect(() => {
    if (!profile) return;
    const els = sectionKey.split(",").map((s) => document.getElementById(s)).filter((el): el is HTMLElement => !!el);
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (hit) setActive(hit.target.id as Section);
      },
      { rootMargin: "-190px 0px -55% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [profile, sectionKey]);

  const actions = {
    isClient,
    checkingUser,
    starting,
    onChat: handleStartChat,
    onBook: () => setSheetOpen(true),
    loginHref: `/login?next=${encodeURIComponent(`/vendors/${id}`)}`,
  };

  const cities = profile ? vendorCities(profile) : [];

  // Phones: keep the active tab in view inside the swipeable tab row
  // (horizontal scroll of the row only, never the page).
  const phoneNav = useRef<HTMLElement>(null);
  useEffect(() => {
    const nav = phoneNav.current;
    const tab = nav?.querySelector<HTMLElement>(`a[href="#${active}"]`);
    if (!nav || !tab) return;
    const left = tab.offsetLeft - nav.clientWidth / 2 + tab.offsetWidth / 2;
    nav.scrollTo({ left: Math.max(0, left), behavior: reduced ? "auto" : "smooth" });
  }, [active, reduced]);

  return (
    <div className="wd flex min-h-screen flex-col bg-white">
      <Navbar />
      <main id="konten" className="flex-1">
        <div className="wd-container pb-16 pt-3 lg:pb-24 lg:pt-5">
          {error && !profile ? (
            <div role="alert" className="mx-auto mt-10 max-w-xl rounded-[20px] border border-wd-line p-8 text-center">
              <h1 className="wd-title text-2xl">Profil vendor belum bisa dibuka</h1>
              <p className="mt-2 text-wd-text">{error}</p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <WdButton variant="ink" onClick={retryLoad}>
                  Coba lagi
                </WdButton>
                <Link href="/vendors" className={wdButton({ variant: "outline" })}>
                  Lihat vendor lain
                </Link>
              </div>
            </div>
          ) : !profile ? (
            <DetailSkeleton />
          ) : (
            <>
              <nav aria-label="Lokasi halaman" className="text-sm text-wd-muted">
                <ol className="flex flex-wrap items-center gap-x-1">
                  <li>
                    <Link href="/vendors" className="inline-flex min-h-11 items-center rounded-md px-1 hover:text-wd-ink hover:underline">
                      Vendor
                    </Link>
                  </li>
                  <li aria-hidden>/</li>
                  <li>
                    <Link href={`/kategori/${profile.category}`} className="inline-flex min-h-11 items-center rounded-md px-1 hover:text-wd-ink hover:underline">
                      {categoryLabel(profile.category)}
                    </Link>
                  </li>
                  <li aria-hidden>/</li>
                  <li aria-current="page" className="min-w-0 truncate px-1 font-medium text-wd-ink">
                    {profile.business_name}
                  </li>
                </ol>
              </nav>

              <div className="mt-1">
                {portfolio.length > 0 ? (
                  <Gallery items={portfolio} onOpen={setLightbox} />
                ) : (
                  <div className="flex min-h-44 flex-col items-center justify-center rounded-[20px] bg-wd-blush px-6 text-center">
                    <p className="font-semibold text-wd-ink">Foto portofolio belum diunggah</p>
                    <p className="mt-1 max-w-sm text-sm text-wd-text">Minta contoh hasil kerja lewat chat dengan vendor.</p>
                  </div>
                )}
              </div>

              <div className="mt-6 grid gap-10 lg:mt-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12 xl:gap-16">
                <div className="min-w-0">
                  <motion.header variants={motionSafe(reduced, fadeUp)} initial="hidden" animate="visible">
                    <div className="flex items-start justify-between gap-4">
                      <h1 className="wd-title min-w-0 break-words text-[clamp(1.75rem,3.2vw,2.5rem)] leading-tight">{profile.business_name}</h1>
                      <div className="pt-1">
                        <ShareButton name={profile.business_name} path={`/vendors/${id}`} />
                      </div>
                    </div>
                    <p className="mt-1.5 text-wd-muted">
                      {[categoriesLabel(profile), profile.city].filter(Boolean).join(" · ")}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                      {profile.review_count > 0 && (
                        <button type="button" onClick={() => goTo("ulasan")} className="-ml-1 inline-flex min-h-11 items-center gap-2 rounded-md px-1 text-wd-ink">
                          <Stars rating={profile.average_rating} />
                          <span className="font-semibold tabular-nums">{RATING.format(profile.average_rating)}</span>
                          <span className="text-sm text-wd-text underline decoration-wd-line-2 underline-offset-4">{profile.review_count} ulasan</span>
                        </button>
                      )}
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-wd-accent-soft px-3 py-1 text-sm font-semibold text-wd-accent-ink">
                        <Shield size={14} />
                        Pembayaran escrow
                      </span>
                      {profile.status === "approved" && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-wd-line-2 px-3 py-1 text-sm font-medium text-wd-ok">
                          <svg aria-hidden width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m4.5 10.5 3.5 3.5 7.5-8" />
                          </svg>
                          Terverifikasi DuaCincin
                        </span>
                      )}
                    </div>
                    {cities.length > 0 && (
                      <p className="mt-2 flex flex-wrap items-center gap-x-1 text-sm text-wd-text">
                        <span className="mr-1 text-wd-muted">Melayani</span>
                        {cities.map((city, i) => (
                          <span key={city} className="inline-flex items-center">
                            <Link
                              href={`/kategori/${profile.category}/${citySlug(city)}`}
                              className="inline-flex min-h-11 items-center rounded-md px-0.5 underline decoration-wd-line-2 underline-offset-4 hover:text-wd-accent-ink hover:decoration-wd-accent-ink"
                            >
                              {city}
                            </Link>
                            {i < cities.length - 1 && <span aria-hidden>,</span>}
                          </span>
                        ))}
                      </p>
                    )}
                  </motion.header>

                  <nav aria-label="Bagian profil" className="sticky top-[112px] z-30 -mx-1 mt-5 hidden border-b border-wd-line bg-white px-1 lg:block">
                    <SectionLinks sections={sections} active={active} onGo={goTo} />
                  </nav>
                  <nav ref={phoneNav} aria-label="Bagian profil" className="wd-rail -mx-4 mt-5 overflow-x-auto border-b border-wd-line px-4 lg:hidden">
                    <SectionLinks sections={sections} active={active} onGo={goTo} />
                  </nav>

                  <section id="tentang" aria-labelledby="tentang-judul" className="scroll-mt-4 pt-8 lg:scroll-mt-14">
                    <h2 id="tentang-judul" className="wd-title text-[1.35rem]">
                      Tentang vendor
                    </h2>
                    <div className="mt-3 max-w-2xl">
                      <ExpandableText text={profile.description || "Vendor belum menambahkan deskripsi. Tanyakan detail layanan lewat chat."} lines={7} className="leading-relaxed text-wd-text" />
                    </div>
                  </section>

                  {portfolio.length > 0 && (
                    <section id="foto" aria-labelledby="foto-judul" className="scroll-mt-4 pt-12 lg:scroll-mt-14">
                      <h2 id="foto-judul" className="wd-title text-[1.35rem]">
                        Foto portofolio
                      </h2>
                      <div className="mt-4">
                        <PortfolioGrid items={portfolio} onOpen={setLightbox} />
                      </div>
                    </section>
                  )}

                  <section id="paket" aria-labelledby="paket-judul" className="scroll-mt-4 pt-12 lg:scroll-mt-14">
                    <h2 id="paket-judul" className="wd-title text-[1.35rem]">
                      Paket
                    </h2>
                    <div className="mt-4">
                      {pkgLoad === "loading" ? (
                        <div role="status" aria-label="Memuat paket" className="grid gap-4 sm:grid-cols-2">
                          <Pulse className="h-52 rounded-[14px]" />
                          <Pulse className="h-52 rounded-[14px]" />
                        </div>
                      ) : pkgLoad === "error" ? (
                        <RetryNote
                          what="Paket"
                          onRetry={() => {
                            setPkgLoad("loading");
                            setPkgKey((k) => k + 1);
                          }}
                        />
                      ) : packages.length === 0 ? (
                        <EmptyNote title="Belum ada paket tertulis" body={`Harga ${profile.business_name} disesuaikan dengan kebutuhanmu. Tanyakan lewat chat.`} />
                      ) : (
                        <>
                          <p className="mb-4 text-sm text-wd-muted">Harga final tetap disepakati lewat chat. Memilih paket hanya mengisi form booking.</p>
                          <PackageCards packages={packages} selectedId={selected?.id ?? null} isClient={isClient} onChoose={choosePackage} loginHref={actions.loginHref} />
                        </>
                      )}
                    </div>
                  </section>

                  <section id="ulasan" aria-labelledby="ulasan-judul" className="scroll-mt-4 pt-12 lg:scroll-mt-14">
                    <h2 id="ulasan-judul" className="wd-title text-[1.35rem]">
                      Ulasan
                    </h2>
                    <div className="mt-4">
                      {revLoad === "loading" ? (
                        <div role="status" aria-label="Memuat ulasan" className="grid gap-3">
                          <Pulse className="h-32 rounded-[14px]" />
                          <Pulse className="h-5 w-2/3" />
                          <Pulse className="h-5 w-1/2" />
                        </div>
                      ) : revLoad === "error" ? (
                        <RetryNote
                          what="Ulasan"
                          onRetry={() => {
                            setRevLoad("loading");
                            setRevKey((k) => k + 1);
                          }}
                        />
                      ) : reviews.length === 0 ? (
                        <EmptyNote title="Belum ada ulasan" body="Ulasan muncul setelah client menyelesaikan booking dengan vendor ini lewat DuaCincin." />
                      ) : (
                        <ReviewsBlock reviews={reviews} />
                      )}
                    </div>
                  </section>

                  <section aria-labelledby="kenapa-judul" className="mt-14 rounded-[20px] bg-wd-accent-wash p-6 sm:p-8">
                    <h2 id="kenapa-judul" className="wd-title text-[1.35rem]">
                      Kenapa booking <em>lewat DuaCincin</em>
                    </h2>
                    <p className="mt-2 max-w-xl text-wd-text">Semua chat, kesepakatan, dan pembayaran tercatat di satu tempat, jadi ada bukti bila terjadi masalah.</p>
                    <div className="mt-6 grid gap-8 md:grid-cols-2">
                      <div>
                        <p className="mb-4 text-sm font-semibold text-wd-accent-ink">Alur dana escrow</p>
                        <EscrowSteps />
                      </div>
                      <ul className="grid content-start gap-5">
                        <li>
                          <p className="font-semibold text-wd-ink">Ulasan hanya dari booking selesai</p>
                          <p className="mt-1 text-sm leading-relaxed text-wd-text">Tidak ada yang bisa menulis ulasan tanpa menyelesaikan booking lewat DuaCincin.</p>
                        </li>
                        <li>
                          <p className="font-semibold text-wd-ink">Didampingi Wedding Consultant</p>
                          <p className="mt-1 text-sm leading-relaxed text-wd-text">Masih ragu memilih? Tim DuaCincin membantu lewat chat konsultasi sampai hari H.</p>
                          <Link href="/client/consultation" className={wdButton({ variant: "outline", size: "sm", className: "!min-h-11 mt-3" })}>
                            Chat Wedding Consultant
                          </Link>
                        </li>
                      </ul>
                    </div>
                  </section>
                </div>

                <aside aria-label="Chat dan booking" className="hidden lg:block">
                  <div className="sticky top-[132px]">
                    <BookingCard
                      profile={profile}
                      {...actions}
                      eventDate={eventDate}
                      setEventDate={setEventDate}
                      selected={selected}
                      onClearPackage={clearPackage}
                      onSeePackages={() => goTo("paket")}
                      error={sheetOpen ? null : error}
                    />
                  </div>
                </aside>
              </div>
            </>
          )}
        </div>
      </main>

      {profile && <MobileActionBar profile={profile} {...actions} error={sheetOpen ? null : error} />}
      <Footer />
      {/* Room under the footer so the fixed mobile bar never covers it. */}
      {profile && <div aria-hidden className="h-24 lg:hidden" />}

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

/** Anchor tabs. The gold underline slides from tab to tab (one shared
 * layout element), counts sit in small badges like a marketplace tab bar. */
function SectionLinks({ sections, active, onGo }: { sections: { id: Section; label: string; count?: number }[]; active: Section; onGo: (s: Section) => void }) {
  const group = useId();
  const reduced = useReducedMotion();
  return (
    <LayoutGroup id={group}>
      <ul className="flex gap-6">
        {sections.map((s) => {
          const on = s.id === active;
          return (
            <li key={s.id} className="shrink-0">
              <a
                href={`#${s.id}`}
                aria-current={on ? "location" : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  onGo(s.id);
                }}
                className={`relative inline-flex min-h-12 items-center gap-1.5 rounded-md text-[0.95rem] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wd-accent-ink ${on ? "text-wd-ink" : "text-wd-muted hover:text-wd-ink"}`}
              >
                {s.label}
                {s.count !== undefined && (
                  <span
                    className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[0.72rem] font-semibold tabular-nums transition-colors ${
                      on ? "bg-wd-accent text-wd-ink" : "bg-wd-blush text-wd-text"
                    }`}
                  >
                    {s.count}
                  </span>
                )}
                {on && (
                  <motion.span
                    aria-hidden
                    layoutId="underline"
                    transition={reduced ? { duration: 0 } : SPRING_SNAPPY}
                    className="absolute inset-x-0 -bottom-px h-[3px] rounded-full bg-wd-accent"
                  />
                )}
              </a>
            </li>
          );
        })}
      </ul>
    </LayoutGroup>
  );
}

function DetailSkeleton() {
  return (
    <div role="status" aria-label="Memuat profil vendor" className="pt-3">
      <Pulse className="h-4 w-48 rounded-full" />
      <div className="mt-4 grid h-[300px] gap-2 overflow-hidden rounded-[20px] md:h-[min(58vh,500px)] md:grid-cols-4 md:grid-rows-2">
        <Pulse className="h-full rounded-none md:col-span-2 md:row-span-2" />
        <Pulse className="hidden h-full rounded-none md:block" />
        <Pulse className="hidden h-full rounded-none md:block" />
        <Pulse className="hidden h-full rounded-none md:block" />
        <Pulse className="hidden h-full rounded-none md:block" />
      </div>
      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12">
        <div>
          <Pulse className="h-9 w-2/3 max-w-md" />
          <Pulse className="mt-3 h-4 w-48 rounded-full" />
          <Pulse className="mt-8 h-4 w-full max-w-2xl" />
          <Pulse className="mt-2 h-4 w-5/6 max-w-2xl" />
          <Pulse className="mt-2 h-4 w-2/3 max-w-2xl" />
        </div>
        <Pulse className="hidden h-96 rounded-[20px] lg:block" />
      </div>
    </div>
  );
}
