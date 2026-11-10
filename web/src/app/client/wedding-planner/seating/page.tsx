"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Sheet";
import { Skeleton, SkeletonGroup } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { WithUser } from "@/components/WithUser";
import { apiDelete, apiGet, apiPost, ApiError, type CurrentUser, type SeatedGuest, type SeatingBoard, type SeatingTableWithGuests } from "@/lib/api";

import { Icon, InlineAlert, MobileActionBar, PlannerFrame, PlannerTitle } from "../_parts";

export default function SeatingPage() {
  return (
    <WithUser allowedRoles={["client"]} loginPath="/login">
      {(user) => <SeatingContent user={user} />}
    </WithUser>
  );
}

const seats = (gs: SeatedGuest[]) => gs.reduce((sum, g) => sum + g.party_size, 0);

function SeatingContent({ user }: { user: CurrentUser }) {
  const { show } = useToast();
  const [board, setBoard] = useState<SeatingBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showAddTable, setShowAddTable] = useState(false);
  const [tableName, setTableName] = useState("");
  const [tableCapacity, setTableCapacity] = useState("8");
  const [saving, setSaving] = useState(false);
  const [draggingGuestId, setDraggingGuestId] = useState<string | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);
  // Tap and keyboard alternative to drag and drop: the guest being placed and where they sit now.
  const [placing, setPlacing] = useState<{ guest: SeatedGuest; tableId: string | null } | null>(null);
  const [confirmTable, setConfirmTable] = useState<string | null>(null);

  function load() {
    setLoadError(null);
    return apiGet<SeatingBoard>("/api/v1/seating/board")
      .then(setBoard)
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "Gagal memuat denah."))
      .finally(() => setLoading(false));
  }

  function retry() {
    setLoading(true);
    void load();
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
      show("Meja ditambahkan.", "success");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menambah meja.");
      setShowAddTable(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteTable(id: string) {
    setConfirmTable(null);
    try {
      await apiDelete(`/api/v1/seating/tables/${id}`);
      show("Meja dihapus. Tamunya kembali ke daftar tunggu.", "success");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menghapus meja.");
    }
  }

  async function assign(guestId: string, tableId: string) {
    try {
      await apiPost("/api/v1/seating/assign", { guest_id: guestId, table_id: tableId });
      show("Tamu ditempatkan.", "success");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menempatkan tamu.");
    }
  }

  async function unassign(guestId: string) {
    try {
      await apiDelete(`/api/v1/seating/assign/${guestId}`);
      show("Tamu kembali ke daftar tunggu.", "success");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal mengeluarkan tamu.");
    }
  }

  async function handleDropOnTable(tableId: string) {
    const guestId = draggingGuestId;
    setDraggingGuestId(null);
    setDragOverTarget(null);
    if (!guestId) return;
    await assign(guestId, tableId);
  }

  async function handleDropOnUnassigned() {
    const guestId = draggingGuestId;
    setDraggingGuestId(null);
    setDragOverTarget(null);
    if (!guestId) return;
    await unassign(guestId);
  }

  async function placeAt(tableId: string | null) {
    if (!placing) return;
    const { guest } = placing;
    setPlacing(null);
    if (tableId) await assign(guest.id, tableId);
    else await unassign(guest.id);
  }

  const tables = board?.tables ?? [];
  const unassigned = board?.unassigned ?? [];
  const seated = tables.reduce((sum, t) => sum + seats(t.guests), 0);
  const waiting = seats(unassigned);
  const capacity = tables.reduce((sum, t) => sum + t.capacity, 0);

  const addButton = (
    <Button variant="gold" onClick={() => setShowAddTable(true)}>
      <Icon name="plus" size={18} />
      Tambah meja
    </Button>
  );

  return (
    <PlannerFrame user={user} bottomBar>
      <PlannerTitle
        title="Denah meja,"
        accent="siapa duduk di mana"
        subtitle="Seret nama tamu ke meja, atau ketuk namanya lalu pilih mejanya."
        action={addButton}
      />

      <InlineAlert message={error} onClose={() => setError(null)} />

      {loading ? (
        <SkeletonGroup label="Memuat denah" className="flex flex-col gap-6">
          <Skeleton className="h-36 rounded-2xl" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-72 rounded-xl" />
            <Skeleton className="h-72 rounded-xl" />
            <Skeleton className="hidden h-72 rounded-xl lg:block" />
          </div>
        </SkeletonGroup>
      ) : loadError ? (
        <ErrorState title="Denah belum termuat" body={loadError} onRetry={retry} />
      ) : !board ? null : (
        <div className="flex flex-col gap-8">
          {/* Waiting tray: the focal point while people still need a seat. Also a drop zone. */}
          <section
            aria-labelledby="tray-h"
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverTarget("unassigned");
            }}
            onDragLeave={() => setDragOverTarget(null)}
            onDrop={handleDropOnUnassigned}
            className={`rounded-2xl border p-5 transition-colors duration-200 sm:p-7 ${
              dragOverTarget === "unassigned" ? "border-dc-gold bg-dc-gold/10" : "border-dc-line bg-dc-cream"
            }`}
          >
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
              <div>
                <h2 id="tray-h" className="font-heading text-[1.9rem] leading-tight text-dc-ink">
                  Belum dapat kursi
                </h2>
                <p className="mt-1 text-sm text-dc-text-2">
                  {unassigned.length === 0 ? "Semua tamu sudah dapat meja." : `${unassigned.length} tamu, ${waiting} orang menunggu tempat duduk.`}
                </p>
              </div>
              <dl className="flex gap-8 text-sm">
                <div className="flex flex-col-reverse">
                  <dt className="mt-1 text-dc-text-2">Sudah duduk</dt>
                  <dd className="font-heading text-[2.2rem] font-semibold leading-none text-dc-ink [font-variant-numeric:lining-nums_tabular-nums]">{seated}</dd>
                </div>
                <div className="flex flex-col-reverse">
                  <dt className="mt-1 text-dc-text-2">Total kursi</dt>
                  <dd className="font-heading text-[2.2rem] font-semibold leading-none text-dc-ink [font-variant-numeric:lining-nums_tabular-nums]">{capacity}</dd>
                </div>
              </dl>
            </div>
            {unassigned.length > 0 && (
              <ul className="mt-5 flex flex-wrap gap-2">
                {unassigned.map((g) => (
                  <li key={g.id}>
                    <GuestChip guest={g} onDragStart={() => setDraggingGuestId(g.id)} onPick={() => setPlacing({ guest: g, tableId: null })} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {tables.length === 0 ? (
            <EmptyState
              title="Belum ada meja"
              body="Tambah meja dulu, misalnya Meja Keluarga atau Meja Sahabat, lalu tempatkan tamu di sana."
              action={
                <Button variant="primary" size="sm" onClick={() => setShowAddTable(true)}>
                  Tambah meja pertama
                </Button>
              }
            />
          ) : (
            <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {tables.map((t) => (
                <li
                  key={t.id}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverTarget(t.id);
                  }}
                  onDragLeave={() => setDragOverTarget(null)}
                  onDrop={() => handleDropOnTable(t.id)}
                >
                  <TableCard
                    table={t}
                    over={dragOverTarget === t.id}
                    confirming={confirmTable === t.id}
                    onAskDelete={() => setConfirmTable(t.id)}
                    onCancelDelete={() => setConfirmTable(null)}
                    onDelete={() => handleDeleteTable(t.id)}
                    onDragGuest={(id) => setDraggingGuestId(id)}
                    onPickGuest={(g) => setPlacing({ guest: g, tableId: t.id })}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {!loading && !loadError && (
        <MobileActionBar>
          <Button variant="gold" block onClick={() => setShowAddTable(true)}>
            <Icon name="plus" size={18} />
            Tambah meja
          </Button>
        </MobileActionBar>
      )}

      <Sheet
        open={showAddTable}
        onClose={() => setShowAddTable(false)}
        title="Tambah meja"
        footer={
          <Button type="submit" form="add-table" variant="primary" block loading={saving}>
            Simpan meja
          </Button>
        }
      >
        <form id="add-table" onSubmit={handleAddTable} className="flex flex-col gap-5">
          <Input label="Nama meja" value={tableName} onChange={(e) => setTableName(e.target.value)} placeholder="Misalnya: Meja Keluarga Putri" required autoComplete="off" />
          <Input label="Jumlah kursi" type="number" inputMode="numeric" min={1} value={tableCapacity} onChange={(e) => setTableCapacity(e.target.value)} />
        </form>
      </Sheet>

      <Sheet
        open={!!placing}
        onClose={() => setPlacing(null)}
        title={placing ? `Tempatkan ${placing.guest.name}` : "Tempatkan tamu"}
        description={placing && placing.guest.party_size > 1 ? `Butuh ${placing.guest.party_size} kursi.` : "Butuh 1 kursi."}
      >
        {placing && (
          <div className="flex flex-col gap-2">
            {tables.length === 0 && <p className="text-sm text-dc-text-2">Belum ada meja. Tambah meja dulu.</p>}
            {tables.map((t) => {
              const free = t.capacity - seats(t.guests);
              const here = placing.tableId === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  disabled={here}
                  onClick={() => placeAt(t.id)}
                  className="flex min-h-14 items-center justify-between gap-3 rounded-lg border border-dc-line-strong bg-dc-white px-4 text-left transition-colors hover:border-dc-ink disabled:cursor-default disabled:border-dc-gold disabled:bg-dc-gold/10"
                >
                  <span className="min-w-0 break-words font-semibold text-dc-ink">{t.name}</span>
                  <span className={`shrink-0 text-sm tabular-nums ${here ? "font-semibold text-dc-clay" : free < placing.guest.party_size ? "text-dc-danger" : "text-dc-text-2"}`}>
                    {here ? "Duduk di sini" : free <= 0 ? "Penuh" : `${free} kursi kosong`}
                  </span>
                </button>
              );
            })}
            {placing.tableId && (
              <Button variant="ghost" className="mt-3" onClick={() => placeAt(null)}>
                Keluarkan dari meja
              </Button>
            )}
          </div>
        )}
      </Sheet>
    </PlannerFrame>
  );
}

function GuestChip({ guest, onDragStart, onPick }: { guest: SeatedGuest; onDragStart: () => void; onPick: () => void }) {
  return (
    <button
      type="button"
      draggable
      onDragStart={onDragStart}
      onClick={onPick}
      aria-label={`${guest.name}${guest.party_size > 1 ? `, ${guest.party_size} orang` : ""}. Pilih meja`}
      className="inline-flex min-h-11 max-w-full cursor-grab items-center gap-2 rounded-full border border-dc-line-strong bg-dc-white px-4 text-sm font-semibold text-dc-ink transition-[border-color,box-shadow] duration-200 hover:border-dc-ink hover:shadow-soft active:cursor-grabbing"
    >
      <span className="truncate">{guest.name}</span>
      {guest.party_size > 1 && <span className="rounded-full bg-dc-cream px-1.5 text-xs tabular-nums text-dc-text-2">{guest.party_size}</span>}
    </button>
  );
}

/** Round table drawn from real data: one dot per chair, gold when taken. */
function TableDiagram({ capacity, taken }: { capacity: number; taken: number }) {
  const n = Math.min(capacity, 24);
  const r = 38;
  return (
    <svg viewBox="0 0 100 100" className="h-32 w-32 shrink-0" aria-hidden>
      <circle cx="50" cy="50" r="26" fill="var(--dc-cream)" stroke="var(--dc-line-strong)" />
      {Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2 - Math.PI / 2;
        const on = i < taken;
        return (
          <circle
            key={i}
            cx={50 + r * Math.cos(a)}
            cy={50 + r * Math.sin(a)}
            r={n > 16 ? 3.6 : 5}
            fill={on ? "var(--dc-gold)" : "var(--dc-white)"}
            stroke={on ? "var(--dc-gold)" : "var(--dc-line-strong)"}
          />
        );
      })}
    </svg>
  );
}

function TableCard({
  table,
  over,
  confirming,
  onAskDelete,
  onCancelDelete,
  onDelete,
  onDragGuest,
  onPickGuest,
}: {
  table: SeatingTableWithGuests;
  over: boolean;
  confirming: boolean;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onDelete: () => void;
  onDragGuest: (id: string) => void;
  onPickGuest: (g: SeatedGuest) => void;
}) {
  const taken = seats(table.guests);
  const full = taken >= table.capacity;
  return (
    <article
      className={`flex h-full flex-col rounded-xl border p-5 shadow-soft transition-[border-color,background-color] duration-200 ${
        over ? "border-dc-gold bg-dc-gold/5" : "border-dc-line bg-dc-white"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="break-words font-heading text-[1.6rem] leading-tight text-dc-ink">{table.name}</h3>
          <p className={`mt-0.5 text-sm tabular-nums ${full ? "font-semibold text-dc-clay" : "text-dc-text-2"}`}>
            {taken} dari {table.capacity} kursi{full ? ", penuh" : ""}
          </p>
        </div>
        {!confirming && (
          <button
            type="button"
            onClick={onAskDelete}
            aria-label={`Hapus ${table.name}`}
            className="-mr-2 -mt-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-dc-text-3 transition-colors hover:bg-dc-danger/10 hover:text-dc-danger"
          >
            <Icon name="trash" size={18} />
          </button>
        )}
      </div>

      {confirming && (
        <div role="group" aria-label={`Konfirmasi hapus ${table.name}`} className="mt-3 rounded-lg bg-dc-danger/[0.05] p-3">
          <p className="text-sm text-dc-text-2">Hapus meja ini? Tamunya kembali ke daftar tunggu.</p>
          <div className="mt-2 flex gap-2">
            <Button variant="danger" size="sm" onClick={onDelete}>
              Ya, hapus
            </Button>
            <Button variant="ghost" size="sm" onClick={onCancelDelete}>
              Batal
            </Button>
          </div>
        </div>
      )}

      <div className="mt-3 flex justify-center">
        <TableDiagram capacity={table.capacity} taken={taken} />
      </div>

      {table.guests.length === 0 ? (
        <p className="mt-3 rounded-lg border border-dashed border-dc-line-strong px-3 py-4 text-center text-sm text-dc-text-3">Seret atau pilih tamu untuk meja ini.</p>
      ) : (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {table.guests.map((g) => (
            <li key={g.id} className="max-w-full">
              <GuestChip guest={g} onDragStart={() => onDragGuest(g.id)} onPick={() => onPickGuest(g)} />
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
