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
import { apiDelete, apiGet, apiPost, ApiError, type CurrentUser, type SeatingBoard } from "@/lib/api";

export default function SeatingPage() {
  return (
    <WithUser allowedRoles={["client"]} loginPath="/login">
      {(user) => <SeatingContent user={user} />}
    </WithUser>
  );
}

function SeatingContent({ user }: { user: CurrentUser }) {
  const { show } = useToast();
  const [board, setBoard] = useState<SeatingBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddTable, setShowAddTable] = useState(false);
  const [tableName, setTableName] = useState("");
  const [tableCapacity, setTableCapacity] = useState("8");
  const [saving, setSaving] = useState(false);
  const [draggingGuestId, setDraggingGuestId] = useState<string | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);

  function load() {
    return apiGet<SeatingBoard>("/api/v1/seating/board")
      .then(setBoard)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Gagal memuat denah."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    queueMicrotask(load);
  }, []);

  async function handleAddTable(e: React.FormEvent) {
    e.preventDefault();
    if (!tableName.trim()) return;
    setSaving(true);
    try {
      await apiPost("/api/v1/seating/tables", { name: tableName, capacity: Number(tableCapacity) || 8 });
      setTableName("");
      setTableCapacity("8");
      setShowAddTable(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menambah meja.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteTable(id: string) {
    try {
      await apiDelete(`/api/v1/seating/tables/${id}`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menghapus meja.");
    }
  }

  async function handleDropOnTable(tableId: string) {
    const guestId = draggingGuestId;
    setDraggingGuestId(null);
    setDragOverTarget(null);
    if (!guestId) return;
    try {
      await apiPost("/api/v1/seating/assign", { guest_id: guestId, table_id: tableId });
      show("Tamu ditempatkan.", "success");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menempatkan tamu.");
    }
  }

  async function handleDropOnUnassigned() {
    const guestId = draggingGuestId;
    setDraggingGuestId(null);
    setDragOverTarget(null);
    if (!guestId) return;
    try {
      await apiDelete(`/api/v1/seating/assign/${guestId}`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal mengeluarkan tamu.");
    }
  }

  return (
    <Shell user={user} navItems={CLIENT_NAV} loginPath="/login" eyebrow="Client">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <WeddingPlannerTabs />
        <PageHeader
          title="Denah Meja"
          subtitle="Seret nama tamu ke meja untuk menempatkan mereka."
          action={
            <Button variant="ghost" className="w-auto" onClick={() => setShowAddTable((v) => !v)}>
              {showAddTable ? "Batal" : "+ Tambah Meja"}
            </Button>
          }
        />

        {showAddTable && (
          <Card className="mb-6 p-5">
            <form onSubmit={handleAddTable} className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
                placeholder="Nama meja (mis. Meja 1)"
                required
                className="flex-1 rounded-xl border border-dc-black/15 px-4 py-2.5 outline-none focus:border-dc-gold focus:ring-2 focus:ring-dc-gold/30"
              />
              <input
                type="number"
                min={1}
                value={tableCapacity}
                onChange={(e) => setTableCapacity(e.target.value)}
                placeholder="Kapasitas"
                className="w-full rounded-xl border border-dc-black/15 px-4 py-2.5 outline-none focus:border-dc-gold focus:ring-2 focus:ring-dc-gold/30 sm:w-32"
              />
              <Button type="submit" className="w-auto" loading={saving}>
                Tambah
              </Button>
            </form>
          </Card>
        )}

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {loading ? (
          <p className="text-dc-black/60">Memuat…</p>
        ) : !board ? null : (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="mb-2 font-heading font-bold text-dc-navy">Belum Ditempatkan</h2>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverTarget("unassigned");
                }}
                onDragLeave={() => setDragOverTarget(null)}
                onDrop={handleDropOnUnassigned}
                className={`flex min-h-16 flex-wrap gap-2 rounded-2xl border-2 border-dashed p-4 transition ${
                  dragOverTarget === "unassigned" ? "border-dc-gold bg-dc-gold/5" : "border-dc-black/10"
                }`}
              >
                {board.unassigned.length === 0 ? (
                  <p className="text-sm text-dc-black/40">Semua tamu sudah ditempatkan.</p>
                ) : (
                  board.unassigned.map((g) => (
                    <span
                      key={g.id}
                      draggable
                      onDragStart={() => setDraggingGuestId(g.id)}
                      className="cursor-grab rounded-full bg-dc-white px-3 py-1.5 text-sm text-dc-navy shadow-sm shadow-dc-navy/10"
                    >
                      {g.name}
                      {g.party_size > 1 && <span className="text-dc-black/50"> ({g.party_size})</span>}
                    </span>
                  ))
                )}
              </div>
            </div>

            {board.tables.length === 0 ? (
              <EmptyState title="Belum ada meja" body="Tambah meja dulu di atas, lalu seret tamu ke sana." />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {board.tables.map((t) => {
                  const seatedCount = t.guests.reduce((sum, g) => sum + g.party_size, 0);
                  const full = seatedCount >= t.capacity;
                  return (
                    <div
                      key={t.id}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverTarget(t.id);
                      }}
                      onDragLeave={() => setDragOverTarget(null)}
                      onDrop={() => handleDropOnTable(t.id)}
                    >
                      <Card className={`p-4 transition ${dragOverTarget === t.id ? "ring-2 ring-dc-gold" : ""}`}>
                        <div className="flex items-center justify-between">
                          <p className="font-heading font-bold text-dc-navy">{t.name}</p>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-semibold ${full ? "text-dc-rose" : "text-dc-black/50"}`}>
                              {seatedCount}/{t.capacity}
                            </span>
                            <button onClick={() => handleDeleteTable(t.id)} aria-label="Hapus meja" className="text-dc-black/30 hover:text-red-600">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <path d="M6 6l12 12M18 6 6 18" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        <div className="mt-3 flex min-h-10 flex-wrap gap-1.5">
                          {t.guests.map((g) => (
                            <span
                              key={g.id}
                              draggable
                              onDragStart={() => setDraggingGuestId(g.id)}
                              className="cursor-grab rounded-full bg-dc-offwhite px-2.5 py-1 text-xs text-dc-navy"
                            >
                              {g.name}
                              {g.party_size > 1 && <span className="text-dc-black/50"> ({g.party_size})</span>}
                            </span>
                          ))}
                        </div>
                      </Card>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </Shell>
  );
}
