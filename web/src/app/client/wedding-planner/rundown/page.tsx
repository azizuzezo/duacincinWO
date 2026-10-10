"use client";

import { useEffect, useState } from "react";

import { ErrorState, ERROR_TEXT, FOCUS, INPUT, SkeletonList } from "@/app/client/_ui";
import { Button } from "@/components/Button";
import { CLIENT_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { WeddingPlannerTabs } from "@/components/WeddingPlannerTabs";
import { WithUser } from "@/components/WithUser";
import { apiDelete, apiGet, apiPatch, apiPost, ApiError, type CurrentUser, type RundownItem } from "@/lib/api";

export default function RundownPage() {
  return (
    <WithUser allowedRoles={["client"]} loginPath="/login">
      {(user) => <RundownContent user={user} />}
    </WithUser>
  );
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

  function load() {
    setLoadError(null);
    return apiGet<RundownItem[]>("/api/v1/rundown")
      .then((d) => setItems(d ?? []))
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "Gagal memuat rundown."))
      .finally(() => setLoading(false));
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
  }

  function startEdit(item: RundownItem) {
    setEditingId(item.id);
    setStartTime(item.start_time);
    setTitle(item.title);
    setNotes(item.notes);
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
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await apiDelete(`/api/v1/rundown/${id}`);
      setItems((prev) => prev.filter((it) => it.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menghapus jadwal.");
    }
  }

  return (
    <Shell user={user} navItems={CLIENT_NAV} loginPath="/login" eyebrow="Client">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-10">
        <WeddingPlannerTabs />
        <PageHeader
          title="Rundown Acara"
          subtitle="Susun jadwal jam demi jam hari pernikahan."
          action={
            <Button variant="ghost" className="w-auto" onClick={() => (showForm ? resetForm() : setShowForm(true))}>
              {showForm ? "Batal" : "+ Tambah Jadwal"}
            </Button>
          }
        />

        {showForm && (
          <Card className="mb-6 p-5">
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <input
                  type="time"
                  aria-label="Jam mulai"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                  className={INPUT}
                />
                <input
                  type="text"
                  aria-label="Judul"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Judul (mis. Akad Nikah)"
                  required
                  className={`${INPUT} sm:col-span-2`}
                />
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Catatan (opsional)"
                aria-label="Catatan"
                className={INPUT}
              />
              <Button type="submit" className="w-auto" loading={saving}>
                {editingId ? "Simpan Perubahan" : "Tambah"}
              </Button>
            </form>
          </Card>
        )}

        {error && (
          <p role="alert" className={`mb-4 ${ERROR_TEXT}`}>
            {error}
          </p>
        )}

        {loading ? (
          <SkeletonList rows={4} />
        ) : loadError ? (
          <ErrorState message={loadError} onRetry={load} />
        ) : items.length === 0 ? (
          <EmptyState title="Belum ada rundown" body="Tambah jadwal pertama lewat tombol di atas." />
        ) : (
          <ul className="relative ml-1.5 flex flex-col gap-3 border-l border-dc-gold/50 pl-6">
            {items.map((it) => (
              <li key={it.id} className="relative">
                <span aria-hidden className="absolute -left-[30px] top-5 h-2.5 w-2.5 rounded-full border border-dc-gold bg-dc-white" />
                <Card className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                    <div className="min-w-0">
                      <p className="font-sans text-sm font-semibold tabular-nums text-dc-clay">{it.start_time}</p>
                      <p className="mt-0.5 break-words font-medium text-dc-ink">{it.title}</p>
                      {it.notes && <p className="mt-1 break-words text-sm text-dc-black/70">{it.notes}</p>}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button type="button" onClick={() => startEdit(it)} aria-label={`Ubah ${it.title}`} className={`inline-flex min-h-11 items-center rounded-md px-3 text-sm font-semibold text-dc-clay hover:bg-dc-cream ${FOCUS}`}>
                        Ubah
                      </button>
                      <button type="button" onClick={() => handleDelete(it.id)} aria-label={`Hapus ${it.title}`} className={`inline-flex min-h-11 items-center rounded-md px-3 text-sm font-semibold text-dc-black/70 hover:bg-dc-cream hover:text-red-700 ${FOCUS}`}>
                        Hapus
                      </button>
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Shell>
  );
}
