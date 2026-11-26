"use client";

// Crop a chosen photo to a square profile picture, inside a native <dialog>
// (showModal gives the inert page, focus containment, Esc and focus return).
// Drag the photo (pointer capture, so the drag survives leaving the stage),
// zoom with the slider, the plus/minus buttons or the wheel, and move/zoom
// from the keyboard (arrows, + and -). A circular window shows what stays;
// the saved file is the square behind it, 512 px, WebP where the browser can.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

const OUT = 512;
const MAX_ZOOM = 4;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

type Pos = { x: number; y: number }; // fractions of the stage size, from the centre

export function AvatarCropper({ file, onCancel, onSave, saving }: { file: File | null; onCancel: () => void; onSave: (blob: Blob) => void; saving: boolean }) {
  // Mounted only while a photo is chosen; the key gives each photo fresh state.
  if (!file) return null;
  return <CropDialog key={`${file.name}-${file.size}-${file.lastModified}`} file={file} onCancel={onCancel} onSave={onSave} saving={saving} />;
}

function CropDialog({ file, onCancel, onSave, saving }: { file: File; onCancel: () => void; onSave: (blob: Blob) => void; saving: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const img = useRef<HTMLImageElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const [size, setSize] = useState(280);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState<Pos>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [note, setNote] = useState("");
  const [failed, setFailed] = useState(false);
  const drag = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);

  // Open as a native modal as soon as it mounts.
  useEffect(() => {
    const d = dialog.current;
    if (d && !d.open) d.showModal();
  }, []);

  // Read the chosen file (a data URL: no object URL to revoke, safe under StrictMode).
  useEffect(() => {
    const r = new FileReader();
    r.onload = () => setSrc(String(r.result));
    r.onerror = () => setFailed(true);
    r.readAsDataURL(file);
    return () => r.abort();
  }, [file]);

  // Keep the geometry in fractions of the stage so a resize never breaks it.
  useLayoutEffect(() => {
    const el = stage.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize(el.clientWidth || 280));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const base = nat ? 1 / Math.min(nat.w, nat.h) : 1; // scale as a fraction of the stage per image px at zoom 1
  const limit = useCallback(
    (z: number) => {
      if (!nat) return { mx: 0, my: 0 };
      const s = base * z; // image px -> stage fractions
      return { mx: Math.max(0, (nat.w * s - 1) / 2), my: Math.max(0, (nat.h * s - 1) / 2) };
    },
    [nat, base],
  );
  const place = useCallback(
    (p: Pos, z: number): Pos => {
      const { mx, my } = limit(z);
      return { x: clamp(p.x, -mx, mx), y: clamp(p.y, -my, my) };
    },
    [limit],
  );

  const setZoomTo = useCallback(
    (z: number, announce = true) => {
      const nz = clamp(z, 1, MAX_ZOOM);
      setZoom(nz);
      setPos((p) => place(p, nz));
      if (announce) setNote(`Perbesaran ${Math.round(nz * 100)} persen`);
    },
    [place],
  );

  // Wheel zoom needs a non-passive listener to stop the page scrolling.
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoomTo(zoom * Math.exp(-e.deltaY * 0.0015), false);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoom, setZoomTo]);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0 || !nat) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { px: e.clientX, py: e.clientY, ox: pos.x, oy: pos.y };
    setDragging(true);
  }
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d || !e.currentTarget.hasPointerCapture(e.pointerId)) return;
    setPos(place({ x: d.ox + (e.clientX - d.px) / size, y: d.oy + (e.clientY - d.py) / size }, zoom));
  }
  function endDrag() {
    drag.current = null;
    setDragging(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const step = 0.04;
    const moves: Record<string, [number, number]> = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    if (e.key in moves) {
      e.preventDefault();
      const [dx, dy] = moves[e.key];
      setPos((p) => place({ x: p.x + dx, y: p.y + dy }, zoom));
      setNote("Foto digeser");
    } else if (e.key === "+" || e.key === "=") {
      e.preventDefault();
      setZoomTo(zoom + 0.15);
    } else if (e.key === "-" || e.key === "_") {
      e.preventDefault();
      setZoomTo(zoom - 0.15);
    } else if (e.key === "Home") {
      e.preventDefault();
      setZoom(1);
      setPos({ x: 0, y: 0 });
      setNote("Posisi dan perbesaran dikembalikan");
    }
  }

  function save() {
    const el = img.current;
    if (!el || !nat) return;
    // Source square in image pixels: the stage window, mapped back through the zoom and offset.
    const s = base * zoom;
    const sw = 1 / s;
    const sx = nat.w / 2 - pos.x / s - sw / 2;
    const sy = nat.h / 2 - pos.y / s - sw / 2;
    const canvas = document.createElement("canvas");
    canvas.width = OUT;
    canvas.height = OUT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return setFailed(true);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(el, sx, sy, sw, sw, 0, 0, OUT, OUT);
    canvas.toBlob(
      (blob) => (blob ? onSave(blob) : setFailed(true)),
      "image/webp",
      0.9,
    );
  }

  const w = nat ? nat.w * base * zoom * size : 0;
  const h = nat ? nat.h * base * zoom * size : 0;

  return (
    <dialog
      ref={dialog}
      aria-labelledby="crop-title"
      onClose={onCancel}
      className="m-auto w-[min(92vw,400px)] overflow-visible rounded-[24px] bg-white p-0 text-wd-ink shadow-wd-pop backdrop:bg-black/55 [&:modal]:overscroll-contain"
    >
      <div className="p-5 sm:p-6">
        <h1 id="crop-title" className="wd-title text-[1.35rem] leading-tight">
          Atur foto profil
        </h1>
        <p className="mt-1 text-sm text-wd-text">Geser foto untuk memilih bagian yang tampil. Lingkaran menunjukkan hasilnya.</p>

        <div
          ref={stage}
          role="group"
          tabIndex={0}
          aria-label="Area foto. Panah menggeser foto, tombol plus dan minus memperbesar, Home mengembalikan posisi."
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onLostPointerCapture={endDrag}
          onKeyDown={onKeyDown}
          className={`relative mx-auto mt-4 aspect-square w-full max-w-[320px] touch-none select-none overflow-hidden rounded-[18px] bg-black outline-offset-2 focus-visible:outline-2 focus-visible:outline-wd-accent ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
        >
          {src && (
            // eslint-disable-next-line @next/next/no-img-element -- a local object URL, drawn to a canvas on save
            <img
              ref={img}
              src={src}
              alt=""
              draggable={false}
              onLoad={(e) => setNat({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
              onError={() => setFailed(true)}
              style={nat ? { width: w, height: h, left: "50%", top: "50%", transform: `translate(calc(-50% + ${pos.x * size}px), calc(-50% + ${pos.y * size}px))` } : { opacity: 0 }}
              className="absolute max-w-none"
            />
          )}
          {!nat && !failed && <span aria-hidden className="absolute inset-0 m-auto h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white motion-reduce:animate-none" />}
          <span aria-hidden className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_999px_rgba(0,0,0,0.55)] ring-2 ring-white/85" />
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button type="button" onClick={() => setZoomTo(zoom - 0.25)} disabled={!nat || zoom <= 1} aria-label="Perkecil" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-wd-line-2 text-wd-ink transition-colors hover:border-wd-ink disabled:opacity-40">
            <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M5 12h14" />
            </svg>
          </button>
          <label className="min-w-0 flex-1">
            <span className="sr-only">Perbesaran foto</span>
            <input type="range" min={1} max={MAX_ZOOM} step={0.01} value={zoom} disabled={!nat} onChange={(e) => setZoomTo(Number(e.target.value), false)} aria-valuetext={`${Math.round(zoom * 100)} persen`} className="dc-slider w-full" style={{ ["--progress" as string]: `${((zoom - 1) / (MAX_ZOOM - 1)) * 100}%` }} />
          </label>
          <button type="button" onClick={() => setZoomTo(zoom + 0.25)} disabled={!nat || zoom >= MAX_ZOOM} aria-label="Perbesar" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-wd-line-2 text-wd-ink transition-colors hover:border-wd-ink disabled:opacity-40">
            <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>

        <p role="status" aria-live="polite" className="sr-only">
          {note}
        </p>
        {failed && (
          <p role="alert" className="mt-3 text-sm font-medium text-wd-danger">
            Foto ini tidak bisa dibuka. Coba foto lain berformat JPEG, PNG, atau WebP.
          </p>
        )}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => dialog.current?.requestClose()} disabled={saving} className="inline-flex min-h-12 items-center justify-center rounded-full border border-wd-line-2 px-6 font-semibold transition-colors hover:border-wd-ink disabled:opacity-60">
            Batal
          </button>
          <button type="button" onClick={save} disabled={!nat || saving || failed} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-wd-accent px-6 font-semibold text-wd-ink transition-colors hover:bg-wd-accent-deep disabled:opacity-60">
            {saving && <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-wd-ink/30 border-t-wd-ink motion-reduce:animate-none" />}
            {saving ? "Menyimpan…" : "Simpan foto"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
