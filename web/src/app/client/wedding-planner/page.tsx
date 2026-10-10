"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ErrorState, ERROR_TEXT, FOCUS, ICON_BTN, INPUT, SkeletonList } from "@/app/client/_ui";
import { Button } from "@/components/Button";
import { CLIENT_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
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

const STATUS_TONE: Record<PlannerTaskStatus, "neutral" | "gold" | "success"> = {
  todo: "neutral",
  in_progress: "gold",
  done: "success",
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

  const [loadError, setLoadError] = useState<string | null>(null);

  function load() {
    setLoadError(null);
    return apiGet<PlannerTask[]>("/api/v1/wedding-planner/tasks")
      .then((data) => setTasks(data ?? []))
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "Gagal memuat checklist."))
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
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-10">
        <WeddingPlannerTabs />
        <PageHeader
          title="Checklist"
          subtitle="Ketuk status untuk mengubah: Belum, Proses, lalu Selesai."
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
                aria-label="Judul tugas"
                placeholder="Judul tugas"
                required
                className={INPUT}
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  type="text"
                  value={newTimeframe}
                  onChange={(e) => setNewTimeframe(e.target.value)}
                  aria-label="Periode"
                  placeholder="Periode (mis. H-3 Bulan)"
                  required
                  className={INPUT}
                />
                <input
                  type="date"
                  aria-label="Target tanggal"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className={INPUT}
                />
              </div>
              <Button type="submit" className="w-auto" loading={savingTask}>
                Simpan Tugas
              </Button>
            </form>
          </Card>
        )}

        {loading ? (
          <SkeletonList rows={4} height="h-16" />
        ) : loadError ? (
          <ErrorState message={loadError} onRetry={load} />
        ) : (
          <>
            <Card className="mb-6 p-5">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="font-medium text-dc-ink">Progres Persiapan</span>
                <span className="tabular-nums text-dc-black/70">
                  {doneCount}/{tasks.length} selesai ({progressPct}%)
                </span>
              </div>
              <div
                role="progressbar"
                aria-label="Progres persiapan"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progressPct}
                className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-dc-ink/10"
              >
                <div className="h-full bg-dc-clay transition-[width] duration-150" style={{ width: `${progressPct}%` }} />
              </div>
            </Card>

            {error && (
              <p role="alert" className={`mb-4 ${ERROR_TEXT}`}>
                {error}
              </p>
            )}

            {tasks.length === 0 && (
              <EmptyState title="Belum ada tugas" body="Tambah tugas pertamamu untuk mulai menyusun persiapan." />
            )}

            <div className="flex flex-col gap-8">
              {groups.map((timeframe) => (
                <div key={timeframe}>
                  <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-dc-black/70">{timeframe}</h2>
                  <Card className="divide-y divide-dc-ink/10">
                    {tasks
                      .filter((t) => t.timeframe === timeframe)
                      .map((task) => (
                        <div key={task.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
                          <div className="min-w-0">
                            <p className={`break-words ${task.status === "done" ? "text-dc-black/60 line-through" : "text-dc-ink"}`}>{task.title}</p>
                            {task.related_category && (
                              <div className="flex flex-wrap items-center gap-2">
                                <Link
                                  href={`/vendors?category=${task.related_category}`}
                                  className={`inline-flex min-h-11 items-center text-xs font-semibold text-dc-clay underline-offset-4 hover:underline ${FOCUS}`}
                                >
                                  Cari vendor {categoryLabel(task.related_category)}
                                </Link>
                                {!!spentByCategory[task.related_category] && (
                                  <span className="text-xs tabular-nums text-dc-black/70">
                                    · sudah booking {formatRupiah(spentByCategory[task.related_category])}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <input
                              type="date"
                              aria-label={`Target tanggal: ${task.title}`}
                              value={task.due_date ?? ""}
                              onChange={(e) => handleSetDueDate(task.id, e.target.value)}
                              className={`${INPUT} w-auto text-xs`}
                            />
                            <button
                              type="button"
                              onClick={() => cycleStatus(task)}
                              aria-label={`Status ${task.title}: ${STATUS_LABEL[task.status]}. Ubah status`}
                              className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-md ${FOCUS}`}
                            >
                              <Badge tone={STATUS_TONE[task.status]}>{STATUS_LABEL[task.status]}</Badge>
                            </button>
                            {task.is_custom && (
                              <button
                                type="button"
                                onClick={() => handleDeleteTask(task.id)}
                                aria-label={`Hapus tugas: ${task.title}`}
                                className={`${ICON_BTN} hover:text-red-700`}
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
