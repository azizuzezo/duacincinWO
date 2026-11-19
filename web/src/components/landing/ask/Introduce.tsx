"use client";

// Kirana's first hello: she asks a new visitor's name and age (age
// optional), inside the chat as her own message, so next time she can greet
// them "Halo Kak Rina!". Can be skipped; skipping is remembered in this
// browser only. Stored server side with the conversation (PUT /ai/profile).
import { motion } from "framer-motion";
import { useState, type FormEvent } from "react";

import { EASE, useReducedMotion } from "@/lib/motion";

import { KiranaFace } from "./Kirana3D";

export const SKIP_KEY = "dc-kirana-intro-skip";

export function Introduce({ onSave, onSkip }: { onSave: (name: string, age: number) => Promise<string | null>; onSkip: () => void }) {
  const reduced = useReducedMotion();
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Namanya diisi dulu ya.");
      return;
    }
    const n = age.trim() ? Number(age) : 0;
    if (age.trim() && (!Number.isInteger(n) || n < 15 || n > 99)) {
      setError("Umur diisi angka 15 sampai 99, atau kosongkan saja.");
      return;
    }
    setSaving(true);
    setError((await onSave(name, n)) ?? "");
    setSaving(false);
  }

  return (
    <motion.div
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.55, ease: EASE, delay: 0.2 }}
      className="mx-auto w-full max-w-md text-left"
    >
      <div className="flex items-center gap-2.5">
        <KiranaFace size={40} mood="happy" />
        <span className="text-sm font-bold text-dc-ink">Kirana</span>
      </div>
      <form onSubmit={submit} className="mt-3 rounded-[22px] rounded-tl-md border border-dc-line/70 bg-dc-white/92 p-4 shadow-soft sm:p-5">
        <p className="text-[1rem] leading-relaxed text-dc-black">
          Hai, aku <strong className="font-semibold text-dc-ink">Kirana</strong>! Sebelum mulai, boleh kenalan dulu? Biar nanti aku bisa sapa kamu dengan nama.
        </p>
        <div className="mt-4 grid grid-cols-[1fr_96px] gap-2.5">
          <label className="block">
            <span className="text-xs font-semibold text-dc-text-2">Nama panggilan</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              autoComplete="given-name"
              placeholder="Misalnya Rina"
              className="mt-1 block min-h-12 w-full rounded-md border border-dc-line-strong bg-dc-white px-3.5 text-base text-dc-ink outline-none transition-[border-color,box-shadow] focus:border-dc-gold focus:shadow-[0_0_0_4px_rgb(184_146_74_/_0.15)]"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-dc-text-2">Umur</span>
            <input
              value={age}
              onChange={(e) => setAge(e.target.value.replace(/\D/g, "").slice(0, 2))}
              inputMode="numeric"
              placeholder="25"
              aria-describedby="umur-opsional"
              className="mt-1 block min-h-12 w-full rounded-md border border-dc-line-strong bg-dc-white px-3.5 text-base text-dc-ink outline-none transition-[border-color,box-shadow] focus:border-dc-gold focus:shadow-[0_0_0_4px_rgb(184_146_74_/_0.15)]"
            />
          </label>
        </div>
        <p id="umur-opsional" className="mt-1.5 text-xs text-dc-text-3">
          Umur boleh dikosongkan. Hanya dipakai Kirana untuk menyapamu.
        </p>
        {error && (
          <p role="alert" className="mt-2 text-sm font-semibold text-dc-danger">
            {error}
          </p>
        )}
        <div className="mt-4 flex items-center justify-between gap-3">
          <button type="button" onClick={onSkip} className="inline-flex min-h-11 items-center rounded-full px-2 text-sm font-semibold text-dc-text-2 hover:text-dc-ink">
            Lewati
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex min-h-12 items-center gap-2 rounded-full bg-linear-135 from-[#e2c27f] via-[#c39c52] to-[#a17d36] px-6 text-[0.95rem] font-bold text-[#1a140c] transition-[transform,box-shadow] duration-300 ease-dc hover:shadow-gold active:scale-95 disabled:opacity-60"
          >
            {saving ? "Menyimpan…" : "Kenalan"}
          </button>
        </div>
      </form>
    </motion.div>
  );
}
