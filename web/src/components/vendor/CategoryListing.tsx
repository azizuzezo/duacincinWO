import Link from "next/link";

import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";
import { Reveal } from "@/components/landing/Reveal";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { artFor, CATEGORY_ART } from "@/components/vendor/directory/categoryArt";
import { CategoryPicture } from "@/components/vendor/directory/CategoryPicture";
import { VendorCard } from "@/components/vendor/VendorCard";
import { categoryLabel, formatRupiah, VENDOR_CATEGORIES, type DirectoryCard, vendorCities } from "@/lib/api";
import { citySlug } from "@/lib/server-api";
import { SITE_URL as SITE } from "@/lib/site";

const LINK = "font-semibold text-dc-clay underline decoration-dc-gold/60 underline-offset-4 hover:text-dc-ink";

/** Server-rendered listing for /kategori/[kategori] and /kategori/[kategori]/[kota]:
 * crawlable HTML for "vendor <kategori> <kota>" searches. An editorial hero
 * (picture + what to compare in this category), the questions worth asking,
 * city links with real counts, the vendor cards, then the other categories.
 * Solid ivory navbar (not the overlay one) because the hero is on paper. */
export function CategoryListing({
  category,
  cityName,
  cards,
  failed,
}: {
  category: string;
  cityName?: string;
  cards: DirectoryCard[];
  failed: boolean;
}) {
  const label = categoryLabel(category);
  const art = artFor(category);
  const counts = new Map<string, number>();
  for (const c of cards) for (const city of vendorCities(c)) counts.set(city, (counts.get(city) ?? 0) + 1);
  const cities = Array.from(counts.keys()).sort();
  const where = cityName ? ` di ${cityName}` : "";
  const directoryHref = `/vendors?category=${category}`;
  // Breadcrumb structured data mirrors the visible breadcrumb (same names, same
  // links) so search results can show the path. Same site URL as sitemap.ts.
  const crumbs = [
    { name: "Semua vendor", path: "/vendors" },
    { name: label, path: `/kategori/${category}` },
    ...(cityName ? [{ name: cityName, path: `/kategori/${category}/${citySlug(cityName)}` }] : []),
  ];
  const faq = buildFaq({ label, cityName, cards, cities, ask: art.ask, failed });
  const pagePath = crumbs[crumbs.length - 1].path;
  // The listed vendors (ItemList) and the FAQ below, both mirroring what is on the page.
  const listLd =
    !failed && cards.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: `Vendor ${label}${where}`,
          url: `${SITE}${pagePath}`,
          numberOfItems: cards.length,
          itemListElement: cards.map((c, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE}/vendors/${c.id}`, name: c.business_name })),
        }
      : null;
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: `${SITE}${c.path}` })),
  };

  return (
    <div className="flex min-h-screen flex-col bg-dc-ivory">
      <Navbar />
      <main id="konten" className="flex-1">
        {[breadcrumbLd, listLd, faqLd].filter(Boolean).map((ld, i) => (
          <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
        ))}
        <section aria-labelledby="kategori-judul" className="dc-grain relative overflow-hidden">
          <div className="dc-container grid gap-10 pb-14 pt-8 sm:pt-12 lg:grid-cols-12 lg:items-center lg:gap-14 lg:pb-20 lg:pt-16">
            <div className="animate-fade-up lg:col-span-6">
              <nav aria-label="Jalur halaman" className="text-sm text-dc-text-2">
                <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <li>
                    <Link href="/vendors" className={`inline-flex min-h-11 items-center ${LINK}`}>
                      Semua vendor
                    </Link>
                  </li>
                  <li aria-hidden className="text-dc-text-3">
                    /
                  </li>
                  {cityName ? (
                    <>
                      <li>
                        <Link href={`/kategori/${category}`} className={`inline-flex min-h-11 items-center ${LINK}`}>
                          {label}
                        </Link>
                      </li>
                      <li aria-hidden className="text-dc-text-3">
                        /
                      </li>
                      <li aria-current="page">{cityName}</li>
                    </>
                  ) : (
                    <li aria-current="page">{label}</li>
                  )}
                </ol>
              </nav>

              <h1 id="kategori-judul" className="mt-4 font-heading text-[clamp(2.6rem,5.6vw,4.8rem)] leading-none text-dc-ink">
                Vendor {label} <span className="dc-em">{cityName ? `di ${cityName}` : "pernikahan"}</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-dc-text-2">{art.intro}</p>
              <p className="mt-4 text-sm text-dc-text-3">
                Mencakup: <span className="text-dc-text-2">{art.covers}</span>
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                {!failed && cards.length > 0 && (
                  <ButtonLink href="#daftar-vendor" size="lg">
                    Lihat {cards.length} vendor
                  </ButtonLink>
                )}
                <ButtonLink href={directoryHref} variant="ghost" size="lg">
                  Saring harga dan kota
                </ButtonLink>
              </div>
            </div>

            <div className="relative lg:col-span-6">
              <div className="relative aspect-5/4 overflow-hidden rounded-2xl bg-dc-cream shadow-lift">
                <CategoryPicture art={art} sizes="(min-width: 1024px) 560px, 100vw" priority className="dc-kenburns" />
              </div>
              {art.ask.length > 0 && (
                <aside
                  aria-labelledby="tanya-judul"
                  className="relative mx-4 -mt-10 rounded-xl border border-dc-line bg-dc-white p-5 shadow-float sm:mx-8 lg:absolute lg:-bottom-8 lg:-left-10 lg:mx-0 lg:mt-0 lg:w-[22rem]"
                >
                  <p id="tanya-judul" className="font-heading text-[1.45rem] leading-tight text-dc-ink">
                    Tanyakan sebelum booking
                  </p>
                  <ul className="mt-3 flex flex-col gap-2">
                    {art.ask.map((q) => (
                      <li key={q} className="flex gap-2.5 text-sm leading-snug text-dc-text-2">
                        <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="mt-0.5 shrink-0 text-dc-clay">
                          <path d="M4 12.5 9 17.5 20 6.5" />
                        </svg>
                        {q}
                      </li>
                    ))}
                  </ul>
                </aside>
              )}
            </div>
          </div>
        </section>

        {!failed && (cities.length > 0 || cityName) && (
          <section aria-labelledby="kota-judul" className="border-y border-dc-line bg-dc-cream">
            <div className="dc-container flex flex-col gap-4 py-6 lg:flex-row lg:items-center lg:gap-8">
              <h2 id="kota-judul" className="shrink-0 font-heading text-2xl leading-tight text-dc-ink">
                {cityName ? "Cari di kota lain" : "Pilih kota"}
              </h2>
              {cityName ? (
                <p className="text-sm text-dc-text-2">
                  Lihat semua vendor {label} dari setiap kota di{" "}
                  <Link href={`/kategori/${category}`} className={LINK}>
                    halaman {label}
                  </Link>
                  .
                </p>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {cities.map((c) => (
                    <li key={c}>
                      <Link
                        href={`/kategori/${category}/${citySlug(c)}`}
                        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-dc-line-strong bg-dc-white px-4 text-sm font-semibold text-dc-ink transition-colors hover:border-dc-ink"
                      >
                        {c}
                        <span className="tabular-nums text-dc-text-3">{counts.get(c)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}

        <section id="daftar-vendor" aria-labelledby="daftar-judul" className="dc-container scroll-mt-24 py-14 lg:py-20">
          {failed ? (
            <>
              <h2 id="daftar-judul" className="sr-only">
                Daftar vendor {label}
                {where}
              </h2>
              <ErrorState
                title="Daftar vendor belum bisa dimuat"
                body="Muat ulang halaman ini sebentar lagi, atau cari langsung di direktori lengkap."
              />
              <div className="mt-6 flex justify-center">
                <ButtonLink href={directoryHref}>Buka direktori {label}</ButtonLink>
              </div>
            </>
          ) : cards.length === 0 ? (
            <>
              <h2 id="daftar-judul" className="sr-only">
                Daftar vendor {label}
                {where}
              </h2>
              <EmptyState
                title={`Belum ada vendor ${label}${where}`}
                body={
                  cityName
                    ? `Belum ada vendor ${label} yang terdaftar di ${cityName}. Lihat vendor ${label} dari kota lain, lalu tanyakan lewat chat apakah mereka bisa datang ke kotamu.`
                    : `Vendor ${label} sedang kami kurasi. Sementara itu, lihat kategori lain di bawah.`
                }
                actionHref={cityName ? `/kategori/${category}` : "/vendors"}
                actionLabel={cityName ? `Semua vendor ${label}` : "Lihat semua vendor"}
              />
            </>
          ) : (
            <>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <h2 id="daftar-judul" className="font-heading text-[clamp(2rem,3.6vw,2.8rem)] leading-tight text-dc-ink">
                  <span className="lining-nums tabular-nums">{cards.length}</span> vendor {label}
                  {cityName && <span className="dc-em"> di {cityName}</span>}
                </h2>
                <Link href={directoryHref} className={`inline-flex min-h-11 items-center text-sm ${LINK}`}>
                  Saring berdasarkan budget
                </Link>
              </div>
              <ul className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {cards.map((c) => (
                  <li key={c.id}>
                    <VendorCard card={c} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section aria-labelledby="faq-judul" className="border-t border-dc-line">
          <div className="dc-container grid gap-8 py-14 lg:grid-cols-12 lg:gap-14 lg:py-20">
            <h2 id="faq-judul" className="font-heading text-[clamp(2rem,3.6vw,2.8rem)] leading-tight text-dc-ink lg:col-span-4">
              Seputar vendor {label} <span className="dc-em">{cityName ? `di ${cityName}` : "pernikahan"}</span>
            </h2>
            <dl className="flex flex-col divide-y divide-dc-line lg:col-span-8">
              {faq.map((f) => (
                <div key={f.q} className="py-5 first:pt-0">
                  <dt className="font-semibold text-dc-ink">{f.q}</dt>
                  <dd className="mt-2 leading-relaxed text-dc-text-2">{f.a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section aria-labelledby="lain-judul" className="border-t border-dc-line bg-dc-white">
          <Reveal className="dc-container py-14 lg:py-20">
            <h2 id="lain-judul" className="font-heading text-[clamp(2rem,3.6vw,2.8rem)] leading-tight text-dc-ink">
              Lengkapi <span className="dc-em">kebutuhan lainnya</span>
            </h2>
            <ul className="-mx-4 mt-8 flex snap-x scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 lg:grid-cols-6">
              {VENDOR_CATEGORIES.filter((c) => c.value !== category).map((c) => (
                <li key={c.value} className="w-[42%] shrink-0 snap-start sm:w-auto">
                  <Link href={`/kategori/${c.value}`} className="group block rounded-lg">
                    <span className="relative block aspect-4/5 overflow-hidden rounded-lg bg-dc-cream shadow-soft transition-[box-shadow,transform] duration-500 ease-dc group-hover:shadow-lift motion-safe:group-hover:-translate-y-1">
                      <CategoryPicture art={CATEGORY_ART[c.value]} sizes="(min-width: 1024px) 180px, (min-width: 640px) 30vw, 42vw" decorative />
                    </span>
                    <span className="mt-3 block font-heading text-[1.45rem] leading-tight text-dc-ink group-hover:text-dc-clay">{c.label}</span>
                    <span className="block text-sm text-dc-text-3">{CATEGORY_ART[c.value].covers}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Reveal>
        </section>
      </main>
      <Footer />
    </div>
  );
}

/** Questions a couple searching "vendor <kategori> <kota>" asks, answered
 * from this page's own listing (prices, cities, counts), so every category
 * and city page says something true and specific. */
function buildFaq({
  label,
  cityName,
  cards,
  cities,
  ask,
  failed,
}: {
  label: string;
  cityName?: string;
  cards: DirectoryCard[];
  cities: string[];
  ask: string[];
  failed: boolean;
}): { q: string; a: string }[] {
  const where = cityName ? ` di ${cityName}` : "";
  const priced = cards.map((c) => c.price_min).filter((p) => p > 0).sort((a, b) => a - b);
  const out: { q: string; a: string }[] = [];

  let price: string;
  if (failed) price = `Lihat kisaran harga terbaru di direktori DuaCincin, tiap vendor ${label} mencantumkan harga mulai dari.`;
  else if (priced.length === 0)
    price = cards.length
      ? `Vendor ${label}${where} di DuaCincin membahas harga lewat chat sesuai kebutuhan acaramu, jadi tanyakan paket dan harganya langsung.`
      : `Belum ada vendor ${label}${where} dengan harga tercantum. Lihat vendor ${label} di kota lain sebagai gambaran.`;
  else {
    const median = priced[Math.floor((priced.length - 1) / 2)];
    price =
      priced.length === 1
        ? `Saat ini ada 1 vendor ${label}${where} dengan harga mulai dari ${formatRupiah(priced[0])}.`
        : `Dari ${priced.length} vendor ${label}${where} yang mencantumkan harga di DuaCincin, harga mulai dari ${formatRupiah(priced[0])} sampai ${formatRupiah(priced[priced.length - 1])}, dengan nilai tengah ${formatRupiah(median)}. Harga akhir tergantung paket, jumlah tamu, dan tanggal acara.`;
  }
  out.push({ q: `Berapa harga vendor ${label}${where}?`, a: price });

  if (cityName) {
    out.push({
      q: `Apakah vendor ${label} dari kota lain bisa melayani ${cityName}?`,
      a: `Bisa jadi. Banyak vendor ${label} melayani beberapa kota sekaligus. Buka profil vendor untuk melihat kota layanannya, lalu tanyakan biaya transportasi lewat chat sebelum booking.`,
    });
  } else if (cities.length > 0) {
    const shown = cities.slice(0, 12).join(", ");
    out.push({
      q: `Di kota mana saja ada vendor ${label} di DuaCincin?`,
      a: `Saat ini vendor ${label} di DuaCincin melayani ${shown}${cities.length > 12 ? `, dan ${cities.length - 12} kota lainnya` : ""}. Pilih kota di atas untuk melihat vendornya.`,
    });
  }

  if (ask.length > 0) {
    out.push({
      q: `Apa yang perlu ditanyakan sebelum booking vendor ${label}?`,
      a: `${ask.join(" ")} Simpan jawabannya di chat DuaCincin supaya ada catatan bila nanti ada perbedaan.`,
    });
  }

  out.push({
    q: `Bagaimana cara booking vendor ${label} dengan aman?`,
    a: `Pilih vendor, ngobrol lewat chat DuaCincin, lalu ajukan booking dengan tanggal dan paket yang disepakati. Pembayaranmu ditahan lewat escrow DuaCincin dan baru diteruskan ke vendor setelah acaramu selesai, jadi uangmu tetap aman bila ada masalah.`,
  });
  return out;
}
