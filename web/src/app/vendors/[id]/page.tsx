"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useRef, useState } from "react";

import { Button } from "@/components/Button";
import { REVIEW_SOURCE_NOTE, ReviewList, ReviewSummary } from "@/components/vendor/Reviews";
import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";
import { TextField } from "@/components/TextField";
import {
  apiGet,
  apiPost,
  ApiError,
  categoryLabel,
  formatRupiah,
  type Booking,
  type Conversation,
  type CurrentUser,
  type Review,
  type VendorPackage,
  type VendorProfile,
} from "@/lib/api";

export default function VendorDetailPage({ params }: PageProps<"/vendors/[id]">) {
  const { id } = use(params);
  const router = useRouter();

  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [packages, setPackages] = useState<VendorPackage[]>([]);
  // Vendor profiles are public (see engineering.md) — chat & booking still
  // need a Client account, so we check the session without redirecting
  // an anonymous visitor away from the profile itself.
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [checkingUser, setCheckingUser] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [eventDate, setEventDate] = useState("");
  const [packageDescription, setPackageDescription] = useState("");
  const [agreedPrice, setAgreedPrice] = useState("");
  const [bookingSaving, setBookingSaving] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    apiGet<VendorProfile>(`/api/v1/vendors/${id}`)
      .then(setProfile)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Vendor tidak ditemukan."));
    apiGet<VendorPackage[]>(`/api/v1/vendors/${id}/packages`)
      .then((d) => setPackages(d ?? []))
      .catch(() => {});
    apiGet<Review[]>(`/api/v1/vendors/${id}/reviews`)
      .then((d) => setReviews(d ?? []))
      .catch(() => {});
  }, [id, reloadKey]);

  useEffect(() => {
    apiGet<CurrentUser>("/api/v1/auth/me")
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setCheckingUser(false));
  }, []);

  function retryLoad() {
    setError(null);
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

  async function handleSubmitBooking(e: React.FormEvent) {
    e.preventDefault();
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

  const isClient = user?.role === "client";
  const portfolio = profile?.portfolio ?? [];

  return (
    <div className="flex min-h-screen flex-col bg-dc-ivory">
      <Navbar />
      <main className="flex-1 pb-20 lg:pb-0">
        <div className="mx-auto w-full max-w-[1200px] px-4 pb-20 pt-8 sm:px-6 lg:px-10 lg:pt-10">
          <Link
            href="/vendors"
            className="inline-flex min-h-11 items-center text-sm font-medium text-dc-clay underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold"
          >
            Kembali ke direktori
          </Link>

          {error && !profile ? (
            <div role="alert" className="mt-6 flex flex-col items-center rounded-lg border border-dc-ink/10 bg-dc-white px-6 py-16 text-center">
              <p className="font-heading text-3xl text-dc-ink">Vendor tidak bisa dimuat</p>
              <p className="mt-2 max-w-sm text-sm text-dc-black/70">{error}</p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Button className="w-auto" onClick={retryLoad}>
                  Coba lagi
                </Button>
                <Link href="/vendors">
                  <Button variant="ghost" className="w-auto">
                    Lihat vendor lain
                  </Button>
                </Link>
              </div>
            </div>
          ) : !profile ? (
            <DetailSkeleton />
          ) : (
            <>
              <header className="mt-4">
                <p className="text-sm font-semibold text-dc-clay">
                  {categoryLabel(profile.category)}
                  {profile.city ? <span className="text-dc-black/60"> / {profile.city}</span> : null}
                </p>
                <h1 className="font-heading mt-3 max-w-4xl text-5xl leading-[1.05] text-dc-ink sm:text-6xl lg:text-7xl">
                  {profile.business_name}
                </h1>
                {profile.review_count > 0 && (
                  <p className="mt-4 text-sm font-medium text-dc-ink">
                    <span className="text-dc-clay" aria-hidden="true">
                      ★
                    </span>{" "}
                    {profile.average_rating.toFixed(1)}{" "}
                    <span className="text-dc-black/60">dari {profile.review_count} ulasan</span>
                  </p>
                )}
              </header>

              <div className="dc-rule my-8" />

              {portfolio.length > 0 ? (
                <Gallery items={portfolio} onOpen={setLightbox} />
              ) : (
                <div className="flex min-h-40 items-center justify-center rounded-lg border border-dashed border-dc-ink/20 bg-dc-white/60 px-4 text-center text-sm text-dc-black/70">
                  Vendor ini belum mengunggah portofolio.
                </div>
              )}

              <div className="mt-12 flex flex-col gap-12 lg:flex-row lg:items-start lg:gap-16">
                <div className="min-w-0 flex-1 lg:order-1">
                  <section aria-labelledby="tentang">
                    <h2 id="tentang" className="font-heading text-3xl text-dc-ink">
                      Tentang <span className="dc-em">vendor ini</span>
                    </h2>
                    <p className="mt-4 max-w-2xl whitespace-pre-line leading-relaxed text-dc-black/80">
                      {profile.description || "Vendor belum menambahkan deskripsi."}
                    </p>
                  </section>

                  {packages.length > 0 && (
                    <section aria-labelledby="paket" className="mt-14">
                      <h2 id="paket" className="font-heading text-3xl text-dc-ink">
                        Paket <span className="dc-em">harga</span>
                      </h2>
                      <ul className="mt-6 divide-y divide-dc-ink/10 border-y border-dc-ink/10">
                        {packages.map((p) => (
                          <li key={p.id} className="flex flex-col gap-4 py-6 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <h3 className="font-heading break-words text-2xl text-dc-ink">{p.name}</h3>
                              {p.description && <p className="mt-2 max-w-xl whitespace-pre-line break-words text-sm leading-relaxed text-dc-black/70">{p.description}</p>}
                            </div>
                            <div className="shrink-0 sm:text-right">
                              <p className="font-sans text-xl font-semibold tabular-nums text-dc-ink">{p.price > 0 ? formatRupiah(p.price) : "Gratis"}</p>
                              {isClient && (
                                <a
                                  href="#booking-form"
                                  onClick={() => {
                                    setPackageDescription(p.name);
                                    setAgreedPrice(p.price > 0 ? String(p.price) : "");
                                    setShowBookingForm(true);
                                  }}
                                  className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-dc-clay underline underline-offset-4 hover:text-dc-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold"
                                >
                                  Ajukan paket ini
                                </a>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  {reviews.length > 0 && (
                    <section aria-labelledby="ulasan" className="mt-14">
                      <h2 id="ulasan" className="font-heading text-3xl text-dc-ink">
                        Ulasan dari <span className="dc-em">klien</span>
                      </h2>
                      <p className="mt-2 max-w-xl text-sm text-dc-black/70">{REVIEW_SOURCE_NOTE}</p>
                      <div className="mt-6">
                        <ReviewSummary reviews={reviews} />
                      </div>
                      <div className="mt-8">
                        <ReviewList reviews={reviews} />
                      </div>
                    </section>
                  )}
                </div>

                {/* Booking panel: first on mobile (right after the gallery), sticky column on desktop. */}
                <aside id="panel-booking" aria-label="Chat dan booking" className="order-first scroll-mt-20 w-full lg:sticky lg:top-24 lg:order-2 lg:w-[360px] lg:shrink-0">
                  <div className="rounded-lg border border-dc-ink/10 bg-dc-white p-6">
                    <p className="text-sm text-dc-black/70">Harga mulai dari</p>
                    <p className="mt-1 font-sans text-4xl font-semibold tabular-nums tracking-tight text-dc-ink">
                      {profile.price_min > 0 ? formatRupiah(profile.price_min) : "Lewat diskusi"}
                    </p>
                    {profile.price_max > profile.price_min && (
                      <p className="mt-1 text-sm text-dc-black/70">hingga {formatRupiah(profile.price_max)}, tergantung paket</p>
                    )}
                    <p className="mt-4 rounded-md bg-dc-cream px-3 py-2 text-sm text-dc-ink">
                      Bayar lewat escrow DuaCincin: dana ditahan dan baru diteruskan ke vendor setelah acaramu selesai.
                    </p>
                    <div className="dc-rule my-5" />

                    {checkingUser ? (
                      <div className="h-11 animate-pulse rounded-md bg-dc-ink/10 motion-reduce:animate-none" aria-hidden="true" />
                    ) : isClient ? (
                      <div className="flex flex-col gap-3">
                        <Button onClick={handleStartChat} loading={starting}>
                          Chat dengan vendor ini
                        </Button>
                        <Button
                          variant="ghost"
                          aria-expanded={showBookingForm}
                          aria-controls="booking-form"
                          onClick={() => setShowBookingForm((v) => !v)}
                        >
                          {showBookingForm ? "Tutup form booking" : "Ajukan booking"}
                        </Button>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm text-dc-black/70">Masuk sebagai Client untuk chat dan mengajukan booking ke vendor ini.</p>
                        <Link href="/login" className="mt-4 block">
                          <Button>Masuk untuk chat</Button>
                        </Link>
                      </div>
                    )}

                    {error && (
                      <p role="alert" className="mt-4 text-sm text-red-700">
                        {error}
                      </p>
                    )}

                    {showBookingForm && isClient && (
                      <form id="booking-form" onSubmit={handleSubmitBooking} className="mt-6 flex flex-col gap-4 border-t border-dc-ink/10 pt-6">
                        <p className="text-sm text-dc-black/70">
                          Ajukan booking setelah harga dan paket disepakati lewat chat. Vendor akan mengonfirmasi sebelum kamu membayar DP.
                        </p>
                        <div className="flex flex-col gap-1.5">
                          <label htmlFor="event-date" className="text-sm font-medium text-dc-ink">
                            Tanggal acara
                          </label>
                          <input
                            id="event-date"
                            type="date"
                            value={eventDate}
                            onChange={(e) => setEventDate(e.target.value)}
                            required
                            className="min-h-11 w-full rounded-md border border-dc-ink/20 bg-dc-white px-4 py-2.5 text-dc-black transition focus:border-dc-ink focus:outline-2 focus:outline-offset-2 focus:outline-dc-gold"
                          />
                        </div>
                        <TextField label="Deskripsi paket" value={packageDescription} onChange={setPackageDescription} />
                        <TextField label="Harga disepakati (Rp)" type="number" value={agreedPrice} onChange={setAgreedPrice} />
                        <Button type="submit" loading={bookingSaving}>
                          Kirim pengajuan booking
                        </Button>
                      </form>
                    )}
                  </div>
                </aside>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Mobile-only sticky action bar: price + jump to the booking panel, which
          sits right after the gallery. Hidden on desktop where the panel is sticky. */}
      {profile && (
        <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-4 border-t border-dc-ink/10 bg-dc-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
          <div>
            <p className="text-xs text-dc-black/70">Mulai dari</p>
            <p className="font-sans text-lg font-semibold tabular-nums text-dc-ink">
              {profile.price_min > 0 ? formatRupiah(profile.price_min) : "Lewat diskusi"}
            </p>
          </div>
          <a
            href="#panel-booking"
            className="inline-flex min-h-11 items-center rounded-md bg-dc-ink px-6 text-sm font-semibold text-dc-white transition-colors hover:bg-dc-clay focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold"
          >
            Chat atau booking
          </a>
        </div>
      )}
      <Footer />

      {profile && lightbox !== null && portfolio[lightbox] && (
        <Lightbox items={portfolio} index={lightbox} onChange={setLightbox} onClose={() => setLightbox(null)} />
      )}
    </div>
  );
}

type PortfolioItem = { id: string; url: string; alt_text: string };

function Gallery({ items, onOpen }: { items: PortfolioItem[]; onOpen: (i: number) => void }) {
  const [first, ...rest] = items;
  const shown = rest.slice(0, 6);
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:grid-rows-2">
      <GalleryTile item={first} index={0} onOpen={onOpen} className="col-span-2 aspect-[4/3] lg:row-span-2 lg:aspect-auto lg:min-h-[480px]" priority />
      {shown.map((p, i) => (
        <GalleryTile
          key={p.id}
          item={p}
          index={i + 1}
          onOpen={onOpen}
          className="aspect-square"
          more={i === shown.length - 1 && rest.length > shown.length ? rest.length - shown.length : 0}
        />
      ))}
    </div>
  );
}

function GalleryTile({
  item,
  index,
  onOpen,
  className,
  priority,
  more = 0,
}: {
  item: PortfolioItem;
  index: number;
  onOpen: (i: number) => void;
  className: string;
  priority?: boolean;
  more?: number;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(index)}
      aria-label={`Perbesar foto: ${item.alt_text || "Portofolio vendor"}`}
      className={`group relative overflow-hidden rounded-lg border border-dc-ink/10 bg-dc-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold ${className}`}
    >
      <Image
        src={item.url}
        alt={item.alt_text || "Portofolio vendor"}
        fill
        priority={priority}
        sizes={priority ? "(min-width: 1024px) 600px, 100vw" : "(min-width: 1024px) 300px, 50vw"}
        className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        unoptimized
      />
      {more > 0 && (
        <span className="absolute inset-0 flex items-center justify-center bg-dc-ink/70 text-sm font-semibold text-dc-white">
          Lihat {more} foto lagi
        </span>
      )}
    </button>
  );
}

function Lightbox({
  items,
  index,
  onChange,
  onClose,
}: {
  items: PortfolioItem[];
  index: number;
  onChange: (i: number) => void;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const item = items[index];
  const prev = () => onChange((index - 1 + items.length) % items.length);
  const next = () => onChange((index + 1) % items.length);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
      opener?.focus();
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onChange((index - 1 + items.length) % items.length);
      if (e.key === "ArrowRight") onChange((index + 1) % items.length);
      if (e.key === "Tab") {
        // Keep focus inside the dialog.
        const f = Array.from(document.querySelectorAll<HTMLElement>("[data-lb] button"));
        if (f.length === 0) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [index, items.length, onChange, onClose]);

  const nav =
    "flex min-h-11 min-w-11 items-center justify-center rounded-md border border-dc-white/30 bg-dc-ink/60 px-3 text-sm font-semibold text-dc-white transition-colors hover:bg-dc-clay focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold";

  return (
    <div
      data-lb
      role="dialog"
      aria-modal="true"
      aria-label="Galeri portofolio"
      className="fixed inset-0 z-[60] flex flex-col bg-dc-ink/95 p-4 sm:p-8"
      onClick={onClose}
    >
      <div className="flex items-center justify-between text-sm text-dc-white" onClick={(e) => e.stopPropagation()}>
        <p>
          Foto {index + 1} dari {items.length}
        </p>
        <button ref={closeRef} type="button" onClick={onClose} className={nav}>
          Tutup
        </button>
      </div>
      <div className="relative my-4 min-h-0 flex-1">
        <Image src={item.url} alt={item.alt_text || "Portofolio vendor"} fill sizes="100vw" className="object-contain" unoptimized />
      </div>
      {items.length > 1 && (
        <div className="flex justify-center gap-3" onClick={(e) => e.stopPropagation()}>
          <button type="button" onClick={prev} className={nav}>
            Sebelumnya
          </button>
          <button type="button" onClick={next} className={nav}>
            Berikutnya
          </button>
        </div>
      )}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div role="status" aria-label="Memuat profil vendor" className="mt-6">
      <div className="h-3 w-32 animate-pulse rounded bg-dc-ink/10 motion-reduce:animate-none" />
      <div className="mt-4 h-14 w-2/3 animate-pulse rounded bg-dc-ink/10 motion-reduce:animate-none" />
      <div className="mt-10 aspect-[16/7] animate-pulse rounded-lg bg-dc-ink/10 motion-reduce:animate-none" />
      <div className="mt-10 h-4 w-full max-w-xl animate-pulse rounded bg-dc-ink/10 motion-reduce:animate-none" />
      <div className="mt-3 h-4 w-3/4 max-w-xl animate-pulse rounded bg-dc-ink/10 motion-reduce:animate-none" />
    </div>
  );
}
