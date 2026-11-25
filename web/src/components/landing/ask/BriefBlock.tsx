"use client";

// "Brief → Vendor": Kirana prepares what the couple needs, with the vendors
// that match; the couple edits the open fields, picks who gets it and sends.
// Sending is the visitor's own action (POST /api/v1/briefs, client accounts
// only): each vendor receives the brief as the first message of an ordinary
// chat and replies there. Not signed in yet: the draft is kept for this tab,
// the visitor registers or logs in and comes back to the same card.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { wdButton } from "@/components/home/ui";
import { ApiError, apiPost, formatRupiah } from "@/lib/api";

import type { Block } from "./useAsk";

type Data = Extract<Block, { type: "brief" }>["data"];
type Result = {
  brief_id: string;
  sent: { vendor_id: string; business_name: string; conversation_id: string }[];
  skipped: { vendor_id: string; reason: string }[];
};
type Fields = { event_date: string; guests: string; style: string; notes: string };

const draftKey = (category: string) => `dc_brief_draft_${category}`;

function readDraft(category: string): { fields: Fields; selected: string[] } | null {
  try {
    const raw = sessionStorage.getItem(draftKey(category));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeDraft(category: string, draft: { fields: Fields; selected: string[] } | null) {
  try {
    if (draft) sessionStorage.setItem(draftKey(category), JSON.stringify(draft));
    else sessionStorage.removeItem(draftKey(category));
  } catch {
    /* storage blocked: the visitor just retypes */
  }
}

const inputCls =
  "mt-1.5 block min-h-12 w-full rounded-[14px] border border-wd-line-2 bg-white px-3.5 py-2.5 text-[0.95rem] font-normal text-wd-ink outline-none transition-[border-color,box-shadow] placeholder:text-wd-muted hover:border-wd-muted focus:border-wd-accent-ink focus:shadow-[0_0_0_4px_var(--wd-accent-soft)] focus-visible:outline-none";

export function BriefBlock({ data }: { data: Data }) {
  const router = useRouter();
  const b = data.brief;
  // Back from registering or logging in: pick up where the visitor left off.
  // The card only renders after the chat loaded in the browser, so reading
  // this tab's storage in the initializer cannot mismatch server HTML.
  const [draft] = useState(() => readDraft(b.category));
  const [fields, setFields] = useState<Fields>(
    () =>
      draft?.fields ?? {
        event_date: b.event_date ?? "",
        guests: b.guests ? String(b.guests) : "",
        style: b.style ?? "",
        notes: b.notes ?? "",
      },
  );
  const [selected, setSelected] = useState<string[]>(() =>
    (draft?.selected ?? data.items.map((v) => v.id)).filter((id) => data.items.some((v) => v.id === id)).slice(0, data.max),
  );
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  const set = (k: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setFields((f) => ({ ...f, [k]: e.target.value }));
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length < data.max ? [...s, id] : s));

  async function send() {
    setError("");
    setState("sending");
    try {
      const res = await apiPost<Result>("/api/v1/briefs", {
        category: b.category,
        city: b.city,
        budget_max: b.budget_max,
        event_date: fields.event_date,
        guests: Number(fields.guests.replace(/\D/g, "")) || 0,
        style: fields.style,
        notes: fields.notes,
        vendor_ids: selected,
      });
      writeDraft(b.category, null);
      setResult(res);
      setState("done");
    } catch (e) {
      setState("idle");
      if (e instanceof ApiError && e.status === 401) {
        writeDraft(b.category, { fields, selected });
        const next = encodeURIComponent(window.location.pathname + window.location.search);
        router.push(`/register?role=client&next=${next}`);
        return;
      }
      if (e instanceof ApiError && e.status === 403) {
        setError("Brief hanya bisa dikirim dari akun calon pengantin (client).");
        return;
      }
      setError(e instanceof Error && e.message ? e.message : "Brief belum bisa dikirim, coba lagi.");
    }
  }

  if (state === "done" && result) {
    const names = new Map(data.items.map((v) => [v.id, v.business_name]));
    return (
      <div role="status">
        <p className="inline-flex items-center gap-1.5 text-[0.85rem] font-semibold text-wd-ok">
          <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-10" /></svg>
          Brief terkirim
        </p>
        <h3 className="wd-title mt-1 text-[1.3rem] leading-tight sm:text-[1.45rem]">
          {result.sent.length === 1 ? "1 vendor" : `${result.sent.length} vendor`} sudah menerima brief kamu
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-wd-text">
          Balasan vendor masuk ke chat DuaCincin, dan kamu dapat notifikasi saat ada yang membalas. Semua komunikasi dan pembayaran tetap di dalam DuaCincin.
        </p>
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {result.sent.map((s) => (
            <li key={s.vendor_id} className="rounded-full bg-wd-accent-soft px-3 py-1 text-[0.8rem] font-semibold text-wd-ink">
              {s.business_name}
            </li>
          ))}
        </ul>
        {result.skipped.length > 0 && (
          <p className="mt-2 text-[0.8rem] text-wd-muted">
            Tidak terkirim: {result.skipped.map((s) => `${names.get(s.vendor_id) ?? "vendor"} (${s.reason})`).join(", ")}.
          </p>
        )}
        <Link
          href="/client/messages"
          className={wdButton({ variant: "ink", size: "sm", className: "mt-4 min-h-11" })}
        >
          Buka chat
        </Link>
      </div>
    );
  }

  const n = selected.length;
  return (
    <div>
      <div className="mb-4">
        <p className="wd-kicker text-[1rem]">Brief untuk vendor</p>
        <h3 className="wd-title mt-0.5 text-[1.3rem] leading-tight sm:text-[1.45rem]">
          {data.label}
          {b.city ? ` di ${b.city}` : ""}
        </h3>
        <p className="mt-1.5 text-sm leading-relaxed text-wd-text">
          Lengkapi, pilih vendor, lalu kirim sekali ke semuanya. Mereka membalas lewat chat DuaCincin.
          {b.budget_max > 0 && <> Budget {data.label}: sampai {formatRupiah(b.budget_max)}.</>}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-[0.85rem] font-semibold text-wd-ink">
          Tanggal acara
          <input className={inputCls} value={fields.event_date} onChange={set("event_date")} maxLength={80} placeholder="Contoh: Oktober 2027" autoComplete="off" />
        </label>
        <label className="text-[0.85rem] font-semibold text-wd-ink">
          Jumlah tamu
          <input className={inputCls} value={fields.guests} onChange={set("guests")} inputMode="numeric" maxLength={6} placeholder="Contoh: 300" autoComplete="off" />
        </label>
        <label className="text-[0.85rem] font-semibold text-wd-ink sm:col-span-2">
          Gaya atau adat
          <input className={inputCls} value={fields.style} onChange={set("style")} maxLength={80} placeholder="Contoh: adat Jawa, nuansa sage" autoComplete="off" />
        </label>
        <label className="text-[0.85rem] font-semibold text-wd-ink sm:col-span-2">
          Catatan (opsional)
          <textarea className={`${inputCls} min-h-20 resize-y`} value={fields.notes} onChange={set("notes")} maxLength={500} rows={3} placeholder="Kebutuhan khusus. Jangan tulis nomor HP, email, atau tautan." />
        </label>
      </div>

      <fieldset className="mt-4">
        <legend className="text-[0.85rem] font-semibold text-wd-ink">
          Kirim ke ({n} dari maks. {data.max})
        </legend>
        <ul className="mt-2 grid gap-2">
          {data.items.map((v) => {
            const on = selected.includes(v.id);
            const blocked = !on && n >= data.max;
            return (
              <li key={v.id}>
                <label className={`flex min-h-12 items-center gap-3 rounded-[14px] border px-3.5 py-2.5 transition-[border-color,background-color] duration-200 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-wd-accent-ink ${on ? "border-wd-accent-ink bg-wd-accent-wash" : "border-wd-line bg-white hover:border-wd-line-2"} ${blocked ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}>
                  <input type="checkbox" checked={on} disabled={blocked} onChange={() => toggle(v.id)} className="h-[18px] w-[18px] shrink-0 accent-[var(--wd-accent-ink)]" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-wd-ink">{v.business_name}</span>
                    <span className="block truncate text-[0.78rem] text-wd-muted">
                      {v.city}
                      {v.price_min > 0 ? ` · mulai ${formatRupiah(v.price_min)}` : ""}
                      {v.review_count > 0 ? ` · ${v.average_rating.toFixed(1)} (${v.review_count})` : ""}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={send}
          disabled={n === 0 || state === "sending"}
          aria-busy={state === "sending" || undefined}
          className={wdButton({ size: "sm", className: "min-h-11 shrink-0 px-6" })}
        >
          {state === "sending" ? "Mengirim…" : n === 0 ? "Pilih vendor dulu" : `Kirim ke ${n} vendor`}
        </button>
        <p className="text-[0.78rem] leading-relaxed text-wd-muted">Perlu akun calon pengantin (gratis). Belum punya? Kamu diarahkan mendaftar, lalu kembali ke sini.</p>
      </div>
      <p role="alert" className="mt-3 rounded-xl bg-[#fbeceb] px-4 py-2.5 text-sm text-wd-danger empty:hidden">
        {error}
      </p>
    </div>
  );
}
