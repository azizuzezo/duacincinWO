"use client";

import { useId, useState } from "react";

import { formatRupiah } from "@/lib/api";

// Defaults confirmed in the code and PRD: DP 30% (server booking/deps.go
// DPPercent), commission 10% unless Admin sets a different rate for the vendor
// (CommissionRate, PRD §8.5). This is an illustration, not a quote.
const DP = 0.3;
const COMMISSION = 0.1;
const MIN = 2_000_000;
const MAX = 150_000_000;
const STEP = 500_000;

/** Interactive example of where a vendor's money is: drag the package price
 * and see the DP and the rest held in escrow, then the transfer after the
 * client confirms the event, minus the default commission. */
export function PayoutCalculator() {
  const id = useId();
  const [price, setPrice] = useState(25_000_000);
  const dp = Math.round(price * DP);
  const rest = price - dp;
  const fee = Math.round(price * COMMISSION);
  const net = price - fee;
  const progress = ((price - MIN) / (MAX - MIN)) * 100;

  const rows = [
    { when: "Client bayar DP (30%)", amount: dp, state: "Ditahan escrow", tone: "gold" },
    { when: "Client melunasi sisanya", amount: rest, state: "Ditahan escrow", tone: "gold" },
    { when: "Client konfirmasi acara selesai", amount: net, state: "Diteruskan ke kamu", tone: "success" },
  ] as const;

  return (
    <div className="rounded-2xl border border-dc-line bg-dc-white p-6 shadow-lift sm:p-8">
      <label htmlFor={id} className="text-sm font-semibold text-dc-text-2">
        Contoh harga paket yang disepakati
      </label>
      <p className="mt-1 font-heading text-[clamp(2.4rem,5vw,3.25rem)] leading-none text-dc-ink [font-variant-numeric:lining-nums_tabular-nums]" aria-live="polite">
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

      <ol className="mt-7 flex flex-col">
        {rows.map((r, i) => (
          <li key={r.when} className="grid grid-cols-[1.25rem_1fr_auto] items-start gap-x-3 border-t border-dc-line py-4">
            <span aria-hidden className={`mt-1.5 h-2.5 w-2.5 rounded-full ${r.tone === "success" ? "bg-dc-success" : "bg-dc-gold"}`} />
            <span>
              <span className="block text-sm font-semibold text-dc-ink">{r.when}</span>
              <span className={`block text-xs font-semibold ${r.tone === "success" ? "text-dc-success" : "text-dc-clay"}`}>{r.state}</span>
            </span>
            <span className={`text-right font-semibold tabular-nums ${i === 2 ? "text-lg text-dc-ink" : "text-dc-text-2"}`}>{formatRupiah(r.amount)}</span>
          </li>
        ))}
      </ol>
      <p className="border-t border-dc-line pt-4 text-sm text-dc-text-2">
        Komisi platform {formatRupiah(fee)} dipotong saat pencairan.
      </p>
      <p className="mt-3 text-xs leading-relaxed text-dc-text-3">
        Contoh dengan komisi standar 10%. Tarif komisi bisa diatur berbeda untuk vendor tertentu oleh Admin DuaCincin. Potongan setiap pencairan bisa kamu lihat di halaman Pencairan.
      </p>
    </div>
  );
}
