"use client";

import { useId, useState } from "react";

import { formatRupiah } from "@/lib/api";

// Defaults confirmed in the code: DP 30% (server booking/deps.go DPPercent),
// commission 10% unless Admin sets a different rate for the vendor
// (repository.DefaultCommissionRate). Commission is added on top of the
// vendor's price, so the vendor receives their price in full. This is an
// illustration, not a quote.
const DP = 0.3;
const COMMISSION = 0.1;
const MIN = 2_000_000;
const MAX = 150_000_000;
const STEP = 500_000;
// Example prices to try in one tap (inputs to the illustration, not market data).
const PRESETS = [10_000_000, 25_000_000, 50_000_000, 100_000_000];

/** Interactive example of where a vendor's money is: drag the package price
 * and see what the couple pays (price plus commission), the DP and the rest
 * held in escrow, then the vendor's full price transferred after the event. */
export function PayoutCalculator() {
  const id = useId();
  const [price, setPrice] = useState(25_000_000);
  const total = Math.round(price * (1 + COMMISSION));
  const dp = Math.round(total * DP);
  const rest = total - dp;
  const fee = total - price;
  const net = price;
  const progress = ((price - MIN) / (MAX - MIN)) * 100;

  const rows = [
    {
      when: "Client bayar DP (30%)",
      amount: dp,
      state: "Ditahan escrow",
      tone: "gold",
    },
    {
      when: "Client melunasi sisanya",
      amount: rest,
      state: "Ditahan escrow",
      tone: "gold",
    },
    {
      when: "Client konfirmasi acara selesai",
      amount: net,
      state: "Diteruskan ke kamu",
      tone: "success",
    },
  ] as const;

  return (
    <div className="rounded-[24px] border border-wd-line bg-white p-6 shadow-wd-card sm:p-8">
      <label htmlFor={id} className="text-sm font-semibold text-dc-text-2">
        Contoh harga paketmu
      </label>
      <p
        className="mt-1 text-[clamp(1.9rem,4vw,2.5rem)] font-semibold leading-none tracking-[-0.02em] text-wd-ink [font-variant-numeric:lining-nums_tabular-nums]"
        aria-live="polite"
      >
        {formatRupiah(price)}
      </p>
      <input
        id={id}
        type="range"
        min={MIN}
        max={MAX}
        step={STEP}
        value={price}
        onChange={(e) => setPrice(Number(e.target.value))}
        aria-valuetext={formatRupiah(price)}
        className="dc-slider mt-5"
        style={{ "--progress": `${progress}%` } as React.CSSProperties}
      />
      <div className="mt-1 flex justify-between text-xs text-dc-text-3">
        <span>{formatRupiah(MIN)}</span>
        <span>{formatRupiah(MAX)}</span>
      </div>
      <div
        role="group"
        aria-label="Contoh harga cepat"
        className="mt-4 flex flex-wrap gap-2"
      >
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            aria-pressed={price === p}
            onClick={() => setPrice(p)}
            className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold tabular-nums transition-colors duration-300 active:scale-95 ${
              price === p
                ? "border-wd-accent bg-wd-accent text-wd-ink"
                : "border-wd-line-2 bg-white text-wd-ink hover:border-wd-ink"
            }`}
          >
            {p / 1_000_000} jt
          </button>
        ))}
      </div>

      {/* What the couple pays, split into your price (transferred to you
          after the event) and the service fee on top, with the DP share
          marked. Widths follow the numbers and glide when the price changes,
          so the reader sees the shares stay the same at any price. */}
      <div className="mt-7">
        <p className="text-sm font-semibold text-dc-text-2">
          Yang dibayar calon pengantin:{" "}
          <span className="tabular-nums text-wd-ink">
            {formatRupiah(total)}
          </span>
        </p>
        <div aria-hidden className="relative mt-2.5">
          <div className="flex h-3 overflow-hidden rounded-full bg-wd-blush">
            <span
              className="h-full bg-wd-accent"
              style={{ flexBasis: `${(price / total) * 100}%` }}
            />
            <span
              className="h-full border-l-2 border-white bg-wd-line-2"
              style={{ flexBasis: `${(fee / total) * 100}%` }}
            />
          </div>
          <span
            className="absolute -top-1 h-5 w-0.5 rounded-full bg-wd-ink"
            style={{ left: `${(dp / total) * 100}%` }}
          />
        </div>
        <ul className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1 text-xs text-dc-text-2">
          <li className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="h-2.5 w-2.5 rounded-full bg-wd-accent"
            />
            Hargamu, utuh
          </li>
          <li className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="h-2.5 w-2.5 rounded-full bg-wd-line-2"
            />
            Biaya layanan
          </li>
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="h-3 w-0.5 rounded-full bg-wd-ink" />
            Batas DP 30%
          </li>
        </ul>
      </div>
      <ol className="mt-6 flex flex-col">
        {rows.map((r, i) => (
          <li
            key={r.when}
            className={`grid grid-cols-[1.25rem_1fr_auto] items-start gap-x-3 border-t border-dc-line py-4 ${i === 2 ? "-mx-3 rounded-[14px] border-t-0 bg-[#eef4ef] px-3" : ""}`}
          >
            <span
              aria-hidden
              className={`mt-1.5 h-2.5 w-2.5 rounded-full ${r.tone === "success" ? "bg-dc-success" : "bg-dc-gold"}`}
            />
            <span>
              <span className="block text-sm font-semibold text-dc-ink">
                {r.when}
              </span>
              <span
                className={`block text-xs font-semibold ${r.tone === "success" ? "text-dc-success" : "text-dc-clay"}`}
              >
                {r.state}
              </span>
            </span>
            <span
              className={`text-right font-semibold tabular-nums ${i === 2 ? "text-lg text-dc-ink" : "text-dc-text-2"}`}
            >
              {formatRupiah(r.amount)}
            </span>
          </li>
        ))}
      </ol>
      <p className="border-t border-dc-line pt-4 text-sm text-dc-text-2">
        Calon pengantin membayar {formatRupiah(total)}, sudah termasuk biaya
        layanan DuaCincin {formatRupiah(fee)}. Hargamu tidak dipotong.
      </p>
      <p className="mt-3 text-xs leading-relaxed text-dc-text-3">
        Contoh dengan komisi standar 10%. Tarif komisi bisa diatur berbeda untuk
        vendor tertentu oleh Admin DuaCincin. Rincian setiap pencairan bisa kamu
        lihat di halaman Pencairan.
      </p>
    </div>
  );
}
