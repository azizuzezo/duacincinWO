"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { InvitationCard } from "@/components/invitation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Sheet";
import { Skeleton, SkeletonGroup } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
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
import {
  fadeUp,
  motionSafe,
  SPRING_SNAPPY,
  staggerList,
  useReducedMotion,
} from "@/lib/motion";

import {
  dateInputValue,
  FilterChips,
  formatTanggal,
  Icon,
  InlineAlert,
  MobileActionBar,
  PlannerFrame,
  PlannerTitle,
  ProgressRing,
  todayKey,
} from "./_parts";

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

const NEXT_STATUS: Record<PlannerTaskStatus, PlannerTaskStatus> = {
  todo: "in_progress",
  in_progress: "done",
  done: "todo",
};

type Filter = "all" | "open" | "done";

function isOverdue(task: PlannerTask, today: string) {
  return (
    task.status !== "done" &&
    !!task.due_date &&
    dateInputValue(task.due_date) < today
  );
}

function WeddingPlannerContent({ user }: { user: CurrentUser }) {
  const { show } = useToast();
  const reduced = useReducedMotion();
  const [tasks, setTasks] = useState<PlannerTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [spentByCategory, setSpentByCategory] = useState<SpentByCategory>({});
  const [filter, setFilter] = useState<Filter>("all");
  const [openOverride, setOpenOverride] = useState<Record<string, boolean>>({});

  // Add sheet
  const [addOpen, setAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newTimeframe, setNewTimeframe] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [savingTask, setSavingTask] = useState(false);

  // Edit sheet
  const [editing, setEditing] = useState<PlannerTask | null>(null);
  const [editDue, setEditDue] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  function load() {
    setLoadError(null);
    return apiGet<PlannerTask[]>("/api/v1/wedding-planner/tasks")
      .then((data) => setTasks(data ?? []))
      .catch((err) =>
        setLoadError(
          err instanceof ApiError ? err.message : "Gagal memuat checklist.",
        ),
      )
      .finally(() => setLoading(false));
  }

  function retry() {
    setLoading(true);
    void load();
  }

  useEffect(() => {
    queueMicrotask(load);
    apiGet<SpentByCategory>("/api/v1/bookings/spent-by-category")
      .then((d) => setSpentByCategory(d ?? {}))
      .catch(() => {});
  }, []);

  async function setStatus(task: PlannerTask, nextStatus: PlannerTaskStatus) {
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t)),
    );
    setEditing((cur) =>
      cur && cur.id === task.id ? { ...cur, status: nextStatus } : cur,
    );
    try {
      await apiPatch(`/api/v1/wedding-planner/tasks/${task.id}`, {
        status: nextStatus,
      });
      if (nextStatus === "done") {
        // Reward completion (design language: celebrate milestones): a chapter or the whole list just finished.
        const rest = tasks.filter((t) => t.id !== task.id);
        if (rest.every((t) => t.status === "done"))
          show("Semua persiapan beres. Selamat menyambut hari H!", "success");
        else if (
          rest
            .filter((t) => t.timeframe === task.timeframe)
            .every((t) => t.status === "done")
        )
          show(
            `Bab ${task.timeframe} beres. Satu langkah lebih dekat.`,
            "success",
          );
      }
    } catch (err) {
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: task.status } : t)),
      );
      setEditing((cur) =>
        cur && cur.id === task.id ? { ...cur, status: task.status } : cur,
      );
      setError(
        err instanceof ApiError ? err.message : "Gagal memperbarui status.",
      );
    }
  }

  function cycleStatus(task: PlannerTask) {
    void setStatus(task, NEXT_STATUS[task.status]);
  }

  async function handleSetDueDate(taskID: string, dueDate: string) {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskID ? { ...t, due_date: dueDate || undefined } : t,
      ),
    );
    try {
      await apiPatch(`/api/v1/wedding-planner/tasks/${taskID}/due-date`, {
        due_date: dueDate,
      });
      show(
        dueDate
          ? `Target diatur ke ${formatTanggal(dueDate)}.`
          : "Target tanggal dihapus.",
        "success",
      );
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Gagal mengubah target tanggal.",
      );
    }
  }

  async function handleAddTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim() || !newTimeframe.trim()) return;
    setSavingTask(true);
    try {
      await apiPost("/api/v1/wedding-planner/tasks", {
        title: newTitle,
        timeframe: newTimeframe,
        due_date: newDueDate,
      });
      setNewTitle("");
      setNewTimeframe("");
      setNewDueDate("");
      setAddOpen(false);
      show("Tugas ditambahkan.", "success");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menambah tugas.");
      setAddOpen(false);
    } finally {
      setSavingTask(false);
    }
  }

  async function handleDeleteTask(taskID: string) {
    try {
      await apiDelete(`/api/v1/wedding-planner/tasks/${taskID}`);
      setTasks((prev) => prev.filter((t) => t.id !== taskID));
      show("Tugas dihapus.", "success");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Gagal menghapus tugas.",
      );
    }
  }

  function openAdd(timeframe = "") {
    setNewTimeframe(timeframe);
    setAddOpen(true);
  }

  function openEdit(task: PlannerTask) {
    setEditing(task);
    setEditDue(dateInputValue(task.due_date));
    setConfirmDelete(false);
  }

  async function saveEdit() {
    if (!editing) return;
    if (editDue !== dateInputValue(editing.due_date))
      await handleSetDueDate(editing.id, editDue);
    setEditing(null);
  }

  const today = todayKey();
  const doneCount = tasks.filter((t) => t.status === "done").length;
  const openCount = tasks.length - doneCount;
  const progressPct = tasks.length
    ? Math.round((doneCount / tasks.length) * 100)
    : 0;
  const overdue = tasks.filter((t) => isOverdue(t, today));

  const groups = useMemo(() => {
    const order = Array.from(new Set(tasks.map((t) => t.timeframe)));
    return order.map((timeframe, i) => {
      const all = tasks.filter((t) => t.timeframe === timeframe);
      return {
        timeframe,
        anchor: `bab-${i}`,
        all,
        done: all.filter((t) => t.status === "done").length,
      };
    });
  }, [tasks]);
  const focusGroup = groups.find((g) => g.done < g.all.length);

  const visible = (t: PlannerTask) =>
    filter === "all"
      ? true
      : filter === "done"
        ? t.status === "done"
        : t.status !== "done";

  const addButton = (
    <Button variant="gold" size="md" onClick={() => openAdd()}>
      <Icon name="plus" size={18} />
      Tambah tugas
    </Button>
  );

  return (
    <PlannerFrame user={user} bottomBar>
      <PlannerTitle
        title="Persiapan,"
        accent="satu per satu"
        subtitle="Semua yang perlu kalian urus, disusun dari jauh hari sampai menjelang hari H. Ketuk lingkaran untuk menandai: belum, proses, selesai."
        action={addButton}
      />

      <InlineAlert message={error} onClose={() => setError(null)} />

      {loading ? (
        <SkeletonGroup label="Memuat checklist" className="flex flex-col gap-6">
          <Skeleton className="h-56 rounded-2xl" />
          <Skeleton className="h-11 w-72 rounded-full" />
          <Skeleton className="h-64 rounded-xl" />
        </SkeletonGroup>
      ) : loadError ? (
        <ErrorState
          title="Checklist belum termuat"
          body={loadError}
          onRetry={retry}
        />
      ) : (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <div className="min-w-0">
            {/* Overview: the one focal point of the page (progress + where to look now). */}
            {tasks.length > 0 && (
              <section
                aria-label="Ringkasan persiapan"
                className="relative mb-8 overflow-hidden rounded-2xl border border-dc-line bg-dc-white p-6 shadow-soft sm:p-8"
              >
                <Image
                  src="/scene/arch1-sm.webp"
                  alt=""
                  width={269}
                  height={250}
                  className="pointer-events-none absolute -right-14 -top-10 hidden w-[220px] opacity-20 lg:block"
                />
                <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center lg:pr-28">
                  <ProgressRing
                    value={progressPct}
                    label={`${progressPct} persen tugas selesai`}
                  />
                  <div className="min-w-0">
                    <p className="font-heading text-[2rem] leading-tight text-dc-ink [font-variant-numeric:lining-nums]">
                      {tasks.length === 0
                        ? "Belum ada tugas"
                        : `${doneCount} dari ${tasks.length} tugas selesai`}
                    </p>
                    {focusGroup ? (
                      <p className="mt-1.5 text-dc-text-2">
                        Sekarang fokus ke bab{" "}
                        <a
                          href={`#${focusGroup.anchor}`}
                          className="font-semibold text-dc-clay underline-offset-4 hover:underline"
                        >
                          {focusGroup.timeframe}
                        </a>
                        , masih {focusGroup.all.length - focusGroup.done} tugas.
                      </p>
                    ) : tasks.length > 0 ? (
                      <p className="mt-1.5 text-dc-text-2">
                        Semua tugas beres. Tinggal menikmati hari H.
                      </p>
                    ) : (
                      <p className="mt-1.5 text-dc-text-2">
                        Tambah tugas pertama kalian untuk mulai menyusun
                        persiapan.
                      </p>
                    )}
                    {overdue.length > 0 && (
                      <p className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-dc-danger">
                        <Icon name="alert" size={17} />
                        {overdue.length} tugas lewat dari target tanggal
                      </p>
                    )}
                  </div>
                </div>

                {groups.length > 1 && (
                  <ol
                    aria-label="Bab persiapan"
                    className="relative mt-8 flex gap-1 overflow-x-auto pb-1 [scrollbar-width:thin]"
                  >
                    {groups.map((g) => {
                      const complete = g.done === g.all.length;
                      const current = g === focusGroup;
                      return (
                        <li
                          key={g.anchor}
                          className="relative min-w-[118px] flex-1"
                        >
                          <span
                            aria-hidden
                            className="absolute left-5 right-0 top-5 h-px bg-dc-line-strong"
                          />
                          <a
                            href={`#${g.anchor}`}
                            className="relative flex min-h-11 flex-col items-start gap-2 rounded-md py-0.5 pr-2"
                          >
                            <span
                              className={`flex h-10 w-10 items-center justify-center rounded-full border text-xs font-semibold tabular-nums ${
                                complete
                                  ? "border-dc-gold bg-dc-gold text-dc-ink"
                                  : current
                                    ? "border-dc-gold bg-dc-white text-dc-clay ring-4 ring-dc-gold/20"
                                    : "border-dc-line-strong bg-dc-white text-dc-text-3"
                              }`}
                            >
                              {complete ? (
                                <Icon name="check" size={18} />
                              ) : (
                                `${g.done}/${g.all.length}`
                              )}
                            </span>
                            <span className="font-heading text-lg leading-tight text-dc-ink [font-variant-numeric:lining-nums]">
                              {g.timeframe}
                            </span>
                            <span
                              className={`text-xs font-semibold ${current ? "text-dc-clay" : "text-dc-text-3"}`}
                            >
                              {complete
                                ? "Beres"
                                : current
                                  ? "Sekarang"
                                  : `${g.done} dari ${g.all.length}`}
                            </span>
                          </a>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </section>
            )}

            {tasks.length === 0 ? (
              <EmptyState
                title="Belum ada tugas"
                body="Mulai dari yang paling dekat, misalnya menentukan tanggal dan anggaran."
                action={
                  <Button variant="primary" size="sm" onClick={() => openAdd()}>
                    Tambah tugas pertama
                  </Button>
                }
              />
            ) : (
              <>
                <div className="mb-6">
                  <FilterChips<Filter>
                    label="Saring tugas"
                    value={filter}
                    onChange={setFilter}
                    options={[
                      { value: "all", label: "Semua", count: tasks.length },
                      {
                        value: "open",
                        label: "Belum selesai",
                        count: openCount,
                      },
                      { value: "done", label: "Selesai", count: doneCount },
                    ]}
                  />
                </div>

                {/* Chapters enter one after another so the timeline reads top to bottom. */}
                <motion.div
                  initial="hidden"
                  animate="visible"
                  variants={motionSafe(reduced, staggerList)}
                  className="flex flex-col"
                >
                  {groups.map((g, gi) => {
                    const shown = g.all.filter(visible);
                    if (shown.length === 0) return null;
                    const complete = g.done === g.all.length;
                    const isOpen = openOverride[g.timeframe] ?? !complete;
                    const listId = `${g.anchor}-list`;
                    const lateHere = g.all.filter((t) =>
                      isOverdue(t, today),
                    ).length;
                    return (
                      <motion.section
                        key={g.anchor}
                        id={g.anchor}
                        variants={motionSafe(reduced, fadeUp)}
                        className="relative scroll-mt-24 pb-8 sm:pl-16"
                      >
                        {gi < groups.length - 1 && (
                          <span
                            aria-hidden
                            className="absolute bottom-0 left-[21px] top-12 hidden w-px bg-dc-line-strong sm:block"
                          />
                        )}
                        <span
                          aria-hidden
                          className={`absolute left-0 top-0 hidden h-11 w-11 items-center justify-center rounded-full border font-heading text-base [font-variant-numeric:lining-nums_tabular-nums] sm:flex ${
                            complete
                              ? "border-dc-gold bg-dc-gold text-dc-ink"
                              : "border-dc-gold bg-dc-white text-dc-clay"
                          }`}
                        >
                          {complete ? (
                            <Icon name="check" size={18} />
                          ) : (
                            `${g.done}/${g.all.length}`
                          )}
                        </span>
                        <h2>
                          <button
                            type="button"
                            aria-expanded={isOpen}
                            aria-controls={listId}
                            onClick={() =>
                              setOpenOverride((o) => ({
                                ...o,
                                [g.timeframe]: !isOpen,
                              }))
                            }
                            className="flex min-h-11 w-full items-center justify-between gap-3 rounded-md text-left"
                          >
                            <span className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
                              <span className="font-heading text-[1.7rem] leading-tight text-dc-ink [font-variant-numeric:lining-nums]">
                                {g.timeframe}
                              </span>
                              <span className="text-sm font-semibold tabular-nums text-dc-text-3 sm:hidden">
                                {g.done}/{g.all.length}
                              </span>
                              {complete ? (
                                <Badge tone="success">Beres</Badge>
                              ) : g === focusGroup ? (
                                <Badge tone="gold">Sekarang</Badge>
                              ) : null}
                              {lateHere > 0 && (
                                <Badge tone="danger">{lateHere} terlewat</Badge>
                              )}
                            </span>
                            <Icon
                              name="chevron"
                              size={20}
                              className={`shrink-0 text-dc-text-3 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                            />
                          </button>
                        </h2>

                        {isOpen && (
                          <div id={listId} className="mt-3">
                            <ul className="divide-y divide-dc-line overflow-hidden rounded-xl border border-dc-line bg-dc-white shadow-soft">
                              {shown.map((task) => (
                                <TaskRow
                                  key={task.id}
                                  task={task}
                                  late={isOverdue(task, today)}
                                  spent={
                                    task.related_category
                                      ? spentByCategory[task.related_category]
                                      : undefined
                                  }
                                  onCycle={() => cycleStatus(task)}
                                  onEdit={() => openEdit(task)}
                                />
                              ))}
                            </ul>
                            <button
                              type="button"
                              onClick={() => openAdd(g.timeframe)}
                              className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-md px-1 text-sm font-semibold text-dc-clay underline-offset-4 hover:underline"
                            >
                              <Icon name="plus" size={16} />
                              Tambah tugas di {g.timeframe}
                            </button>
                          </div>
                        )}
                      </motion.section>
                    );
                  })}
                </motion.div>
                {groups.every((g) => g.all.filter(visible).length === 0) && (
                  <p className="rounded-xl border border-dashed border-dc-line-strong bg-dc-white/70 px-6 py-10 text-center text-dc-text-2">
                    {filter === "done"
                      ? "Belum ada tugas yang selesai. Ayo mulai dari satu."
                      : "Semua tugas sudah selesai."}
                  </p>
                )}
              </>
            )}
          </div>

          <aside className="flex flex-col gap-6 lg:sticky lg:top-8">
            <InvitationCard />
            <Card tone="paper" className="p-5">
              <p className="font-heading text-xl leading-tight text-dc-ink">
                Bab lain di planner
              </p>
              <ul className="mt-2 flex flex-col">
                {[
                  {
                    href: "/client/wedding-planner/guests",
                    label: "Daftar tamu dan RSVP",
                    icon: "users" as const,
                  },
                  {
                    href: "/client/wedding-planner/rundown",
                    label: "Rundown hari H",
                    icon: "clock" as const,
                  },
                  {
                    href: "/client/budget",
                    label: "Budget planner",
                    icon: "store" as const,
                  },
                ].map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="flex min-h-11 items-center gap-3 rounded-md text-sm font-semibold text-dc-ink hover:text-dc-clay"
                    >
                      <Icon name={l.icon} size={18} className="text-dc-clay" />
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          </aside>
        </div>
      )}

      {!loading && !loadError && (
        <MobileActionBar>
          {
            <Button variant="gold" block onClick={() => openAdd()}>
              <Icon name="plus" size={18} />
              Tambah tugas
            </Button>
          }
        </MobileActionBar>
      )}

      <Sheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Tambah tugas"
        description="Tugas baru masuk ke bab yang kamu pilih."
        footer={
          <Button
            type="submit"
            form="add-task"
            variant="primary"
            block
            loading={savingTask}
          >
            Simpan tugas
          </Button>
        }
      >
        <form
          id="add-task"
          onSubmit={handleAddTask}
          className="flex flex-col gap-5"
        >
          <Input
            label="Judul tugas"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Misalnya: Fitting kebaya akad"
            required
            autoComplete="off"
          />
          <Input
            label="Bab"
            value={newTimeframe}
            onChange={(e) => setNewTimeframe(e.target.value)}
            placeholder="Misalnya: 3 bulan sebelum"
            hint="Pilih bab yang sudah ada atau tulis bab baru."
            list="bab-list"
            required
            autoComplete="off"
          />
          <datalist id="bab-list">
            {groups.map((g) => (
              <option key={g.anchor} value={g.timeframe} />
            ))}
          </datalist>
          <Input
            label="Target tanggal"
            optional
            type="date"
            value={newDueDate}
            onChange={(e) => setNewDueDate(e.target.value)}
          />
        </form>
      </Sheet>

      <Sheet
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Detail tugas"
        description={editing?.timeframe}
        footer={
          <Button variant="primary" block onClick={() => void saveEdit()}>
            Simpan
          </Button>
        }
      >
        {editing && (
          <div className="flex flex-col gap-6">
            <p className="font-heading text-2xl leading-snug text-dc-ink">
              {editing.title}
            </p>
            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-dc-ink">
                Status
              </legend>
              <div className="grid grid-cols-3 gap-2">
                {(["todo", "in_progress", "done"] as PlannerTaskStatus[]).map(
                  (s) => (
                    <button
                      key={s}
                      type="button"
                      aria-pressed={editing.status === s}
                      onClick={() =>
                        editing.status !== s && void setStatus(editing, s)
                      }
                      className={`min-h-11 rounded-md border text-sm font-semibold transition-colors ${
                        editing.status === s
                          ? "border-dc-ink bg-dc-ink text-dc-on-dark"
                          : "border-dc-line-strong bg-dc-white text-dc-ink hover:border-dc-ink"
                      }`}
                    >
                      {STATUS_LABEL[s]}
                    </button>
                  ),
                )}
              </div>
            </fieldset>
            <Input
              label="Target tanggal"
              optional
              type="date"
              value={editDue}
              onChange={(e) => setEditDue(e.target.value)}
              hint={editDue ? formatTanggal(editDue) : "Belum ada target."}
            />
            {editing.related_category && (
              <Link
                href={`/vendors?category=${editing.related_category}`}
                className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-dc-clay underline-offset-4 hover:underline"
              >
                <Icon name="store" size={18} />
                Cari vendor {categoryLabel(editing.related_category)}
              </Link>
            )}
            {editing.is_custom && (
              <div className="border-t border-dc-line pt-5">
                {confirmDelete ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="w-full text-sm text-dc-text-2">
                      Hapus tugas ini dari checklist?
                    </p>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        void handleDeleteTask(editing.id);
                        setEditing(null);
                      }}
                    >
                      Ya, hapus
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmDelete(false)}
                    >
                      Batal
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="quiet"
                    size="sm"
                    onClick={() => setConfirmDelete(true)}
                    className="text-dc-danger!"
                  >
                    <Icon name="trash" size={16} />
                    Hapus tugas
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </Sheet>
    </PlannerFrame>
  );
}

function TaskRow({
  task,
  late,
  spent,
  onCycle,
  onEdit,
}: {
  task: PlannerTask;
  late: boolean;
  spent?: number;
  onCycle: () => void;
  onEdit: () => void;
}) {
  const reduced = useReducedMotion();
  const done = task.status === "done";
  const progress = task.status === "in_progress";
  return (
    <li
      className={`flex items-start gap-3 px-3 py-3 sm:px-4 ${late ? "bg-dc-danger/[0.04]" : ""}`}
    >
      <button
        type="button"
        onClick={onCycle}
        aria-label={`Status ${task.title}: ${STATUS_LABEL[task.status]}. Ubah ke ${STATUS_LABEL[NEXT_STATUS[task.status]]}`}
        className="group inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
      >
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-full border-[1.5px] transition-colors duration-200 ${
            done
              ? "border-dc-gold bg-dc-gold text-dc-ink"
              : progress
                ? "border-dc-gold bg-dc-white"
                : "border-dc-line-strong bg-dc-white group-hover:border-dc-gold"
          }`}
        >
          {/* The check springs in: the tap is acknowledged at the exact spot the eye is on. */}
          {done ? (
            <motion.span
              key="done"
              initial={reduced ? false : { scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={SPRING_SNAPPY}
              className="flex"
            >
              <Icon name="check" size={16} />
            </motion.span>
          ) : progress ? (
            <span className="h-3 w-3 rounded-full bg-dc-gold" />
          ) : null}
        </span>
      </button>
      <div className="min-w-0 flex-1 py-2">
        <p
          className={`break-words leading-snug ${done ? "text-dc-text-3" : "font-medium text-dc-ink"}`}
        >
          {task.title}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          {progress && (
            <span className="font-semibold text-dc-clay">Sedang diproses</span>
          )}
          {task.due_date && (
            <span
              className={`inline-flex items-center gap-1.5 ${late ? "font-semibold text-dc-danger" : "text-dc-text-3"}`}
            >
              <Icon name="calendar" size={15} />
              {late ? "Terlewat, target " : "Target "}
              {formatTanggal(task.due_date)}
            </span>
          )}
          {task.related_category && !done && (
            <Link
              href={`/vendors?category=${task.related_category}`}
              className="inline-flex min-h-8 items-center gap-1.5 font-semibold text-dc-clay underline-offset-4 hover:underline"
            >
              Cari vendor {categoryLabel(task.related_category)}
            </Link>
          )}
          {!!spent && (
            <Link
              href="/client/bookings"
              className="tabular-nums text-dc-text-2 underline-offset-4 hover:underline"
            >
              Sudah booking {formatRupiah(spent)}
            </Link>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onEdit}
        aria-label={`Ubah tugas: ${task.title}`}
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-dc-text-3 transition-colors hover:bg-dc-cream hover:text-dc-ink"
      >
        <Icon name="pencil" size={18} />
      </button>
    </li>
  );
}
