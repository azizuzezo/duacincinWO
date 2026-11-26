"use client";

// The profile picture on the account page: the avatar itself is the button to
// pick a photo (camera badge), a crop dialog follows, and the cropped square
// is uploaded to POST /api/v1/me/avatar. Remove goes through DELETE.
import { useRef, useState } from "react";

import { AvatarCropper } from "@/components/client/AvatarCropper";
import { updateCurrentUser } from "@/components/WithUser";
import { apiDelete, apiPostForm, ApiError, type CurrentUser } from "@/lib/api";

const OK_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_PICK = 15 * 1024 * 1024; // the crop shrinks it to ~0.2 MB before upload

function initials(name: string, email: string): string {
  const words = (name || email).trim().split(/\s+/).filter(Boolean);
  return ((words[0]?.[0] ?? "") + (words[1]?.[0] ?? "")).toUpperCase() || "DC";
}

export function AvatarEditor({ user }: { user: CurrentUser }) {
  const input = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const url = user.avatar_url;

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!OK_TYPES.includes(f.type)) return setError("Pilih foto berformat JPEG, PNG, atau WebP.");
    if (f.size > MAX_PICK) return setError("Foto terlalu besar. Pilih foto di bawah 15 MB.");
    setError(null);
    setPicked(f);
  }

  async function save(blob: Blob) {
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", blob, `foto.${blob.type === "image/png" ? "png" : "webp"}`);
      const res = await apiPostForm<{ avatar_url: string }>("/api/v1/me/avatar", form);
      updateCurrentUser({ avatar_url: res.avatar_url });
      setPicked(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Foto belum bisa disimpan, coba lagi.");
      setPicked(null);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await apiDelete("/api/v1/me/avatar");
      updateCurrentUser({ avatar_url: undefined });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Foto belum bisa dihapus, coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-4 sm:gap-5">
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy}
        aria-label={url ? "Ganti foto profil" : "Pasang foto profil"}
        className="group relative h-24 w-24 shrink-0 rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-wd-accent disabled:opacity-60"
      >
        <span className="wd-display flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-wd-accent text-[2.1rem] ring-4 ring-wd-accent-wash">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element -- the user's own avatar, a small square
            <img src={url} alt="Foto profilmu" className="h-full w-full object-cover" />
          ) : (
            initials(user.full_name, user.email)
          )}
        </span>
        <span aria-hidden className="absolute -bottom-0.5 -right-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-wd-ink text-white ring-2 ring-white transition-transform duration-300 group-hover:scale-110 motion-reduce:transition-none">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" />
            <circle cx="12" cy="13" r="3.5" />
          </svg>
        </span>
      </button>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" onChange={onPick} className="sr-only" tabIndex={-1} aria-hidden />
      <div className="flex flex-col items-start gap-0.5 text-sm">
        <button type="button" onClick={() => input.current?.click()} disabled={busy} className="min-h-9 font-semibold text-wd-accent-ink underline underline-offset-4 hover:text-wd-ink disabled:opacity-60">
          {url ? "Ganti foto" : "Pasang foto"}
        </button>
        {url && (
          <button type="button" onClick={() => void remove()} disabled={busy} className="min-h-9 font-semibold text-wd-muted underline underline-offset-4 hover:text-wd-ink disabled:opacity-60">
            Hapus foto
          </button>
        )}
        {error && (
          <p role="alert" className="max-w-[16rem] text-wd-danger">
            {error}
          </p>
        )}
      </div>
      <AvatarCropper file={picked} onCancel={() => setPicked(null)} onSave={(b) => void save(b)} saving={busy} />
    </div>
  );
}
