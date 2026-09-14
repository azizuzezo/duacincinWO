"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/Button";
import { CLIENT_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { WeddingPlannerTabs } from "@/components/WeddingPlannerTabs";
import { WithUser } from "@/components/WithUser";
import {
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
  ApiError,
  categoryLabel,
  formatRupiah,
  type CurrentUser,
  type PlannerTask,
  type PlannerTaskStatus,
  type SpentByCategory,
} from "@/lib/api";

export default function WeddingPlannerPage() {
  return (
    <WithUser allowedRoles={["client"]} loginPath="/login">
      {(user) => <WeddingPlannerContent user={user} />}
    </WithUser>
  );
}

const STATUS_LABEL: Record<PlannerTaskStatus, string> = {
  todo: "Belum",
  in_progress: "Proses",
  done: "Selesai",
};

const STATUS_STYLE: Record<PlannerTaskStatus, string> = {
  todo: "bg-dc-offwhite text-dc-black/60",
  in_progress: "bg-dc-gold/20 text-dc-navy",
  done: "bg-green-100 text-green-800",
};

const NEXT_STATUS: Record<PlannerTaskStatus, PlannerTaskStatus> = {
  todo: "in_progress",
  in_progress: "done",
  done: "todo",
};

function WeddingPlannerContent({ user }: { user: CurrentUser }) {
  const { show } = useToast();
  const [tasks, setTasks] = useState<PlannerTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newTimeframe, setNewTimeframe] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [savingTask, setSavingTask] = useState(false);
  const [spentByCategory, setSpentByCategory] = useState<SpentByCategory>({});

  function load() {
    return apiGet<PlannerTask[]>("/api/v1/wedding-planner/tasks")
      .then((data) => setTasks(data ?? []))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Gagal memuat checklist."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    queueMicrotask(load);
    apiGet<SpentByCategory>("/api/v1/bookings/spent-by-category")
      .then((d) => setSpentByCategory(d ?? {}))
      .catch(() => {});
  }, []);

  async function cycleStatus(task: PlannerTask) {
    const nextStatus = NEXT_STATUS[task.status];
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t)));
    try {
      await apiPatch(`/api/v1/wedding-planner/tasks/${task.id}`, { status: nextStatus });
    } catch (err) {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: task.status } : t)));
      setError(err instanceof ApiError ? err.message : "Gagal memperbarui status.");
    }
  }

  async function handleSetDueDate(taskID: string, dueDate: string) {
    setTasks((prev) => prev.map((t) => (t.id === taskID ? { ...t, due_date: dueDate || undefined } : t)));
    try {
      await apiPatch(`/api/v1/wedding-planner/tasks/${taskID}/due-date`, { due_date: dueDate });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal mengubah target tanggal.");
    }
  }

  async function handleAddTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim() || !newTimeframe.trim()) return;
    setSavingTask(true);
    try {
      await apiPost("/api/v1/wedding-planner/tasks", { title: newTitle, timeframe: newTimeframe, due_date: newDueDate });
      setNewTitle("");
      setNewTimeframe("");
      setNewDueDate("");
      setShowAddForm(false);
      show("Tugas ditambahkan.", "success");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menambah tugas.");
    } finally {
      setSavingTask(false);
    }
  }

  async function handleDeleteTask(taskID: string) {
    try {
      await apiDelete(`/api/v1/wedding-planner/tasks/${taskID}`);
      setTasks((prev) => prev.filter((t) => t.id !== taskID));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menghapus tugas.");
    }
  }

  const doneCount = tasks.filter((t) => t.status === "done").length;
  const progressPct = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;
  const groups = Array.from(new Set(tasks.map((t) => t.timeframe)));

  return (
    <Shell user={user} navItems={CLIENT_NAV} loginPath="/login" eyebrow="Client">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <WeddingPlannerTabs />
        <PageHeader
          title="Checklist"
          subtitle="Klik status untuk mengubah (Belum → Proses → Selesai)."
          action={
            <Button variant="ghost" className="w-auto" onClick={() => setShowAddForm((v) => !v)}>
              {showAddForm ? "Batal" : "+ Tambah Tugas"}
            </Button>
          }
        />

        {showAddForm && (
          <Card className="mb-6 p-5">
            <form onSubmit={handleAddTask} className="flex flex-col gap-3">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Judul tugas"
                required
                className="w-full rounded-xl border border-dc-black/15 px-4 py-2.5 outline-none focus:border-dc-gold focus:ring-2 focus:ring-dc-gold/30"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={newTimeframe}
                  onChange={(e) => setNewTimeframe(e.target.value)}
                  placeholder="Periode (mis. H-3 Bulan)"
                  required
                  className="w-full rounded-xl border border-dc-black/15 px-4 py-2.5 outline-none focus:border-dc-gold focus:ring-2 focus:ring-dc-gold/30"
                />
                <input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="w-full rounded-xl border border-dc-black/15 px-4 py-2.5 outline-none focus:border-dc-gold focus:ring-2 focus:ring-dc-gold/30"
                />
              </div>
              <Button type="submit" className="w-auto" loading={savingTask}>
                Simpan Tugas
              </Button>
            </form>
          </Card>
        )}

        {loading ? (
          <p className="text-dc-black/60">Memuat…</p>
        ) : (
          <>
            <Card className="mb-6 p-5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-dc-navy">Progres Persiapan</span>
                <span className="text-dc-black/60">
                  {doneCount}/{tasks.length} selesai
                </span>
              </div>
              <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-dc-offwhite">
                <div className="h-full rounded-full bg-dc-gold transition-all duration-500" style={{ width: `${progressPct}%` }} />
              </div>
            </Card>

            {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

            <div className="flex flex-col gap-6">
              {groups.map((timeframe) => (
                <div key={timeframe}>
                  <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-dc-gold">{timeframe}</h2>
                  <Card className="divide-y divide-dc-black/5">
                    {tasks
                      .filter((t) => t.timeframe === timeframe)
                      .map((task) => (
                        <div key={task.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                          <div>
                            <p className="text-dc-navy">{task.title}</p>
                            {task.related_category && (
                              <div className="flex flex-wrap items-center gap-2">
                                <Link
                                  href={`/vendors?category=${task.related_category}`}
                                  className="text-xs font-semibold text-dc-gold hover:text-dc-navy"
                                >
                                  Cari Vendor {categoryLabel(task.related_category)} →
                                </Link>
                                {!!spentByCategory[task.related_category] && (
                                  <span className="text-xs text-dc-black/50">
                                    · sudah booking {formatRupiah(spentByCategory[task.related_category])}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <input
                              type="date"
                              value={task.due_date ?? ""}
                              onChange={(e) => handleSetDueDate(task.id, e.target.value)}
                              className="rounded-lg border border-dc-black/15 px-2 py-1 text-xs outline-none focus:border-dc-gold focus:ring-1 focus:ring-dc-gold/30"
                            />
                            <button
                              onClick={() => cycleStatus(task)}
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLE[task.status]}`}
                            >
                              {STATUS_LABEL[task.status]}
                            </button>
                            {task.is_custom && (
                              <button
                                onClick={() => handleDeleteTask(task.id)}
                                aria-label="Hapus tugas"
                                className="text-dc-black/30 hover:text-red-600"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                  <path d="M6 6l12 12M18 6 6 18" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                  </Card>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </Shell>
  );
}
