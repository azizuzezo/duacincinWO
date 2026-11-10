"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input, Textarea } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Sheet";
import { Skeleton, SkeletonGroup } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { WithUser } from "@/components/WithUser";
import { MotionItem, MotionList } from "@/components/ui/Motion";
import { apiDelete, apiGet, apiPatch, apiPost, ApiError, type CurrentUser, type RundownItem } from "@/lib/api";

import { Icon, InlineAlert, MobileActionBar, PlannerFrame, PlannerTitle } from "../_parts";

export default function RundownPage() {
  return (
    <WithUser allowedRoles={["client"]} loginPath="/login">
      {(user) => <RundownContent user={user} />}
    </WithUser>
  );
}

/** "08:00" or "08:00:00" -> minutes after midnight, or null. */
function minutes(t: string): number | null {
  const m = /^(\d{1,2}):(\d{2})/.exec(t);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/** "08:00:00" -> "08.00" (Indonesian time notation). */
function jam(t: string): string {
  const m = /^(\d{1,2}):(\d{2})/.exec(t);
  return m ? `${m[1].padStart(2, "0")}.${m[2]}` : t;
}

function durasi(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h && m) return `${h} jam ${m} menit`;
  if (h) return `${h} jam`;
  return `${m} menit`;
}

function RundownContent({ user }: { user: CurrentUser }) {
  const { show } = useToast();
  const [items, setItems] = useState<RundownItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function load() {
    setLoadError(null);
    return apiGet<RundownItem[]>("/api/v1/rundown")
      .then((d) => setItems(d ?? []))
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "Gagal memuat rundown."))
      .finally(() => setLoading(false));
  }

  function retry() {
    setLoading(true);
    void load();
  }

  useEffect(() => {
    queueMicrotask(load);
  }, []);

  function resetForm() {
    setEditingId(null);
    setStartTime("");
    setTitle("");
    setNotes("");
    setShowForm(false);
    setConfirmDelete(false);
  }

  function startAdd() {
    setEditingId(null);
    setStartTime("");
    setTitle("");
    setNotes("");
    setConfirmDelete(false);
    setShowForm(true);
  }

  function startEdit(item: RundownItem) {
    setEditingId(item.id);
    setStartTime(item.start_time);
    setTitle(item.title);
    setNotes(item.notes);
    setConfirmDelete(false);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !startTime) return;
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        await apiPatch(`/api/v1/rundown/${editingId}`, { start_time: startTime, title, notes });
        show("Jadwal diperbarui.", "success");
      } else {
        await apiPost("/api/v1/rundown", { start_time: startTime, title, notes });
        show("Jadwal ditambahkan.", "success");
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menyimpan jadwal.");
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    resetForm();
    try {
      await apiDelete(`/api/v1/rundown/${id}`);
      setItems((prev) => prev.filter((it) => it.id !== id));
      show("Jadwal dihapus.", "success");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menghapus jadwal.");
    }
  }

  const first = items[0];
  const last = items[items.length - 1];
  const span = first && last ? (minutes(last.start_time) ?? 0) - (minutes(first.start_time) ?? 0) : 0;

  const addButton = (
    <Button variant="gold" onClick={startAdd}>
      <Icon name="plus" size={18} />
      Tambah jadwal
    </Button>
  );

  return (
    <PlannerFrame user={user} bottomBar>
      <PlannerTitle
        title="Rundown,"
        accent="jam demi jam"
        subtitle="Susun urutan acara di hari H supaya keluarga, MC, dan vendor bergerak di jam yang sama."
        action={addButton}
      />

      <InlineAlert message={error} onClose={() => setError(null)} />

      {loading ? (
        <SkeletonGroup label="Memuat rundown" className="flex max-w-3xl flex-col gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-24 flex-1 rounded-xl" />
            </div>
          ))}
        </SkeletonGroup>
      ) : loadError ? (
        <ErrorState title="Rundown belum termuat" body={loadError} onRetry={retry} />
      ) : items.length === 0 ? (
        <EmptyState
          title="Belum ada rundown"
          body="Mulai dari jam akad atau pemberkatan, lalu tambah acara berikutnya."
          action={
            <Button variant="primary" size="sm" onClick={startAdd}>
              Tambah jadwal pertama
            </Button>
          }
        />
      ) : (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
          {/* Sessions arrive in order, like the day itself. */}
          <MotionList as="ol" className="relative max-w-3xl">
            {items.map((it, i) => {
              const next = items[i + 1];
              const a = minutes(it.start_time);
              const b = next ? minutes(next.start_time) : null;
              const gap = a !== null && b !== null && b > a ? b - a : null;
              return (
                <MotionItem key={it.id} className="relative grid grid-cols-[64px_minmax(0,1fr)] gap-x-4 sm:grid-cols-[88px_minmax(0,1fr)] sm:gap-x-6">
                  <p className="pt-4 text-right font-heading text-[1.55rem] font-semibold leading-none text-dc-ink [font-variant-numeric:lining-nums_tabular-nums] sm:text-[1.9rem]">
                    <time>{jam(it.start_time)}</time>
                  </p>
                  <div className="relative border-l border-dc-gold/60 pb-2 pl-5 sm:pl-7">
                    <span
                      aria-hidden
                      className={`absolute -left-[7px] top-5 h-3.5 w-3.5 rounded-full border-2 border-dc-gold ${i === 0 ? "bg-dc-gold" : "bg-dc-ivory"}`}
                    />
                    <div className="rounded-xl border border-dc-line bg-dc-white p-4 shadow-soft sm:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <h2 className="min-w-0 break-words font-heading text-[1.55rem] leading-tight text-dc-ink">{it.title}</h2>
                        <button
                          type="button"
                          onClick={() => startEdit(it)}
                          aria-label={`Ubah ${it.title}`}
                          className="-mr-2 -mt-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-dc-text-3 transition-colors hover:bg-dc-cream hover:text-dc-ink"
                        >
                          <Icon name="pencil" size={18} />
                        </button>
                      </div>
                      {it.notes && <p className="mt-1.5 whitespace-pre-line break-words leading-relaxed text-dc-text-2">{it.notes}</p>}
                    </div>
                    {gap !== null ? (
                      <p className="flex items-center gap-2 py-3 text-sm text-dc-text-3">
                        <Icon name="clock" size={15} />
                        {durasi(gap)} ke acara berikutnya
                      </p>
                    ) : (
                      <div className="h-5" />
                    )}
                  </div>
                </MotionItem>
              );
            })}
          </MotionList>

          <aside className="lg:sticky lg:top-8">
            <div className="rounded-2xl bg-dc-cream p-6">
              <p className="text-sm font-semibold text-dc-text-2">Hari H dimulai</p>
              <p className="mt-1 font-heading text-[2.6rem] font-semibold leading-none text-dc-ink [font-variant-numeric:lining-nums_tabular-nums]">{jam(first.start_time)}</p>
              <dl className="mt-5 flex flex-col gap-3 border-t border-dc-line-strong/60 pt-4 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-dc-text-2">Jumlah acara</dt>
                  <dd className="font-semibold tabular-nums text-dc-ink">{items.length}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-dc-text-2">Acara terakhir</dt>
                  <dd className="font-semibold tabular-nums text-dc-ink">{jam(last.start_time)}</dd>
                </div>
                {span > 0 && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-dc-text-2">Rentang jadwal</dt>
                    <dd className="font-semibold text-dc-ink">{durasi(span)}</dd>
                  </div>
                )}
              </dl>
            </div>
          </aside>
        </div>
      )}

      {!loading && !loadError && (
        <MobileActionBar>
          <Button variant="gold" block onClick={startAdd}>
            <Icon name="plus" size={18} />
            Tambah jadwal
          </Button>
        </MobileActionBar>
      )}

      <Sheet
        open={showForm}
        onClose={resetForm}
        title={editingId ? "Ubah jadwal" : "Tambah jadwal"}
        description={editingId ? undefined : "Urutan mengikuti jam mulai."}
        footer={
          <Button type="submit" form="rundown-form" variant="primary" block loading={saving}>
            {editingId ? "Simpan perubahan" : "Tambah ke rundown"}
          </Button>
        }
      >
        <form id="rundown-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
          <Input label="Jam mulai" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
          <Input label="Nama acara" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Misalnya: Akad nikah" required autoComplete="off" />
          <Textarea label="Catatan" optional value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Siapa yang bertugas, di mana, apa yang perlu disiapkan" />
        </form>
        {editingId && (
          <div className="mt-6 border-t border-dc-line pt-5">
            {confirmDelete ? (
              <div className="flex flex-wrap items-center gap-2">
                <p className="w-full text-sm text-dc-text-2">Hapus jadwal ini dari rundown?</p>
                <Button variant="danger" size="sm" onClick={() => handleDelete(editingId)}>
                  Ya, hapus
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                  Batal
                </Button>
              </div>
            ) : (
              <Button variant="quiet" size="sm" onClick={() => setConfirmDelete(true)} className="text-dc-danger!">
                <Icon name="trash" size={16} />
                Hapus jadwal
              </Button>
            )}
          </div>
        )}
      </Sheet>
    </PlannerFrame>
  );
}
