"use client";

// The admin's article composer: a rich-text editor (Tiptap) with a formatting
// toolbar (style, font, size, color, highlight, alignment, lists, quote, rule,
// link, image) and a settings column (cover photo, address, topic, author,
// search summary). New articles are drafts; "Terbitkan" publishes. Drafts save
// themselves every 25 seconds once they exist; published articles only change
// when the admin presses Perbarui, so the live page never changes by accident.
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Pill } from "@/components/admin/adm";
import { ClientArt } from "@/components/home/ClientArt";
import { wdButton } from "@/components/home/ui";
import { RichBody } from "@/components/public/artikel/RichBody";
import { useToast } from "@/components/ui/Toast";
import { apiGet, apiPost, apiPostForm, apiPut, ApiError, type AdminArticle } from "@/lib/api";
import type { RichDoc } from "@/lib/articles";

import { buildExtensions, FONT_OPTIONS, HIGHLIGHT_COLORS, SIZE_OPTIONS, TEXT_COLORS } from "./extensions";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wd-ink";
const FIELD = `min-h-11 w-full rounded-xl border border-wd-line-2 bg-white px-3.5 text-[0.95rem] text-wd-ink placeholder:text-wd-muted hover:border-wd-ink ${FOCUS}`;
const LABEL = "text-sm font-semibold text-wd-ink";
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const EMPTY_DOC: RichDoc = { type: "doc", content: [] };
const AUTOSAVE_MS = 25_000;

function slugify(s: string): string {
  return s
    .toLocaleLowerCase("id-ID")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function errText(err: unknown, fallback: string): string {
  return err instanceof ApiError && err.message ? err.message : fallback;
}

/** Small icon button for the toolbar. */
function Btn({ label, on, disabled, onClick, children }: { label: string; on?: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={on === undefined ? undefined : on}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`inline-flex h-11 w-11 items-center justify-center rounded-lg text-[0.95rem] transition-colors disabled:opacity-35 sm:h-10 sm:w-10 ${on ? "bg-wd-accent text-wd-ink" : "text-wd-ink hover:bg-wd-blush"} ${FOCUS}`}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <span aria-hidden className="mx-1 hidden h-6 w-px bg-wd-line sm:block" />;
}

function Icon({ d, size = 18 }: { d: string[]; size?: number }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {d.map((p) => (
        <path key={p} d={p} />
      ))}
    </svg>
  );
}

/** A button that opens a small panel (color pickers, link). Closes on Escape or an outside press. */
function Pop({ label, icon, active, children }: { label: string; icon: React.ReactNode; active?: boolean; children: (close: () => void) => React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", down);
      document.removeEventListener("keydown", key);
    };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        title={label}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex h-11 w-11 items-center justify-center rounded-lg transition-colors sm:h-10 sm:w-10 ${active || open ? "bg-wd-accent text-wd-ink" : "text-wd-ink hover:bg-wd-blush"} ${FOCUS}`}
      >
        {icon}
      </button>
      {open && (
        <div role="dialog" aria-label={label} className="absolute left-0 top-full z-40 mt-1.5 rounded-2xl bg-white p-3 shadow-wd-pop ring-1 ring-wd-line">
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

function Swatches({ colors, current, onPick, onClear, clearLabel }: { colors: readonly { value: string; label: string }[]; current?: string; onPick: (v: string) => void; onClear: () => void; clearLabel: string }) {
  return (
    <div className="w-[220px]">
      <div className="flex flex-wrap gap-2">
        {colors.map((c) => (
          <button
            key={c.value}
            type="button"
            title={c.label}
            aria-label={c.label}
            aria-pressed={current === c.value}
            onClick={() => onPick(c.value)}
            className={`h-9 w-9 rounded-full ring-offset-2 ${current === c.value ? "ring-2 ring-wd-ink" : "ring-1 ring-wd-line-2 hover:ring-wd-ink"} ${FOCUS}`}
            style={{ backgroundColor: c.value }}
          />
        ))}
      </div>
      <button type="button" onClick={onClear} className={`mt-3 min-h-10 text-sm font-semibold text-wd-accent-ink underline underline-offset-4 ${FOCUS}`}>
        {clearLabel}
      </button>
    </div>
  );
}

export function ArticleComposer({ id: initialId }: { id?: string }) {
  const toast = useToast();
  const [articleId, setArticleId] = useState<string | null>(initialId ?? null);
  const [loading, setLoading] = useState(!!initialId);
  const [loadFailed, setLoadFailed] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [topic, setTopic] = useState("");
  const [author, setAuthor] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [coverAlt, setCoverAlt] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [preview, setPreview] = useState(false);
  const [uploading, setUploading] = useState<"cover" | "image" | null>(null);
  const [linkHref, setLinkHref] = useState("");
  const imageInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: buildExtensions(),
    content: EMPTY_DOC,
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    editorProps: { attributes: { class: "cmp-prose", role: "textbox", "aria-multiline": "true", "aria-label": "Isi artikel" } },
    onUpdate: () => setDirty(true),
  });

  const ui = useEditorState({
    editor,
    selector: (ctx) => {
      const e = ctx.editor;
      if (!e) return null;
      const ts = e.getAttributes("textStyle") as { fontFamily?: string; fontSize?: string; color?: string };
      const img = e.isActive("image") ? (e.getAttributes("image") as { alt?: string; title?: string; width?: number | null }) : null;
      return {
        bold: e.isActive("bold"),
        italic: e.isActive("italic"),
        underline: e.isActive("underline"),
        strike: e.isActive("strike"),
        code: e.isActive("code"),
        link: e.isActive("link"),
        bullet: e.isActive("bulletList"),
        ordered: e.isActive("orderedList"),
        quote: e.isActive("blockquote"),
        h: e.isActive("heading", { level: 2 }) ? "2" : e.isActive("heading", { level: 3 }) ? "3" : e.isActive("heading", { level: 4 }) ? "4" : "p",
        font: ts.fontFamily ?? "",
        size: ts.fontSize ?? "",
        color: ts.color ?? "",
        highlight: (e.getAttributes("highlight") as { color?: string }).color ?? "",
        align: (["center", "right", "justify"] as const).find((a) => e.isActive({ textAlign: a })) ?? "left",
        canUndo: e.can().undo(),
        canRedo: e.can().redo(),
        img,
        words: e.getText().trim().split(/\s+/).filter(Boolean).length,
      };
    },
  });

  // Load an existing article once, then fill the editor without marking it changed.
  useEffect(() => {
    if (!initialId || !editor) return;
    let cancelled = false;
    apiGet<AdminArticle>(`/api/v1/admin/articles/${initialId}`)
      .then((a) => {
        if (cancelled) return;
        setTitle(a.title);
        setSlug(a.slug);
        setSlugTouched(true);
        setDescription(a.description);
        setTopic(a.topic);
        setAuthor(a.author_name);
        setCoverUrl(a.cover_url);
        setCoverAlt(a.cover_alt);
        setStatus(a.status);
        editor.commands.setContent(a.body ?? EMPTY_DOC, { emitUpdate: false });
        setDirty(false);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setLoadFailed(true);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [initialId, editor]);

  const setField = useCallback(<T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setDirty(true);
  }, []);

  function onTitle(v: string) {
    setTitle(v);
    setDirty(true);
    if (!slugTouched && status === "draft") setSlug(slugify(v));
  }

  const save = useCallback(
    async (silent = false): Promise<boolean> => {
      if (!editor) return false;
      if (title.trim().length < 3) {
        setError("Tulis judul dulu, minimal 3 huruf.");
        return false;
      }
      setSaving(true);
      setError(null);
      const payload = {
        title: title.trim(),
        slug: articleId || slugTouched ? slug : "",
        description: description.trim(),
        topic: topic.trim(),
        cover_url: coverUrl,
        cover_alt: coverAlt.trim(),
        author_name: author.trim(),
        body: editor.getJSON(),
      };
      try {
        const saved = articleId ? await apiPut<AdminArticle>(`/api/v1/admin/articles/${articleId}`, payload) : await apiPost<AdminArticle>("/api/v1/admin/articles", payload);
        if (!articleId) {
          setArticleId(saved.id);
          window.history.replaceState(null, "", `/internal/admin/artikel/${saved.id}`);
        }
        setSlug(saved.slug);
        setAuthor(saved.author_name);
        setStatus(saved.status);
        setSavedAt(new Date());
        setDirty(false);
        if (!silent) toast.show(saved.status === "published" ? "Perubahan disimpan. Muncul di situs dalam beberapa menit." : "Draf tersimpan.", "success");
        return true;
      } catch (err) {
        setError(errText(err, "Artikel belum tersimpan. Periksa koneksimu lalu coba lagi."));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [editor, title, slug, slugTouched, description, topic, coverUrl, coverAlt, author, articleId, toast],
  );

  async function publish() {
    if (description.trim().length < 20) return setError("Ringkasan minimal 20 huruf sebelum terbit. Isi di kolom Ringkasan pencarian.");
    if (!coverUrl) return setError("Tambahkan foto sampul sebelum terbit.");
    if (!(await save(true))) return;
    setPublishing(true);
    try {
      await apiPost<AdminArticle>(`/api/v1/admin/articles/${articleId ?? ""}/publish`, {});
      setStatus("published");
      toast.show("Artikel terbit. Muncul di situs dalam beberapa menit.", "success");
    } catch (err) {
      setError(errText(err, "Artikel belum bisa diterbitkan."));
    } finally {
      setPublishing(false);
    }
  }

  async function unpublish() {
    if (!articleId) return;
    setPublishing(true);
    try {
      await apiPost<AdminArticle>(`/api/v1/admin/articles/${articleId}/unpublish`, {});
      setStatus("draft");
      toast.show("Artikel ditarik dari terbit dan kembali jadi draf.", "success");
    } catch (err) {
      setError(errText(err, "Belum berhasil. Coba lagi sebentar."));
    } finally {
      setPublishing(false);
    }
  }

  // Latest save() for the timer and the keyboard shortcut.
  const saveRef = useRef(save);
  const live = useRef({ dirty, saving, status, articleId });
  useEffect(() => {
    saveRef.current = save;
    live.current = { dirty, saving, status, articleId };
  });
  useEffect(() => {
    const t = window.setInterval(() => {
      const s = live.current;
      if (s.dirty && !s.saving && s.articleId && s.status === "draft") void saveRef.current(true);
    }, AUTOSAVE_MS);
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void saveRef.current(false);
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      window.clearInterval(t);
      document.removeEventListener("keydown", key);
    };
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const guard = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty]);

  async function upload(file: File, as: "cover" | "image") {
    if (!IMAGE_TYPES.includes(file.type)) return setError("Pilih foto berformat JPEG, PNG, WebP, atau GIF.");
    if (file.size > 8 * 1024 * 1024) return setError("Foto terlalu besar. Maksimal 8 MB.");
    setUploading(as);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await apiPostForm<{ url: string }>("/api/v1/admin/articles/images", form);
      if (as === "cover") {
        setCoverUrl(res.url);
        setDirty(true);
      } else {
        editor?.chain().focus().setImage({ src: res.url, alt: "" }).run();
        setDirty(true);
      }
    } catch (err) {
      setError(errText(err, "Foto belum bisa diunggah. Coba lagi."));
    } finally {
      setUploading(null);
    }
  }

  function applyLink(close: () => void) {
    const v = linkHref.trim();
    if (!editor || !v) return;
    if (/^(javascript|data|vbscript):/i.test(v)) return setError("Alamat tautan tidak valid.");
    const href = /^(https?:\/\/|mailto:|\/)/i.test(v) ? v : `https://${v}`;
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    close();
  }

  const words = ui?.words ?? 0;
  const minutes = Math.max(1, Math.round(words / 200));
  const published = status === "published";
  const savedNote = saving ? "Menyimpan..." : dirty ? "Ada perubahan yang belum disimpan" : savedAt ? `Tersimpan ${savedAt.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}` : articleId ? "Tersimpan" : "Belum disimpan";
  const descLen = description.trim().length;
  const previewDoc = useMemo(() => (preview && editor ? (editor.getJSON() as RichDoc) : EMPTY_DOC), [preview, editor]);

  if (loading) {
    return (
      <div className="wd-container py-16" role="status" aria-label="Memuat artikel">
        <div className="dc-skeleton h-10 w-2/3 rounded-xl" />
        <div className="dc-skeleton mt-6 h-96 rounded-2xl" />
      </div>
    );
  }
  if (loadFailed) {
    return (
      <div className="wd-container py-16">
        <p role="alert" className="text-wd-danger">
          Artikel ini tidak ditemukan atau belum bisa dimuat.
        </p>
        <Link href="/internal/admin/artikel" className={`${wdButton({ variant: "outline", size: "md", className: "mt-4" })} ${FOCUS}`}>
          Kembali ke daftar artikel
        </Link>
      </div>
    );
  }

  return (
    <div className="wd-container pb-24 pt-6 sm:pt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/internal/admin/artikel" className={`inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-wd-accent-ink underline-offset-4 hover:underline ${FOCUS}`}>
          <Icon d={["m15 6-6 6 6 6"]} size={16} />
          Semua artikel
        </Link>
        <p role="status" aria-live="polite" className="text-sm text-wd-text">
          {savedNote}
        </p>
      </div>

      <div className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-10">
        {/* Writing column */}
        <div className="min-w-0">
          <div role="toolbar" aria-label="Pemformatan teks" aria-controls="cmp-editor" className="sticky top-16 z-30 -mx-1 flex flex-wrap items-center gap-x-0.5 gap-y-1 rounded-2xl bg-white/95 p-1.5 ring-1 ring-wd-line backdrop-blur md:top-[7.25rem]">
            <Btn label="Urungkan" disabled={!ui?.canUndo} onClick={() => editor?.chain().focus().undo().run()}>
              <Icon d={["M9 14 4 9l5-5", "M4 9h10a6 6 0 0 1 0 12h-3"]} />
            </Btn>
            <Btn label="Ulangi" disabled={!ui?.canRedo} onClick={() => editor?.chain().focus().redo().run()}>
              <Icon d={["m15 14 5-5-5-5", "M20 9H10a6 6 0 0 0 0 12h3"]} />
            </Btn>
            <Sep />
            <label className="sr-only" htmlFor="cmp-style">
              Gaya paragraf
            </label>
            <select
              id="cmp-style"
              value={ui?.h ?? "p"}
              onChange={(e) => {
                const v = e.target.value;
                const c = editor?.chain().focus();
                if (!c) return;
                if (v === "p") c.setParagraph().run();
                else c.setHeading({ level: Number(v) as 2 | 3 | 4 }).run();
              }}
              className={`h-11 rounded-lg border border-wd-line-2 bg-white px-2 text-sm font-semibold sm:h-10 ${FOCUS}`}
            >
              <option value="p">Paragraf</option>
              <option value="2">Judul bagian</option>
              <option value="3">Sub judul</option>
              <option value="4">Sub sub judul</option>
            </select>
            <label className="sr-only" htmlFor="cmp-font">
              Jenis huruf
            </label>
            <select
              id="cmp-font"
              value={ui?.font ?? ""}
              onChange={(e) => (e.target.value ? editor?.chain().focus().setFontFamily(e.target.value).run() : editor?.chain().focus().unsetFontFamily().run())}
              className={`h-11 max-w-[9.5rem] rounded-lg border border-wd-line-2 bg-white px-2 text-sm sm:h-10 ${FOCUS}`}
            >
              <option value="">Huruf bawaan</option>
              {FONT_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
            <label className="sr-only" htmlFor="cmp-size">
              Ukuran huruf
            </label>
            <select
              id="cmp-size"
              value={ui?.size ?? ""}
              onChange={(e) => (e.target.value ? editor?.chain().focus().setFontSize(e.target.value).run() : editor?.chain().focus().unsetFontSize().run())}
              className={`h-11 rounded-lg border border-wd-line-2 bg-white px-2 text-sm sm:h-10 ${FOCUS}`}
            >
              <option value="">Ukuran</option>
              {SIZE_OPTIONS.map((s) => (
                <option key={s} value={`${s}px`}>
                  {s}
                </option>
              ))}
            </select>
            <Sep />
            <Btn label="Tebal" on={ui?.bold} onClick={() => editor?.chain().focus().toggleBold().run()}>
              <span className="font-bold">B</span>
            </Btn>
            <Btn label="Miring" on={ui?.italic} onClick={() => editor?.chain().focus().toggleItalic().run()}>
              <span className="italic">I</span>
            </Btn>
            <Btn label="Garis bawah" on={ui?.underline} onClick={() => editor?.chain().focus().toggleUnderline().run()}>
              <span className="underline">U</span>
            </Btn>
            <Btn label="Coret" on={ui?.strike} onClick={() => editor?.chain().focus().toggleStrike().run()}>
              <span className="line-through">S</span>
            </Btn>
            <Pop label="Warna huruf" active={!!ui?.color} icon={<span className="border-b-[3px] px-1 font-bold leading-none" style={{ borderColor: ui?.color || "#231f1d" }}>A</span>}>
              {(close) => (
                <Swatches
                  colors={TEXT_COLORS}
                  current={ui?.color}
                  onPick={(v) => {
                    editor?.chain().focus().setColor(v).run();
                    close();
                  }}
                  onClear={() => {
                    editor?.chain().focus().unsetColor().run();
                    close();
                  }}
                  clearLabel="Hapus warna"
                />
              )}
            </Pop>
            <Pop label="Stabilo" active={!!ui?.highlight} icon={<Icon d={["m9 11-5 5v4h4l5-5", "m12 8 4-4 4 4-4 4z"]} />}>
              {(close) => (
                <Swatches
                  colors={HIGHLIGHT_COLORS}
                  current={ui?.highlight}
                  onPick={(v) => {
                    editor?.chain().focus().setHighlight({ color: v }).run();
                    close();
                  }}
                  onClear={() => {
                    editor?.chain().focus().unsetHighlight().run();
                    close();
                  }}
                  clearLabel="Hapus stabilo"
                />
              )}
            </Pop>
            <Sep />
            <Btn label="Rata kiri" on={ui?.align === "left"} onClick={() => editor?.chain().focus().setTextAlign("left").run()}>
              <Icon d={["M4 6h16M4 10h10M4 14h16M4 18h10"]} />
            </Btn>
            <Btn label="Rata tengah" on={ui?.align === "center"} onClick={() => editor?.chain().focus().setTextAlign("center").run()}>
              <Icon d={["M4 6h16M7 10h10M4 14h16M7 18h10"]} />
            </Btn>
            <Btn label="Rata kanan" on={ui?.align === "right"} onClick={() => editor?.chain().focus().setTextAlign("right").run()}>
              <Icon d={["M4 6h16M10 10h10M4 14h16M10 18h10"]} />
            </Btn>
            <Btn label="Rata kiri kanan" on={ui?.align === "justify"} onClick={() => editor?.chain().focus().setTextAlign("justify").run()}>
              <Icon d={["M4 6h16M4 10h16M4 14h16M4 18h16"]} />
            </Btn>
            <Sep />
            <Btn label="Daftar poin" on={ui?.bullet} onClick={() => editor?.chain().focus().toggleBulletList().run()}>
              <Icon d={["M9 6h11M9 12h11M9 18h11", "M4 6h.01M4 12h.01M4 18h.01"]} />
            </Btn>
            <Btn label="Daftar bernomor" on={ui?.ordered} onClick={() => editor?.chain().focus().toggleOrderedList().run()}>
              <Icon d={["M10 6h10M10 12h10M10 18h10", "M4 5l1-1v4M4 13h2l-2 3h2M4 19.5h2"]} />
            </Btn>
            <Btn label="Kutipan" on={ui?.quote} onClick={() => editor?.chain().focus().toggleBlockquote().run()}>
              <Icon d={["M5 17c0-4 1-7 4-9", "M13 17c0-4 1-7 4-9", "M5 17h4v-4H5zM13 17h4v-4h-4z"]} />
            </Btn>
            <Btn label="Garis pemisah" onClick={() => editor?.chain().focus().setHorizontalRule().run()}>
              <Icon d={["M4 12h16"]} />
            </Btn>
            <Sep />
            <Pop label="Tautan" active={ui?.link} icon={<Icon d={["M10 14a4 4 0 0 0 5.6 0l3-3a4 4 0 0 0-5.6-5.6l-1 1", "M14 10a4 4 0 0 0-5.6 0l-3 3a4 4 0 0 0 5.6 5.6l1-1"]} />}>
              {(close) => (
                <form
                  className="w-[260px]"
                  onSubmit={(e) => {
                    e.preventDefault();
                    applyLink(close);
                  }}
                >
                  <label htmlFor="cmp-link" className={LABEL}>
                    Alamat tautan
                  </label>
                  <input id="cmp-link" value={linkHref} onChange={(e) => setLinkHref(e.target.value)} placeholder="https://..." className={`${FIELD} mt-1.5`} />
                  <p className="mt-1.5 text-xs text-wd-muted">Pilih teksnya dulu di editor.</p>
                  <div className="mt-3 flex gap-2">
                    <button type="submit" className={`${wdButton({ variant: "ink", size: "sm" })} ${FOCUS}`}>
                      Pasang
                    </button>
                    {ui?.link && (
                      <button
                        type="button"
                        onClick={() => {
                          editor?.chain().focus().extendMarkRange("link").unsetLink().run();
                          close();
                        }}
                        className={`${wdButton({ variant: "outline", size: "sm" })} ${FOCUS}`}
                      >
                        Lepas tautan
                      </button>
                    )}
                  </div>
                </form>
              )}
            </Pop>
            <input
              ref={imageInput}
              type="file"
              accept={IMAGE_TYPES.join(",")}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void upload(f, "image");
              }}
            />
            <Btn label={uploading === "image" ? "Mengunggah foto..." : "Sisipkan foto"} disabled={uploading === "image"} onClick={() => imageInput.current?.click()}>
              <Icon d={["M4 5h16v14H4z", "m4 16 4-4 3 3 4-5 5 6", "M9 9h.01"]} />
            </Btn>
            <Btn label="Hapus format" onClick={() => editor?.chain().focus().unsetAllMarks().clearNodes().run()}>
              <Icon d={["M5 5h14M12 5v4M9 19h6", "m4 4 16 16"]} />
            </Btn>
          </div>

          {ui?.img && (
            <div role="group" aria-label="Pengaturan foto" className="mt-2 flex flex-wrap items-end gap-x-5 gap-y-3 rounded-2xl bg-wd-accent-wash p-3.5">
              <div>
                <p className={LABEL}>Lebar foto</p>
                <div className="mt-1.5 flex gap-1.5">
                  {[25, 50, 75, 100].map((w) => (
                    <button key={w} type="button" aria-pressed={(ui.img?.width ?? 100) === w} onClick={() => editor?.chain().focus().updateAttributes("image", { width: w }).run()} className={`min-h-10 min-w-12 rounded-full border px-3 text-sm font-semibold ${(ui.img?.width ?? 100) === w ? "border-wd-ink bg-wd-ink text-white" : "border-wd-line-2 bg-white text-wd-ink hover:border-wd-ink"} ${FOCUS}`}>
                      {w}%
                    </button>
                  ))}
                </div>
              </div>
              <div className="min-w-[200px] flex-1">
                <label htmlFor="cmp-alt" className={LABEL}>
                  Teks pengganti (untuk pembaca layar dan pencarian)
                </label>
                <input id="cmp-alt" value={ui.img.alt ?? ""} onChange={(e) => editor?.chain().updateAttributes("image", { alt: e.target.value }).run()} placeholder="Jelaskan isi foto" className={`${FIELD} mt-1.5`} />
              </div>
              <div className="min-w-[180px] flex-1">
                <label htmlFor="cmp-cap" className={LABEL}>
                  Keterangan di bawah foto (opsional)
                </label>
                <input id="cmp-cap" value={ui.img.title ?? ""} onChange={(e) => editor?.chain().updateAttributes("image", { title: e.target.value }).run()} className={`${FIELD} mt-1.5`} />
              </div>
              <button type="button" onClick={() => editor?.chain().focus().deleteSelection().run()} className={`min-h-10 rounded-full px-4 text-sm font-semibold text-wd-danger hover:bg-white ${FOCUS}`}>
                Hapus foto
              </button>
            </div>
          )}

          <div className="mt-5">
            {preview ? (
              <article aria-label="Pratinjau artikel" className="rounded-[24px] border border-wd-line p-5 sm:p-8">
                <p className="text-center text-sm font-semibold text-wd-accent-ink">{topic || "Topik"}</p>
                <h1 className="wd-title mx-auto mt-2 max-w-[24ch] text-center text-[clamp(1.9rem,4vw,2.7rem)] leading-[1.12]">{title || "Judul artikel"}</h1>
                <p className="mx-auto mt-3 max-w-[62ch] text-center text-[1.05rem] leading-relaxed text-wd-text">{description}</p>
                {coverUrl && (
                  // eslint-disable-next-line @next/next/no-img-element -- local preview of an uploaded cover
                  <img src={coverUrl} alt={coverAlt} className="mx-auto mt-6 aspect-[16/9] w-full max-w-[900px] rounded-[20px] object-cover" />
                )}
                <div className="mx-auto mt-8 max-w-[720px]">
                  <RichBody doc={previewDoc} />
                </div>
              </article>
            ) : null}
            <div id="cmp-editor" hidden={preview} className="mx-auto max-w-[760px]">
              <label htmlFor="cmp-title" className="sr-only">
                Judul artikel
              </label>
              <textarea
                id="cmp-title"
                value={title}
                onChange={(e) => onTitle(e.target.value)}
                rows={2}
                maxLength={160}
                placeholder="Judul artikel"
                className="wd-title w-full resize-none border-0 bg-transparent p-0 text-[clamp(1.9rem,4vw,2.7rem)] leading-[1.12] placeholder:text-wd-line-2 focus:outline-none"
              />
              <div className="mt-4 border-t border-wd-line pt-5">
                <EditorContent editor={editor} />
              </div>
            </div>
          </div>
          <p className="mt-6 text-sm text-wd-muted">
            {words.toLocaleString("id-ID")} kata, sekitar {minutes} menit baca. Tekan Ctrl+S untuk menyimpan.
          </p>
        </div>

        {/* Settings column */}
        <aside aria-label="Pengaturan artikel" className="min-w-0 lg:sticky lg:top-32 lg:self-start">
          <div className="rounded-[24px] bg-wd-accent-wash p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold text-wd-ink">Status</p>
              <Pill tone={published ? "gold" : "plain"}>{published ? "Terbit" : "Draf"}</Pill>
            </div>
            {error && (
              <p role="alert" className="mt-3 text-sm font-medium text-wd-danger">
                {error}
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => void save(false)} disabled={saving || publishing || (!dirty && !!articleId)} aria-busy={saving} className={`${wdButton({ variant: "outline", size: "md" })} ${FOCUS}`}>
                {saving ? "Menyimpan..." : published ? "Simpan perubahan" : "Simpan draf"}
              </button>
              <button type="button" onClick={() => setPreview((v) => !v)} aria-pressed={preview} className={`${wdButton({ variant: "outline", size: "md" })} ${FOCUS}`}>
                {preview ? "Kembali menulis" : "Pratinjau"}
              </button>
              {published ? (
                <button type="button" onClick={() => void unpublish()} disabled={publishing || saving} aria-busy={publishing} className={`${wdButton({ variant: "outline", size: "md" })} ${FOCUS}`}>
                  Tarik dari terbit
                </button>
              ) : (
                <button type="button" onClick={() => void publish()} disabled={publishing || saving} aria-busy={publishing} className={`${wdButton({ variant: "gold", size: "md" })} ${FOCUS}`}>
                  {publishing ? "Menerbitkan..." : "Terbitkan"}
                </button>
              )}
            </div>
            {published && slug && (
              <Link href={`/artikel/${slug}`} target="_blank" rel="noopener noreferrer" className={`mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-wd-accent-ink underline underline-offset-4 ${FOCUS}`}>
                Lihat di situs
              </Link>
            )}
          </div>

          <section aria-labelledby="cmp-cover" className="mt-6">
            <h2 id="cmp-cover" className="wd-title text-[1.2rem]">
              Foto sampul
            </h2>
            <input
              ref={coverInput}
              type="file"
              accept={IMAGE_TYPES.join(",")}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void upload(f, "cover");
              }}
            />
            <div className="mt-3 overflow-hidden rounded-[18px] bg-wd-blush">
              {coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- admin-uploaded cover
                <img src={coverUrl} alt={coverAlt || "Foto sampul"} className="aspect-[16/9] w-full object-cover" />
              ) : (
                <div className="flex aspect-[16/9] items-center justify-center p-8" aria-hidden>
                  <span className="h-16 w-16">
                    <ClientArt kind="frame" />
                  </span>
                </div>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" onClick={() => coverInput.current?.click()} disabled={uploading === "cover"} aria-busy={uploading === "cover"} className={`${wdButton({ variant: "outline", size: "sm" })} ${FOCUS}`}>
                {uploading === "cover" ? "Mengunggah..." : coverUrl ? "Ganti foto" : "Unggah foto"}
              </button>
              {coverUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setCoverUrl("");
                    setDirty(true);
                  }}
                  className={`min-h-10 rounded-full px-3 text-sm font-semibold text-wd-danger hover:bg-wd-blush ${FOCUS}`}
                >
                  Hapus
                </button>
              )}
            </div>
            <label htmlFor="cmp-cover-alt" className={`${LABEL} mt-3 block`}>
              Teks pengganti sampul
            </label>
            <input id="cmp-cover-alt" value={coverAlt} onChange={(e) => setField(setCoverAlt)(e.target.value)} maxLength={300} placeholder="Jelaskan isi foto" className={`${FIELD} mt-1.5`} />
            <p className="mt-1.5 text-xs text-wd-muted">Foto horizontal 16:9 paling pas. JPEG, PNG, WebP, atau GIF, maksimal 8 MB. Pakai foto yang kamu punya haknya.</p>
          </section>

          <section aria-labelledby="cmp-seo" className="mt-6">
            <h2 id="cmp-seo" className="wd-title text-[1.2rem]">
              Ringkasan pencarian
            </h2>
            <label htmlFor="cmp-desc" className="sr-only">
              Ringkasan artikel
            </label>
            <textarea id="cmp-desc" value={description} onChange={(e) => setField(setDescription)(e.target.value)} rows={4} maxLength={300} placeholder="Satu dua kalimat yang muncul di Google dan di kartu artikel." className={`${FIELD} mt-3 resize-y py-2.5 leading-snug`} />
            <p className={`mt-1 text-xs ${descLen > 0 && descLen < 20 ? "text-wd-danger" : "text-wd-muted"}`}>
              {descLen} dari 300 huruf. Ideal 120 sampai 160, minimal 20 untuk terbit.
            </p>
            <div aria-hidden className="mt-3 rounded-2xl border border-wd-line p-3.5">
              <p className="truncate text-xs text-wd-muted">duacincin.id › artikel › {slug || "alamat-artikel"}</p>
              <p className="mt-0.5 line-clamp-2 text-[1.02rem] font-medium leading-snug text-[#1a0dab]">{title || "Judul artikel"} | DuaCincin</p>
              <p className="mt-0.5 line-clamp-2 text-[0.85rem] leading-snug text-wd-text">{description || "Ringkasan artikel akan tampil di sini."}</p>
            </div>
          </section>

          <section aria-labelledby="cmp-detail" className="mt-6">
            <h2 id="cmp-detail" className="wd-title text-[1.2rem]">
              Detail
            </h2>
            <label htmlFor="cmp-slug" className={`${LABEL} mt-3 block`}>
              Alamat artikel
            </label>
            <div className="mt-1.5 flex items-center gap-1 rounded-xl border border-wd-line-2 bg-white pl-3.5 focus-within:border-wd-ink">
              <span className="shrink-0 text-sm text-wd-muted">/artikel/</span>
              <input
                id="cmp-slug"
                value={slug}
                onChange={(e) => {
                  setSlug(slugify(e.target.value));
                  setSlugTouched(true);
                  setDirty(true);
                }}
                className="min-h-11 w-full min-w-0 bg-transparent pr-3 text-[0.95rem] text-wd-ink focus:outline-none"
              />
            </div>
            {published && <p className="mt-1 text-xs text-wd-muted">Mengubah alamat artikel yang sudah terbit membuat tautan lamanya tidak lagi berlaku.</p>}
            <label htmlFor="cmp-topic" className={`${LABEL} mt-3 block`}>
              Topik
            </label>
            <input id="cmp-topic" list="cmp-topics" value={topic} onChange={(e) => setField(setTopic)(e.target.value)} maxLength={60} placeholder="Contoh: Anggaran" className={`${FIELD} mt-1.5`} />
            <datalist id="cmp-topics">
              {["Anggaran", "Legal", "Venue", "Vendor", "Adat", "Tips"].map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
            <label htmlFor="cmp-author" className={`${LABEL} mt-3 block`}>
              Penulis
            </label>
            <input id="cmp-author" value={author} onChange={(e) => setField(setAuthor)(e.target.value)} maxLength={100} placeholder="Kosongkan untuk memakai namamu" className={`${FIELD} mt-1.5`} />
          </section>
        </aside>
      </div>
    </div>
  );
}
