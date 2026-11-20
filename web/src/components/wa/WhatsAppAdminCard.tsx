"use client";

import { useCallback, useEffect, useState } from "react";

import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { apiGet } from "@/lib/api";

type Status = {
  official: "connected" | "disconnected" | "unknown" | "not_configured";
  official_tail: string;
  manage_url: string;
  clients_verified: number;
  clients_missing: number;
  vendors_verified: number;
  vendors_missing: number;
};

const OFFICIAL: Record<Status["official"], { label: string; dot: string; note: string }> = {
  connected: { label: "Terhubung", dot: "bg-dc-success", note: "Notifikasi chat dan kode verifikasi terkirim lewat nomor resmi." },
  disconnected: {
    label: "Terputus",
    dot: "bg-dc-danger",
    note: "Pesan ke WhatsApp dan kode verifikasi tidak terkirim. Chat di web tetap aman. Scan ulang QR di panel admin undangan.",
  },
  unknown: { label: "Tidak bisa dicek", dot: "bg-dc-gold", note: "Mesin WhatsApp tidak menjawab. Cek panel admin undangan." },
  not_configured: { label: "Belum diatur", dot: "bg-dc-text-3", note: "WA_RELAY_URL belum diisi di server." },
};

/** Admin dashboard: is the shared official number up, and who has verified a number. */
export function WhatsAppAdminCard({ refreshKey = 0 }: { refreshKey?: number }) {
  const [s, setS] = useState<Status | null>(null);
  const [failed, setFailed] = useState(false);

  const fetchStatus = useCallback(
    () =>
      apiGet<Status>("/api/v1/whatsapp/admin/status")
        .then((v) => {
          setS(v);
          setFailed(false);
        })
        .catch(() => setFailed(true)),
    [],
  );
  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus, refreshKey]);
  const load = () => {
    setS(null);
    void fetchStatus();
  };

  const o = s ? OFFICIAL[s.official] : null;
  return (
    <section aria-labelledby="wa-title" className="min-w-0">
      <div className="mb-4 flex min-h-11 items-end justify-between gap-3">
        <h2 id="wa-title" className="font-heading text-3xl text-dc-ink">
          WhatsApp
        </h2>
        <button
          type="button"
          onClick={load}
          className="inline-flex min-h-11 items-center text-sm font-semibold text-dc-clay underline-offset-4 hover:underline"
        >
          Cek ulang
        </button>
      </div>
      <Card>
        {failed ? (
          <p className="px-5 py-5 text-sm text-dc-text-2">Status WhatsApp belum bisa dimuat.</p>
        ) : !s || !o ? (
          <div className="flex flex-col gap-3 px-5 py-5">
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : (
          <div className="divide-y divide-dc-line">
            <div className="px-5 py-4">
              <p className="text-sm text-dc-text-2">Nomor resmi DuaCincin{s.official_tail ? ` (…${s.official_tail})` : ""}</p>
              <p className="mt-1 flex items-center gap-2 font-semibold text-dc-ink" role="status">
                <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${o.dot}`} />
                {o.label}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-dc-text-2">{o.note}</p>
              {s.official !== "connected" && s.official !== "not_configured" && (
                <a
                  href={s.manage_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex min-h-11 items-center rounded-full bg-dc-ink px-5 text-sm font-semibold text-dc-on-dark hover:bg-dc-ink-2"
                >
                  Hubungkan ulang
                </a>
              )}
            </div>
            <dl className="grid grid-cols-2 divide-x divide-dc-line">
              {[
                { label: "Klien", ok: s.clients_verified, missing: s.clients_missing },
                { label: "Vendor aktif", ok: s.vendors_verified, missing: s.vendors_missing },
              ].map((r) => (
                <div key={r.label} className="px-5 py-4">
                  <dt className="text-sm text-dc-text-2">{r.label}</dt>
                  <dd className="mt-1 font-heading text-3xl font-semibold text-dc-ink [font-variant-numeric:lining-nums_tabular-nums]">{r.ok}</dd>
                  <dd className="text-xs text-dc-text-3">
                    dari {r.ok + r.missing} sudah verifikasi WA{r.missing > 0 ? ` · ${r.missing} belum` : ""}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </Card>
    </section>
  );
}
