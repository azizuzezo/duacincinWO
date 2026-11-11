"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { GrowBar } from "@/app/client/_motion";
import { FOCUS, LINK, Skeleton } from "@/app/client/_ui";
import { CLIENT_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DonutChart } from "@/components/ui/DonutChart";
import { CountUp } from "@/components/ui/Motion";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/Field";
import { PageHeader } from "@/components/ui/PageHeader";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { WithUser } from "@/components/WithUser";
import { apiGet, apiPut, ApiError, formatRupiah, categoryLabel, type BudgetPlan, type CurrentUser, type SpentByCategory } from "@/lib/api";
import {
  BUDGET_CATEGORIES,
  BUDGET_CATEGORY_COLORS,
  defaultCategoryState,
  rescale,
  spentForBudgetCategory,
  type BudgetCategoryKey,
} from "@/lib/budget";
import { GoldArch } from "@/components/ornament/GoldArch";

export default function BudgetPlannerPage() {
  return (
    <WithUser allowedRoles={["client"]} loginPath="/login">
      {(user) => <BudgetPlannerContent user={user} />}
    </WithUser>
  );
}

type CategoryState = { category: BudgetCategoryKey; percentage: number };
type Saved = { total: number; guests: number; categories: CategoryState[] };

const digits = (v: string) => v.replace(/\D/g, "").slice(0, 15);
const grouped = (v: string) => (v ? Number(v).toLocaleString("id-ID") : "");
const sameSplit = (a: CategoryState[], b: CategoryState[]) => a.every((c, i) => c.category === b[i]?.category && c.percentage === b[i]?.percentage);

function BudgetPlannerContent({ user }: { user: CurrentUser }) {
  const [totalBudget, setTotalBudget] = useState("");
  const [guestCount, setGuestCount] = useState("");
  const [categories, setCategories] = useState<CategoryState[]>(defaultCategoryState());
  const [saved, setSaved] = useState<Saved>({ total: 0, guests: 0, categories: defaultCategoryState() });
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [spentByCategory, setSpentByCategory] = useState<SpentByCategory>({});
  const [sheetOpen, setSheetOpen] = useState(false);
  // Draft values inside the "Ubah total" sheet, so cancelling leaves the page as it was.
  const [draftTotal, setDraftTotal] = useState("");
  const [draftGuests, setDraftGuests] = useState("");
  const { show } = useToast();

  function applyPlan(plan: BudgetPlan) {
    const cats = BUDGET_CATEGORIES.map((meta) => {
      const found = plan.categories.find((c) => c.category === meta.key);
      return { category: meta.key, percentage: found?.percentage ?? meta.defaultPercentage };
    });
    setTotalBudget(plan.total_budget ? String(plan.total_budget) : "");
    setGuestCount(plan.guest_count ? String(plan.guest_count) : "");
    setCategories(cats);
    setSaved({ total: plan.total_budget || 0, guests: plan.guest_count || 0, categories: cats });
  }

  function load() {
    setLoading(true);
    setLoadFailed(false);
    apiGet<BudgetPlan>("/api/v1/budget-plan/me")
      .then(applyPlan)
      .catch(() => setLoadFailed(true)) // the server answers an empty plan when none exists, so a failure is a real error
      .finally(() => setLoading(false));
    apiGet<SpentByCategory>("/api/v1/bookings/spent-by-category")
      .then((d) => setSpentByCategory(d ?? {}))
      .catch(() => {});
  }

  useEffect(() => {
    queueMicrotask(load);
    // Load once on mount; `load` is also the retry handler.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = Number(totalBudget) || 0;
  const guests = Number(guestCount) || 0;
  const spentTotal = BUDGET_CATEGORIES.reduce((s, m) => s + spentForBudgetCategory(spentByCategory, m.key), 0);
  const dirty = total !== saved.total || guests !== saved.guests || !sameSplit(categories, saved.categories);
  const isDefaultSplit = sameSplit(categories, defaultCategoryState());

  async function save(next: { total: number; guests: number; categories: CategoryState[] }): Promise<boolean> {
    setError(null);
    setSaving(true);
    try {
      const plan = await apiPut<BudgetPlan>("/api/v1/budget-plan", {
        total_budget: next.total,
        guest_count: next.guests,
        categories: next.categories,
      });
      applyPlan(plan);
      show("Anggaran tersimpan", "success");
      return true;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menyimpan budget plan.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  function openSheet() {
    setDraftTotal(totalBudget);
    setDraftGuests(guestCount);
    setError(null);
    setSheetOpen(true);
  }

  async function saveTotals(e: React.FormEvent) {
    e.preventDefault();
    const ok = await save({ total: Number(draftTotal) || 0, guests: Number(draftGuests) || 0, categories });
    if (ok) setSheetOpen(false);
  }

  return (
    <Shell user={user} navItems={CLIENT_NAV} loginPath="/login" eyebrow="Client">
      <div className={`mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 ${dirty ? "pb-44 md:pb-32" : ""}`}>
        <PageHeader
          eyebrow="Keuangan"
          title={
            <>
              Anggaran <span className="dc-em">pernikahan</span>
            </>
          }
          subtitle="Berapa yang kalian punya, ke mana uangnya pergi, dan berapa yang masih tersisa."
        />

        {loading ? (
          <div role="status" aria-label="Memuat anggaran" className="flex flex-col gap-5">
            <Skeleton className="h-64 rounded-2xl" />
            <div className="grid gap-5 lg:grid-cols-12">
              <Skeleton className="h-80 rounded-xl lg:col-span-5" />
              <Skeleton className="h-80 rounded-xl lg:col-span-7" />
            </div>
          </div>
        ) : loadFailed ? (
          <ErrorState title="Anggaran belum bisa dimuat" body="Periksa koneksi internetmu, lalu coba lagi. Angka yang sudah tersimpan tetap aman." onRetry={load} />
        ) : (
          <>
            {saved.total > 0 ? (
              <Summary total={total} guests={guests} spent={spentTotal} onEdit={openSheet} />
            ) : (
              <StartCard
                totalBudget={totalBudget}
                guestCount={guestCount}
                setTotalBudget={setTotalBudget}
                setGuestCount={setGuestCount}
                saving={saving}
                error={sheetOpen ? null : error}
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!total) {
                    setError("Tulis total anggaran dulu, misalnya 150.000.000.");
                    return;
                  }
                  void save({ total, guests, categories });
                }}
              />
            )}

            <section aria-labelledby="pembagian" className="mt-14">
              <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
                <div>
                  <h2 id="pembagian" className="font-heading text-[1.75rem] leading-tight text-dc-ink sm:text-[2rem]">
                    Ke mana uangnya pergi
                  </h2>
                  <p className="mt-1 max-w-2xl text-sm leading-relaxed text-dc-text-2">
                    Geser atau ketik persen tiap kategori. Kategori lain menyesuaikan otomatis supaya totalnya tetap 100%.
                  </p>
                </div>
                {!isDefaultSplit && (
                  <Button variant="quiet" size="sm" onClick={() => setCategories(defaultCategoryState())}>
                    Kembalikan ke pembagian saran
                  </Button>
                )}
              </div>

              <div className="mt-6 grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
                <SplitChart className="lg:col-span-5 lg:sticky lg:top-6" categories={categories} total={total} />
                <ul className="flex flex-col gap-4 lg:col-span-7">
                  {BUDGET_CATEGORIES.map((meta, i) => {
                    const state = categories.find((c) => c.category === meta.key)!;
                    return (
                      <CategoryRow
                        key={meta.key}
                        index={i}
                        meta={meta}
                        percentage={state.percentage}
                        total={total}
                        spent={spentForBudgetCategory(spentByCategory, meta.key)}
                        onChange={(v) => setCategories((prev) => rescale(prev, meta.key, v))}
                      />
                    );
                  })}
                </ul>
              </div>
            </section>
          </>
        )}
      </div>

      {/* Sticky save bar: appears only when something changed, above the mobile tab bar. */}
      {!loading && !loadFailed && dirty && (
        <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 px-3 md:bottom-5 md:left-[272px] md:px-6">
          <div role="region" aria-label="Simpan perubahan" className="mx-auto flex max-w-3xl animate-fade-up flex-wrap items-center justify-between gap-3 rounded-2xl border border-dc-line bg-dc-white px-4 py-3 shadow-float sm:px-5">
            <div className="min-w-0">
              <p className="font-semibold text-dc-ink">Perubahan belum disimpan</p>
              {error && !sheetOpen ? (
                <p role="alert" className="text-sm text-dc-danger">
                  {error}
                </p>
              ) : (
                <p className="text-sm text-dc-text-2">Simpan supaya pembagian ini dipakai di rekomendasi vendor.</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setTotalBudget(saved.total ? String(saved.total) : "");
                  setGuestCount(saved.guests ? String(saved.guests) : "");
                  setCategories(saved.categories);
                  setError(null);
                }}
              >
                Batalkan
              </Button>
              <Button variant="primary" size="sm" loading={saving} onClick={() => void save({ total, guests, categories })}>
                Simpan anggaran
              </Button>
            </div>
          </div>
        </div>
      )}

      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Ubah total anggaran"
        description="Pembagian per kategori tetap, nominalnya ikut menyesuaikan."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setSheetOpen(false)}>
              Batal
            </Button>
            <Button type="submit" form="form-total" variant="primary" loading={saving}>
              Simpan
            </Button>
          </div>
        }
      >
        <form id="form-total" onSubmit={saveTotals} className="flex flex-col gap-5">
          <Input
            label="Total anggaran (Rp)"
            inputMode="numeric"
            autoComplete="off"
            value={grouped(draftTotal)}
            onChange={(e) => setDraftTotal(digits(e.target.value))}
            hint={Number(draftTotal) > 0 ? formatRupiah(Number(draftTotal)) : "Contoh: 150.000.000"}
          />
          <Input
            label="Jumlah tamu"
            optional
            inputMode="numeric"
            autoComplete="off"
            value={grouped(draftGuests)}
            onChange={(e) => setDraftGuests(digits(e.target.value))}
            hint={
              Number(draftTotal) > 0 && Number(draftGuests) > 0
                ? `Sekitar ${formatRupiah(Math.round(Number(draftTotal) / Number(draftGuests)))} per tamu`
                : "Dipakai untuk menghitung biaya per tamu."
            }
          />
          {error && sheetOpen && (
            <p role="alert" className="text-sm text-dc-danger">
              {error}
            </p>
          )}
        </form>
      </Sheet>
    </Shell>
  );
}

/** First visit: no total yet. One question, answered inline. */
function StartCard({
  totalBudget,
  guestCount,
  setTotalBudget,
  setGuestCount,
  saving,
  error,
  onSubmit,
}: {
  totalBudget: string;
  guestCount: string;
  setTotalBudget: (v: string) => void;
  setGuestCount: (v: string) => void;
  saving: boolean;
  error: string | null;
  onSubmit: (e: React.FormEvent) => void;
}) {
  const total = Number(totalBudget) || 0;
  return (
    <section aria-labelledby="mulai" className="relative overflow-hidden rounded-2xl border border-dc-line bg-dc-white p-6 shadow-soft sm:p-8 lg:p-10">
      <ArchArt />
      <div className="relative max-w-xl">
        <h2 id="mulai" className="font-heading text-[2rem] leading-tight text-dc-ink sm:text-[2.4rem]">
          Berapa total anggaran kalian?
        </h2>
        <p className="mt-2 leading-relaxed text-dc-text-2">
          Tulis satu angka. DuaCincin membaginya ke tiap kategori vendor dengan pembagian yang umum dipakai, lalu kalian bisa menyesuaikannya.
        </p>
        <form onSubmit={onSubmit} className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Total anggaran (Rp)"
            inputMode="numeric"
            autoComplete="off"
            placeholder="150.000.000"
            value={grouped(totalBudget)}
            onChange={(e) => setTotalBudget(digits(e.target.value))}
            hint={total > 0 ? formatRupiah(total) : undefined}
            error={error ?? undefined}
          />
          <Input
            label="Jumlah tamu"
            optional
            inputMode="numeric"
            autoComplete="off"
            placeholder="300"
            value={grouped(guestCount)}
            onChange={(e) => setGuestCount(digits(e.target.value))}
          />
          <div className="sm:col-span-2">
            <Button type="submit" variant="gold" size="md" loading={saving}>
              Simpan dan bagi otomatis
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}

/** The headline numbers: what is left, what is committed in bookings, per guest. */
function Summary({ total, guests, spent, onEdit }: { total: number; guests: number; spent: number; onEdit: () => void }) {
  const left = total - spent;
  const over = left < 0;
  const usedPct = total > 0 ? Math.min(100, Math.round((spent / total) * 100)) : 0;

  return (
    <section aria-labelledby="ringkasan-anggaran" className="relative overflow-hidden rounded-2xl border border-dc-line bg-dc-white p-6 shadow-soft sm:p-8 lg:p-10">
      <ArchArt />
      <div className="relative lg:max-w-[62%]">
        <h2 id="ringkasan-anggaran" className="text-sm font-semibold text-dc-text-2">
          {over ? "Booking melewati anggaran" : "Sisa anggaran"}
        </h2>
        <p
          className={`mt-1 break-words font-heading text-[2.75rem] font-semibold leading-none [font-variant-numeric:lining-nums_tabular-nums] sm:text-[4rem] ${
            over ? "text-dc-danger" : "text-dc-ink"
          }`}
        >
          {over && "Lewat "}
          <CountUp value={over ? -left : left} format={formatRupiah} />
        </p>
        <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-dc-text-2">
          <span>
            {usedPct}% sudah disepakati dari total <span className="font-semibold text-dc-ink tabular-nums">{formatRupiah(total)}</span>
          </span>
          <button type="button" onClick={onEdit} className={`inline-flex min-h-11 items-center gap-1.5 font-semibold text-dc-clay underline underline-offset-4 ${FOCUS}`}>
            <svg aria-hidden width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 20h4L19 9l-4-4L4 16v4Z" />
            </svg>
            Ubah total
          </button>
        </p>

        <GrowBar pct={usedPct} tone={over ? "danger" : "gold"} label="Bagian anggaran yang sudah disepakati di booking" className="mt-6 h-3" />

        <dl className="mt-5 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-3">
          <div>
            <dt className="flex items-center gap-2 text-sm text-dc-text-2">
              <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${over ? "bg-dc-danger" : "bg-dc-gold"}`} />
              Disepakati di booking
            </dt>
            <dd className="mt-1 font-heading text-2xl font-semibold text-dc-ink [font-variant-numeric:lining-nums_tabular-nums]">{formatRupiah(spent)}</dd>
          </div>
          <div>
            <dt className="flex items-center gap-2 text-sm text-dc-text-2">
              <span aria-hidden className="h-2.5 w-2.5 rounded-full border border-dc-line-strong bg-dc-cream" />
              Belum terpakai
            </dt>
            <dd className="mt-1 font-heading text-2xl font-semibold text-dc-ink [font-variant-numeric:lining-nums_tabular-nums]">{formatRupiah(Math.max(0, left))}</dd>
          </div>
          {guests > 0 && (
            <div>
              <dt className="text-sm text-dc-text-2">Per tamu ({guests.toLocaleString("id-ID")} tamu)</dt>
              <dd className="mt-1 font-heading text-2xl font-semibold text-dc-ink [font-variant-numeric:lining-nums_tabular-nums]">
                {formatRupiah(Math.round(total / guests))}
              </dd>
            </div>
          )}
        </dl>

        <p className="mt-6 flex items-start gap-2.5 border-t border-dc-line pt-4 text-sm leading-relaxed text-dc-text-2">
          <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-dc-clay">
            <path d="M12 3 4 6v6c0 4.5 3.4 8.2 8 9 4.6-.8 8-4.5 8-9V6l-8-3Z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
          <span>
            Angka disepakati diambil dari harga di booking kalian. Uang yang kalian bayar ditahan escrow DuaCincin dan baru diteruskan ke vendor setelah acara selesai.{" "}
            <Link href="/client/bookings" className={`font-semibold text-dc-clay underline underline-offset-4 ${FOCUS}`}>
              Lihat status dana
            </Link>
          </span>
        </p>
      </div>
    </section>
  );
}

/** Donut plus a text legend (color is never the only cue). */
function SplitChart({ categories, total, className }: { categories: CategoryState[]; total: number; className: string }) {
  return (
    <Card className={`p-6 ${className}`}>
      <h3 className="font-heading text-2xl text-dc-ink">Pembagian anggaran</h3>
      <div className="mt-5 flex flex-col items-center gap-6 sm:flex-row sm:items-center lg:flex-col xl:flex-row">
        <div className="relative shrink-0">
          <DonutChart
            size={180}
            segments={categories.map((c) => ({ label: BUDGET_CATEGORIES.find((m) => m.key === c.category)?.label ?? c.category, value: c.percentage }))}
            colors={categories.map((c) => BUDGET_CATEGORY_COLORS[c.category])}
          />
          <div aria-hidden className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-xs text-dc-text-3">Total</span>
            <span className="font-heading text-xl font-semibold leading-tight text-dc-ink [font-variant-numeric:lining-nums]">{total > 0 ? compactRupiah(total) : "100%"}</span>
          </div>
        </div>
        <ul className="grid w-full grid-cols-1 gap-2 text-sm">
          {categories.map((c) => {
            const meta = BUDGET_CATEGORIES.find((m) => m.key === c.category)!;
            return (
              <li key={c.category} className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2 text-dc-ink">
                  <span aria-hidden className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: BUDGET_CATEGORY_COLORS[c.category] }} />
                  <span className="truncate">{meta.label}</span>
                </span>
                <span className="shrink-0 font-semibold tabular-nums text-dc-text-2">{formatPct(c.percentage)}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </Card>
  );
}

function CategoryRow({
  index,
  meta,
  percentage,
  total,
  spent,
  onChange,
}: {
  index: number;
  meta: (typeof BUDGET_CATEGORIES)[number];
  percentage: number;
  total: number;
  spent: number;
  onChange: (v: number) => void;
}) {
  const amount = Math.round((total * percentage) / 100);
  const over = total > 0 && spent > amount;
  const usedPct = amount > 0 ? Math.min(100, Math.round((spent / amount) * 100)) : spent > 0 ? 100 : 0;
  const sliderId = `slider-${meta.key}`;
  const pctId = `pct-${meta.key}`;

  return (
    // Rows enter one after another in reading order (stagger), once.
    <li
      className={`animate-fade-up rounded-xl border bg-dc-white p-5 shadow-soft transition-colors ${over ? "border-dc-danger/40" : "border-dc-line"}`}
      style={{ animationDelay: `${80 + index * 50}ms` }}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <label htmlFor={sliderId} className="flex items-center gap-2 font-semibold text-dc-ink">
            <span aria-hidden className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: BUDGET_CATEGORY_COLORS[meta.key] }} />
            {meta.label}
          </label>
          {total > 0 && <p className="mt-1 font-heading text-[1.75rem] font-semibold leading-tight text-dc-ink [font-variant-numeric:lining-nums_tabular-nums]">{formatRupiah(amount)}</p>}
        </div>
        <div className="flex items-center gap-2">
          {over && <Badge tone="danger">Lewat rencana</Badge>}
          <label htmlFor={pctId} className="sr-only">
            Persen untuk {meta.label}
          </label>
          <div className="relative">
            <PercentInput id={pctId} value={percentage} onCommit={onChange} />
            <span aria-hidden className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-dc-text-3">
              %
            </span>
          </div>
        </div>
      </div>

      <input
        id={sliderId}
        type="range"
        min={0}
        max={100}
        step={1}
        value={percentage}
        aria-valuetext={`${formatPct(percentage)}${total > 0 ? `, ${formatRupiah(amount)}` : ""}`}
        onChange={(e) => onChange(Number(e.target.value))}
        className="dc-slider mt-3"
        // 44px touch target; the painted track stays 6px (content box only).
        style={{ ["--progress" as string]: `${percentage}%`, height: 44, padding: "19px 0", backgroundClip: "content-box", boxSizing: "border-box" }}
      />

      {spent > 0 && (
        <div className="mt-2">
          <GrowBar pct={usedPct} tone={over ? "danger" : "ink"} label={`Bagian rencana ${meta.label} yang sudah disepakati`} className="h-1.5" />
          <p className={`mt-1.5 text-sm tabular-nums ${over ? "text-dc-danger" : "text-dc-text-2"}`}>
            {over
              ? `Booking ${formatRupiah(spent)}, lewat ${formatRupiah(spent - amount)} dari rencana`
              : `Disepakati ${formatRupiah(spent)} dari ${formatRupiah(amount)}, sisa ${formatRupiah(amount - spent)}`}
          </p>
        </div>
      )}

      {meta.vendorCategories && total > 0 && (
        <div className="mt-2 flex flex-wrap gap-x-5">
          {meta.vendorCategories.map((vc) => (
            <Link key={vc} href={`/vendors?category=${vc}&max_price=${amount}`} className={LINK}>
              {meta.vendorCategories!.length > 1 ? `Cari ${categoryLabel(vc).toLowerCase()}` : "Cari vendor"} sesuai rencana
            </Link>
          ))}
        </div>
      )}
    </li>
  );
}

/** Gold arch ornament at the right edge of the hero card, large screens only. */
function ArchArt() {
  return (
    <div aria-hidden className="pointer-events-none absolute -bottom-2 right-0 hidden w-[34%] max-w-[380px] lg:block">
      <GoldArch className="h-auto w-full opacity-30" />
    </div>
  );
}

/** Percent field: typing is free (it may be empty for a moment); the value is
 * applied live when it is a number and clamped to 0 to 100 on blur or Enter. */
function PercentInput({ id, value, onCommit }: { id: string; value: number; onCommit: (v: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft === null) return;
    const v = Number(draft.replace(",", "."));
    if (draft.trim() !== "" && Number.isFinite(v)) onCommit(Math.min(100, Math.max(0, v)));
    setDraft(null);
  };
  return (
    <input
      id={id}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={draft ?? String(value).replace(".", ",")}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^\d.,]/g, "").slice(0, 5);
        setDraft(raw);
        const v = Number(raw.replace(",", "."));
        if (raw.trim() !== "" && Number.isFinite(v) && v >= 0 && v <= 100) onCommit(v);
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        }
      }}
      className={`h-11 w-[5.5rem] rounded-md border border-dc-line-strong bg-dc-white pl-3 pr-7 text-right font-semibold tabular-nums text-dc-ink hover:border-dc-text-3 focus:border-dc-gold ${FOCUS}`}
    />
  );
}

function formatPct(v: number): string {
  return `${v.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`;
}

/** "Rp250 jt" style for the donut centre, where a full figure does not fit. */
function compactRupiah(v: number): string {
  if (v >= 1e9) return `Rp${(v / 1e9).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M`;
  if (v >= 1e6) return `Rp${(v / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`;
  return formatRupiah(v);
}
