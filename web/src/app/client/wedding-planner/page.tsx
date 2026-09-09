"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { WithUser } from "@/components/WithUser";
import { apiGet, apiPatch, ApiError, categoryLabel, type PlannerTask, type PlannerTaskStatus } from "@/lib/api";

export default function WeddingPlannerPage() {
  return (
    <WithUser allowedRoles={["client"]} loginPath="/client/login">
      {() => <WeddingPlannerContent />}
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

function WeddingPlannerContent() {
  const [tasks, setTasks] = useState<PlannerTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<PlannerTask[]>("/api/v1/wedding-planner/tasks")
      .then((data) => {
        setTasks(data ?? []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Gagal memuat checklist.");
        setLoading(false);
      });
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

  if (loading) return <p className="p-8 text-center text-dc-black/60">Memuat…</p>;

  const doneCount = tasks.filter((t) => t.status === "done").length;
  const groups = Array.from(new Set(tasks.map((t) => t.timeframe)));

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-heading text-2xl font-extrabold text-dc-navy">Wedding Planner</h1>
      <p className="mt-1 text-dc-black/60">
        {doneCount}/{tasks.length} tahapan selesai. Klik status untuk mengubah (Belum → Proses → Selesai).
      </p>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 flex flex-col gap-6">
        {groups.map((timeframe) => (
          <div key={timeframe}>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-dc-gold">{timeframe}</h2>
            <ul className="flex flex-col gap-2">
              {tasks
                .filter((t) => t.timeframe === timeframe)
                .map((task) => (
                  <li
                    key={task.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-dc-black/10 bg-dc-white px-4 py-3"
                  >
                    <div>
                      <p className="text-dc-navy">{task.title}</p>
                      {task.related_category && (
                        <Link
                          href={`/vendors?category=${task.related_category}`}
                          className="text-xs font-semibold text-dc-gold hover:text-dc-navy"
                        >
                          Cari Vendor {categoryLabel(task.related_category)} →
                        </Link>
                      )}
                    </div>
                    <button
                      onClick={() => cycleStatus(task)}
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLE[task.status]}`}
                    >
                      {STATUS_LABEL[task.status]}
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
    </main>
  );
}
