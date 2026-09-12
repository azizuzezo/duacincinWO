"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { CLIENT_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { WithUser } from "@/components/WithUser";
import { apiGet, apiPatch, ApiError, categoryLabel, type CurrentUser, type PlannerTask, type PlannerTaskStatus } from "@/lib/api";

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

  const doneCount = tasks.filter((t) => t.status === "done").length;
  const progressPct = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;
  const groups = Array.from(new Set(tasks.map((t) => t.timeframe)));

  return (
    <Shell user={user} navItems={CLIENT_NAV} loginPath="/login" eyebrow="Client">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <PageHeader title="Wedding Planner" subtitle="Klik status untuk mengubah (Belum → Proses → Selesai)." />

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
                        <div key={task.id} className="flex items-center justify-between gap-3 px-4 py-3">
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
