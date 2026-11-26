"use client";

// The couple's wedding day, set once. It fills the date of every booking
// request (the couple can still change it there) and drives the countdown on
// the dashboard. Saved with PUT /api/v1/me/wedding-date.
import { useState } from "react";

import { TanggalPicker, formatTanggal, todayIso } from "@/app/vendors/[id]/_ui/TanggalPicker";
import { wdButton } from "@/components/home/ui";
import { apiPut, ApiError } from "@/lib/api";

export function WeddingDateField({ value, onSaved, compact = false }: { value: string; onSaved: (v: string) => void; compact?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(next: string) {
    setSaving(true);
    setError(null);
    try {
      await apiPut("/api/v1/me/wedding-date", { wedding_date: next });
      onSaved(next);
      setEditing(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Tanggal belum bisa disimpan, coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  if (value && !editing) {
    return (
      <p className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${compact ? "text-[0.92rem]" : ""} text-wd-text`}>
        <span>
          Tanggal nikah: <span className="font-semibold text-wd-ink">{formatTanggal(value)}</span>
        </span>
        <button
          type="button"
          onClick={() => {
            setDraft(value);
            setEditing(true);
          }}
          className="min-h-9 font-semibold text-wd-accent-ink underline underline-offset-4 hover:text-wd-ink"
        >
          Ubah
        </button>
      </p>
    );
  }

  return (
    <div className="max-w-sm">
      <TanggalPicker label="Tanggal nikah" min={todayIso()} value={draft} onChange={setDraft} error={error} hint={value ? undefined : "Dipakai untuk mengisi tanggal booking otomatis. Bisa kamu ubah kapan saja."} />
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={!draft || saving} onClick={() => void save(draft)} className={wdButton({ size: "sm", variant: "ink" })}>
          {saving ? "Menyimpan…" : "Simpan tanggal"}
        </button>
        {value && (
          <>
            <button type="button" disabled={saving} onClick={() => setEditing(false)} className={wdButton({ size: "sm", variant: "outline" })}>
              Batal
            </button>
            <button type="button" disabled={saving} onClick={() => void save("")} className="min-h-10 px-2 text-sm font-semibold text-wd-muted underline underline-offset-4 hover:text-wd-ink">
              Hapus tanggal
            </button>
          </>
        )}
      </div>
    </div>
  );
}
