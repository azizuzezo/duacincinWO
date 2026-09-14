"use client";

import { useEffect, useState } from "react";

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
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  function load() {
    return apiGet<RundownItem[]>("/api/v1/rundown")
      .then((d) => setItems(d ?? []))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Gagal memuat rundown."))
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
      <div className="mx-auto max-w-2xl px-4 py-10">
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
              <div className="grid grid-cols-3 gap-3">
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                  className="col-span-1 rounded-xl border border-dc-black/15 px-3 py-2.5 outline-none focus:border-dc-gold focus:ring-2 focus:ring-dc-gold/30"
                />
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Judul (mis. Akad Nikah)"
                  required
                  className="col-span-2 rounded-xl border border-dc-black/15 px-4 py-2.5 outline-none focus:border-dc-gold focus:ring-2 focus:ring-dc-gold/30"
                />
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Catatan (opsional)"
                className="w-full rounded-xl border border-dc-black/15 px-4 py-2.5 outline-none focus:border-dc-gold focus:ring-2 focus:ring-dc-gold/30"
              />
              <Button type="submit" className="w-auto" loading={saving}>
                {editingId ? "Simpan Perubahan" : "Tambah"}
              </Button>
            </form>
          </Card>
        )}

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {loading ? (
          <p className="text-dc-black/60">Memuat…</p>
        ) : items.length === 0 ? (
          <EmptyState title="Belum ada rundown" body="Tambah jadwal pertama di atas." />
        ) : (
          <ul className="relative flex flex-col gap-4 border-l-2 border-dc-gold/30 pl-6">
            {items.map((it) => (
              <li key={it.id} className="relative">
                <span className="absolute -left-[29px] top-1.5 h-3 w-3 rounded-full bg-dc-gold" />
                <Card className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-heading font-bold text-dc-navy">{it.start_time}</p>
                      <p className="mt-0.5 text-dc-navy">{it.title}</p>
                      {it.notes && <p className="mt-1 text-sm text-dc-black/60">{it.notes}</p>}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button onClick={() => startEdit(it)} className="text-xs font-semibold text-dc-gold hover:text-dc-navy">
                        Ubah
                      </button>
                      <button onClick={() => handleDelete(it.id)} className="text-xs font-semibold text-dc-black/40 hover:text-red-600">
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
