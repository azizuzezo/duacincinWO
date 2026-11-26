"use client";

// Client dashboard, "perjalanan pernikahan": one header with the date that
// matters and the next step, a four-step journey (Cari, Booking, Bayar DP,
// Hari-H) read from the client's real bookings, then one slot per budget
// group. A filled slot shows the booked vendor's photo and status; an empty
// slot shows an illustrated character, the budget set aside, and a button to
// find a vendor. Below: planning tools, recommended vendors, inspiration.
// Everything comes from the client's budget, checklist, bookings and the
// public directory; nothing is invented.
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { daysUntil, ErrorState, firstName, formatTanggal, relativeDays, Skeleton } from "@/app/client/_ui";
import { WeddingDateField } from "@/components/client/WeddingDateField";
import { ClientArt, type ArtKind } from "@/components/home/ClientArt";
import { Inspiration } from "@/components/home/Inspiration";
import { rankVendors, VendorRail } from "@/components/home/VendorRail";
import { wdButton } from "@/components/home/ui";
import { useDirectory } from "@/components/landing/useHomeData";
import { ClientShell } from "@/components/shell/ClientShell";
import { CardPhoto } from "@/components/ui/CardPhoto";
import { WithUser } from "@/components/WithUser";
import {
  apiGet,
  formatRupiah,
  vendorCategoryList,
  VENDOR_CATEGORIES,
  type Booking,
  type BookingStatus,
  type BudgetPlan,
  type CurrentUser,
  type DirectoryCard,
  type PlannerTask,
} from "@/lib/api";
import { BUDGET_CATEGORIES } from "@/lib/budget";

type NextStep = { title: string; body: string; cta: string; href: string };

/** One recommended action, derived from the soonest active booking, else from whether a budget exists. */
function nextStep(booking: Booking | undefined, budget: BudgetPlan | null, hasAnyBooking: boolean): NextStep {
  if (booking) {
    const href = `/client/bookings/${booking.id}`;
    switch (booking.status) {
      case "requested":
        return { title: "Menunggu konfirmasi vendor", body: "Vendor sedang meninjau pengajuanmu. Kamu akan diberi tahu begitu dikonfirmasi.", cta: "Lihat booking", href };
      case "confirmed":
        return { title: "Bayar DP untuk mengunci tanggal", body: "Vendor sudah mengonfirmasi. DP ditahan Dana Aman DuaCincin dan belum diteruskan ke vendor.", cta: "Bayar DP", href };
      case "dp_paid":
        return { title: "Lunasi sisa pembayaran", body: "Jadwalkan meeting dengan konsultan bila perlu, lalu lunasi pembayaran sebelum hari-H.", cta: "Buka booking", href };
      case "full_paid":
        return { title: "Siapkan technical meeting", body: "Sepakati rundown, denah, dan jadwal kru bersama vendor sebelum hari-H.", cta: "Atur meeting", href };
      default:
        return { title: "Lihat booking-mu", body: "Cek status terbaru booking yang sedang berjalan.", cta: "Buka booking", href };
    }
  }
  if (!budget || budget.total_budget <= 0) {
    return { title: "Mulai dari anggaran", body: "Masukkan total budget dan lihat alokasinya per kategori. Kamu bisa menyesuaikannya kapan saja.", cta: "Atur budget", href: "/client/budget" };
  }
  return {
    title: hasAnyBooking ? "Cari vendor berikutnya" : "Cari vendor pertamamu",
    body: "Bandingkan portofolio dan harga mulai dari, lalu diskusi lewat chat di dalam DuaCincin.",
    cta: "Cari vendor",
    href: "/vendors",
  };
}

const STATUS_SHORT: Record<BookingStatus, { label: string; cls: string }> = {
  requested: { label: "Menunggu vendor", cls: "bg-white text-wd-ink" },
  confirmed: { label: "Bayar DP", cls: "bg-wd-accent text-wd-ink" },
  dp_paid: { label: "Dana ditahan", cls: "bg-wd-ink text-white" },
  full_paid: { label: "Lunas", cls: "bg-wd-ink text-white" },
  completed: { label: "Selesai", cls: "bg-white text-wd-ink" },
  cancelled: { label: "Dibatalkan", cls: "bg-white text-wd-muted" },
};

/** The art and the search link per budget group (one slot each). */
const SLOT_ART: Record<string, ArtKind> = {
  venue_catering: "hall",
  decor: "flower",
  photo_video: "camera",
  mua_attire: "mirror",
  entertainment: "mic",
  invitation_souvenir: "card",
  reserve: "coin",
};

export default function ClientDashboardPage() {
  return (
    <WithUser allowedRoles={["client"]} loginPath="/login">
      {(user) => <ClientDashboardContent user={user} />}
    </WithUser>
  );
}

function ClientDashboardContent({ user }: { user: CurrentUser }) {
  const [budget, setBudget] = useState<BudgetPlan | null>(null);
  const [tasks, setTasks] = useState<PlannerTask[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [pending, setPending] = useState(3);
  const [failed, setFailed] = useState(false);
  const directory = useDirectory();
  const [weddingDate, setWeddingDate] = useState(user.wedding_date ?? "");

  function load() {
    setPending(3);
    setFailed(false);
    const done = () => setPending((n) => n - 1);
    const fail = () => {
      setFailed(true);
      done();
    };
    // The budget is optional: the rest still works without it.
    apiGet<BudgetPlan>("/api/v1/budget-plan/me")
      .then((d) => {
        setBudget(d);
        done();
      })
      .catch(done);
    apiGet<PlannerTask[]>("/api/v1/wedding-planner/tasks")
      .then((d) => {
        setTasks(d ?? []);
        done();
      })
      .catch(fail);
    apiGet<Booking[]>("/api/v1/bookings")
      .then((d) => {
        setBookings(d ?? []);
        done();
      })
      .catch(fail);
  }

  useEffect(() => {
    queueMicrotask(load);
  }, []);

  const loading = pending > 0;
  const doneCount = tasks.filter((t) => t.status === "done").length;
  const live = bookings.filter((b) => b.status !== "cancelled");
  const active = live.filter((b) => b.status !== "completed").sort((a, b) => a.event_date.localeCompare(b.event_date));
  const nextBooking = active[0];
  const next = nextStep(nextBooking, budget, bookings.length > 0);
  // The wedding date the couple set wins; without it, the nearest booking's date stands in.
  const mainDate = weddingDate || nextBooking?.event_date;
  const days = daysUntil(mainDate);
  const committed = live.reduce((s, b) => s + b.agreed_price, 0);

  // Journey: where the slowest live booking stands. Steps before it are done, it is "now".
  const STAGE: Record<BookingStatus, number> = { requested: 1, confirmed: 2, dp_paid: 3, full_paid: 3, completed: 4, cancelled: 4 };
  const stage = live.length ? Math.min(...live.map((b) => STAGE[b.status])) : 0;
  const journey = [
    { name: "Cari", note: live.length ? `${live.length} vendor dipilih` : "Pilih vendor pertamamu" },
    { name: "Booking", note: "Vendor mengonfirmasi" },
    { name: "Bayar DP", note: "Dana ditahan DuaCincin" },
    { name: "Hari-H", note: "Dana cair setelah acara" },
  ];
  const nowIdx = stage >= 4 ? -1 : stage;

  return (
    <ClientShell user={user}>
      <section aria-labelledby="halo" className="wd-container pt-8 sm:pt-10">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div className="min-w-0">
            <p className="wd-kicker">Halo, {firstName(user.full_name, "kamu")}</p>
            {loading ? (
              <div role="status" aria-label="Memuat jadwal" className="mt-3">
                <Skeleton className="h-12 w-80 max-w-full" />
              </div>
            ) : mainDate && days !== null && days >= 0 ? (
              <h1 id="halo" className="wd-display mt-2 text-[clamp(2.1rem,4.4vw,3.4rem)] leading-[1.05]">
                {days > 1 ? <>{days} hari menuju</> : <>{relativeDays(days)},</>} <em>{formatTanggal(mainDate)}</em>
              </h1>
            ) : (
              <h1 id="halo" className="wd-display mt-2 text-[clamp(2.1rem,4.4vw,3.4rem)] leading-[1.05]">
                Mulai <em>perjalanan pernikahanmu</em>
              </h1>
            )}
            {!loading && (
              <p className="mt-3 max-w-xl leading-relaxed text-wd-text">
                <span className="font-semibold text-wd-ink">{next.title}.</span> {next.body}
              </p>
            )}
            {!loading && (
              <div className="mt-4">
                <WeddingDateField value={weddingDate} onSaved={setWeddingDate} compact />
              </div>
            )}
          </div>
          {!loading && (
            <Link href={next.href} className={wdButton({ size: "lg", variant: "ink" })}>
              {next.cta}
            </Link>
          )}
        </div>

        {/* The four-step journey. */}
        <ol aria-label="Perjalanan booking" className="mt-8 grid grid-cols-4">
          {journey.map((j, i) => {
            const done = !loading && i < stage;
            const now = !loading && i === nowIdx;
            return (
              <li key={j.name} aria-current={now ? "step" : undefined} className="relative pt-9 text-center">
                <span aria-hidden className={`absolute left-0 right-0 top-3 h-[3px] ${i === 0 ? "left-1/2" : ""} ${i === journey.length - 1 ? "right-1/2" : ""} ${done || now ? "bg-wd-accent-deep" : "bg-wd-line"}`} />
                <span
                  aria-hidden
                  className={`absolute left-1/2 top-[3px] flex h-[22px] w-[22px] -translate-x-1/2 items-center justify-center rounded-full border-[3px] text-white ${done ? "border-wd-accent-deep bg-wd-accent-deep" : now ? "border-wd-accent-deep bg-white shadow-[0_0_0_6px_var(--wd-accent-soft)]" : "border-wd-line bg-white"}`}
                >
                  {done && (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m5 12 5 5 9-10" />
                    </svg>
                  )}
                </span>
                <span className={`block text-[0.95rem] font-semibold ${done || now ? "text-wd-ink" : "text-wd-muted"}`}>{j.name}</span>
                <span className="mt-0.5 hidden text-[0.8rem] text-wd-muted sm:block">{now ? "Langkah sekarang" : j.note}</span>
              </li>
            );
          })}
        </ol>
      </section>

      {failed && !loading && (
        <div className="wd-container mt-6">
          <ErrorState message="Sebagian ringkasan belum termuat." onRetry={load} />
        </div>
      )}

      <Slots bookings={live} budget={budget} directory={directory.status === "ready" ? directory.data ?? [] : []} loading={loading || directory.status === "loading"} committed={committed} />

      <Tools budget={budget} doneCount={doneCount} total={tasks.length} loading={loading} />
      <Recommended />
      <Inspiration />
    </ClientShell>
  );
}

/** One slot per budget group: the booked vendor, or an invitation to find one. */
function Slots({ bookings, budget, directory, loading, committed }: { bookings: Booking[]; budget: BudgetPlan | null; directory: DirectoryCard[]; loading: boolean; committed: number }) {
  const slots = useMemo(() => {
    const byId = new Map(directory.map((d) => [d.id, d]));
    return BUDGET_CATEGORIES.map((g) => {
      const mine = bookings
        .map((b) => ({ b, v: byId.get(b.vendor_id) }))
        .filter(({ v }) => v && vendorCategoryList(v).some((c) => g.vendorCategories?.includes(c)));
      const amount = budget?.categories?.find((c) => c.category === g.key)?.amount ?? 0;
      return { g, mine, amount };
    });
  }, [bookings, budget, directory]);
  const filled = slots.filter((s) => s.mine.length > 0).length;

  return (
    <section aria-labelledby="slot-judul" className="wd-container pt-12">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
        <div>
          <h2 id="slot-judul" className="wd-title text-[clamp(1.55rem,2.6vw,2.05rem)] leading-tight">
            Vendor pernikahanmu
          </h2>
          <p className="mt-1.5 text-[0.95rem] text-wd-muted">{loading ? "Memuat vendor dan booking…" : `${filled} dari ${slots.length} kategori terisi${committed > 0 ? ` · ${formatRupiah(committed)} disepakati` : ""}`}</p>
        </div>
        <Link href="/vendors" className="text-[0.95rem] font-semibold text-wd-accent-ink underline underline-offset-4 hover:text-wd-ink">
          Semua vendor
        </Link>
      </div>

      <ul className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {slots.map(({ g, mine, amount }) => {
          const first = mine[0];
          const search = `/kategori/${g.vendorCategories?.[0] ?? "venue"}`;
          if (first && first.v) {
            const st = STATUS_SHORT[first.b.status];
            return (
              <li key={g.key}>
                <Link href={`/client/bookings/${first.b.id}`} className="group relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-[22px] bg-wd-ink text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wd-accent">
                  {first.v.sample_image && <CardPhoto src={first.v.sample_image} alt="" sizes="(min-width: 1024px) 280px, 46vw" className="transition-transform duration-[1.1s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.05] motion-reduce:transition-none motion-reduce:group-hover:scale-100" />}
                  <span aria-hidden className="absolute inset-0 bg-linear-to-t from-black/75 via-black/10 to-transparent" />
                  <span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[0.72rem] font-bold ${st.cls}`}>{st.label}</span>
                  {mine.length > 1 && <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2 py-1 text-[0.72rem] font-bold text-wd-ink">+{mine.length - 1}</span>}
                  <span className="relative p-3.5 sm:p-4">
                    <span className="block text-[0.74rem] font-semibold uppercase tracking-[0.06em] text-white/80">{g.label}</span>
                    <span className="mt-0.5 block text-[1.05rem] font-semibold leading-snug">{first.v.business_name}</span>
                    <span className="mt-0.5 block text-[0.84rem] tabular-nums text-white/85">{formatRupiah(first.b.agreed_price)}</span>
                  </span>
                </Link>
              </li>
            );
          }
          return (
            <li key={g.key}>
              <Link
                href={search}
                className="group flex aspect-[4/5] flex-col items-center justify-center gap-2 rounded-[22px] border-2 border-dashed border-wd-accent bg-wd-accent-wash px-3 text-center transition-colors hover:bg-[#f6ecd2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wd-accent"
              >
                <span className="block h-24 w-24 transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:-rotate-6 group-hover:scale-110 motion-reduce:transition-none motion-reduce:group-hover:transform-none sm:h-32 sm:w-32">
                  <ClientArt kind={SLOT_ART[g.key] ?? "shop"} />
                </span>
                <span className="text-[1.1rem] font-semibold text-wd-ink">{g.label}</span>
                <span className="-mt-1 text-[0.84rem] text-wd-text">{amount > 0 ? `Anggaran ${formatRupiah(amount)}` : "Belum ada vendor"}</span>
                <span className="mt-1 inline-flex min-h-9 items-center rounded-full bg-wd-accent px-4 text-[0.82rem] font-bold text-wd-ink transition-colors group-hover:bg-wd-accent-deep">Cari vendor</span>
              </Link>
            </li>
          );
        })}
        <li className="col-span-2 sm:col-span-1">
          <Link href="/vendors" className="group relative flex min-h-[180px] flex-col justify-between overflow-hidden rounded-[22px] bg-wd-ink p-5 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wd-accent lg:aspect-[4/5]">
            <svg aria-hidden viewBox="0 0 64 40" fill="none" className="absolute -bottom-6 -right-8 h-40 w-64 text-wd-accent opacity-30">
              <circle cx="24" cy="20" r="16" stroke="currentColor" strokeWidth="1.2" />
              <circle cx="40" cy="20" r="16" stroke="currentColor" strokeWidth="1.2" />
            </svg>
            <span className="relative text-[0.74rem] font-semibold uppercase tracking-[0.06em] text-wd-accent">Belum ketemu?</span>
            <span className="relative">
              <span className="wd-display block text-[1.7rem] leading-tight !text-white">Jelajahi semua vendor</span>
              <span className="mt-3 inline-flex min-h-9 items-center rounded-full bg-white px-4 text-[0.82rem] font-bold text-wd-ink">Buka direktori</span>
            </span>
          </Link>
        </li>
      </ul>
    </section>
  );
}

const TILE_TONES = ["bg-[#f2dfaf] text-wd-ink", "bg-wd-ink text-white", "bg-[#ecd7b0] text-wd-ink", "bg-wd-accent-wash text-wd-ink ring-1 ring-wd-line", "bg-[#e9c97f] text-wd-ink"];

function Tools({ budget, doneCount, total, loading }: { budget: BudgetPlan | null; doneCount: number; total: number; loading: boolean }) {
  const items: { href: string; art: ArtKind; title: string; sub: string }[] = [
    { href: "/client/budget", art: "coin", title: "Budget planner", sub: loading ? "…" : budget && budget.total_budget > 0 ? formatRupiah(budget.total_budget) : "Belum diatur" },
    { href: "/client/wedding-planner", art: "clipboard", title: "Checklist", sub: loading ? "…" : total ? `${doneCount} dari ${total} tugas` : "Belum ada tugas" },
    { href: "/client/wedding-planner/guests", art: "people", title: "Tamu & RSVP", sub: "Daftar tamu" },
    { href: "/client/undangan", art: "envelope", title: "Undangan digital", sub: "Pilih tema" },
    { href: "/client/consultation", art: "bubble", title: "Konsultasi", sub: "Gratis" },
  ];
  return (
    <section aria-labelledby="alat-judul" className="wd-container pt-12">
      <h2 id="alat-judul" className="wd-title text-[clamp(1.55rem,2.6vw,2.05rem)] leading-tight">
        Alat persiapan
      </h2>
      <ul className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        {items.map((t, i) => (
          <li key={t.href} className={i === items.length - 1 ? "col-span-2 lg:col-span-1" : ""}>
            <Link href={t.href} className={`group flex min-h-[150px] flex-col justify-between rounded-[22px] p-4 transition-transform duration-300 hover:-translate-y-1 motion-reduce:transition-none motion-reduce:hover:transform-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wd-accent ${TILE_TONES[i % TILE_TONES.length]}`}>
              <span className="block h-16 w-16 transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:-rotate-6 group-hover:scale-110 motion-reduce:transition-none motion-reduce:group-hover:transform-none">
                <ClientArt kind={t.art} />
              </span>
              <span>
                <span className="block text-[1.02rem] font-semibold leading-tight">{t.title}</span>
                <span className="mt-0.5 block text-[0.82rem] tabular-nums opacity-80">{t.sub}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** "Vendor pilihan untukmu": category chips over one swipeable row. */
function Recommended() {
  const directory = useDirectory();
  const [cat, setCat] = useState("");
  const all = useMemo(() => (directory.status === "ready" ? rankVendors(directory.data ?? []) : []), [directory]);
  const chips = useMemo(() => {
    const present = new Set(all.flatMap((c) => vendorCategoryList(c)));
    return VENDOR_CATEGORIES.filter((c) => present.has(c.value)).slice(0, 6);
  }, [all]);
  const shown = (cat ? all.filter((c) => vendorCategoryList(c).includes(cat)) : all).slice(0, 10);
  if (directory.status === "ready" && all.length === 0) return null;
  return (
    <section aria-labelledby="rekomendasi" className="wd-container pt-12">
      <VendorRail
        id="rekomendasi"
        title="Vendor pilihan untukmu"
        sub="Diverifikasi tim DuaCincin, bayar lewat Dana Aman."
        seeAll={{ href: cat ? `/kategori/${cat}` : "/vendors", label: "Semua vendor" }}
        cards={directory.status === "error" ? [] : shown}
        loading={directory.status === "loading"}
      >
        {chips.length > 1 && (
          <div role="group" aria-label="Saring kategori" className="wd-rail -mx-1 mt-5 flex gap-2 overflow-x-auto px-1 pb-1">
            {[{ value: "", label: "Semua" }, ...chips].map((c) => {
              const on = cat === c.value;
              return (
                <button
                  key={c.value || "semua"}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setCat(c.value)}
                  className={`inline-flex min-h-10 shrink-0 items-center rounded-full border px-5 text-[0.92rem] transition-colors ${on ? "border-wd-accent bg-wd-accent font-semibold text-wd-ink" : "border-wd-accent-line text-wd-accent-ink hover:bg-wd-accent-wash"}`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        )}
      </VendorRail>
    </section>
  );
}
