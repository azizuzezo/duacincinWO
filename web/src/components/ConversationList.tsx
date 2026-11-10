"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { initialsOf } from "@/components/booking/format";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { MotionItem, MotionList } from "@/components/ui/Motion";
import { Rings } from "@/components/ui/Rings";
import { SkeletonGroup } from "@/components/ui/Skeleton";
import { apiGet, ApiError, type Conversation } from "@/lib/api";

/** Display name and role line for a conversation, from the viewer's side. */
export function describeConversation(c: Conversation, currentUserId: string): { name: string; role: string; consult: boolean } {
  if (c.type === "consultation") {
    // The couple sees the DuaCincin team; staff see which couple it is.
    if (c.client_id === currentUserId) return { name: "Wedding Consultant", role: "Tim DuaCincin", consult: true };
    return { name: c.client_name ?? "Calon pengantin", role: "Konsultasi", consult: true };
  }
  if (c.client_id === currentUserId) return { name: c.vendor_business_name ?? "Vendor", role: "Vendor", consult: false };
  return { name: c.client_name ?? "Calon pengantin", role: "Calon pengantin", consult: false };
}

export function ConversationAvatar({ name, consult, size = "md" }: { name: string; consult: boolean; size?: "sm" | "md" }) {
  const box = size === "sm" ? "h-10 w-10" : "h-12 w-12";
  if (consult) {
    // The DuaCincin team is marked by the ring motif, not a made-up face.
    return (
      <span aria-hidden className={`flex ${box} shrink-0 items-center justify-center rounded-full bg-dc-ink text-dc-gold-antique`}>
        <Rings className="h-5 w-8" stroke="currentColor" strokeWidth={2} />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className={`flex ${box} shrink-0 items-center justify-center rounded-full border border-dc-gold/50 bg-dc-cream font-heading text-lg font-semibold text-dc-clay`}
    >
      {initialsOf(name)}
    </span>
  );
}

/** Inbox list (client, vendor and consultant inboxes share it). Rows are
 * 64px+ with an initial avatar, the other side's name and their role.
 * Optional `activeId` highlights the open thread in a two-pane layout and
 * `onLoaded` hands the loaded list to the page (e.g. for a thread header).
 * `bare` drops the card surface inside a page-provided pane. */
export function ConversationList({
  basePath,
  emptyLabel,
  currentUserId,
  activeId,
  onLoaded,
  bare = false,
}: {
  basePath: string;
  emptyLabel: string;
  currentUserId: string;
  activeId?: string;
  onLoaded?: (conversations: Conversation[]) => void;
  /** Drop the card surface when the page already provides one (two-pane inbox). */
  bare?: boolean;
}) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    setError(null);
    apiGet<Conversation[]>("/api/v1/conversations")
      .then((c) => {
        setConversations(c ?? []);
        onLoaded?.(c ?? []);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Gagal memuat daftar percakapan."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    queueMicrotask(load);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading)
    return (
      <SkeletonGroup label="Memuat percakapan" className="flex flex-col gap-1">
        {Array.from({ length: 4 }, (_, i) => (
          <span key={i} className="flex items-center gap-3 px-4 py-3">
            <span className="dc-skeleton block h-12 w-12 shrink-0 rounded-full" />
            <span className="flex flex-1 flex-col gap-2">
              <span className="dc-skeleton block h-3.5 w-2/3 rounded-full" />
              <span className="dc-skeleton block h-3 w-1/3 rounded-full" />
            </span>
          </span>
        ))}
      </SkeletonGroup>
    );
  if (error) return <ErrorState compact title="Percakapan belum bisa dimuat" body={error} onRetry={load} />;
  if (conversations.length === 0) return <EmptyState title="Belum ada percakapan" body={emptyLabel} />;

  return (
    <MotionList
      className={`flex flex-col gap-1 ${bare ? "" : "rounded-xl border border-dc-line bg-dc-white p-2 shadow-soft"}`}
      aria-label="Daftar percakapan"
    >
      {conversations.map((c) => {
        const d = describeConversation(c, currentUserId);
        const active = c.id === activeId;
        return (
          <MotionItem key={c.id}>
            <Link
              href={`${basePath}/${c.id}`}
              aria-current={active ? "page" : undefined}
              className={`group flex min-h-16 items-center gap-3 rounded-lg px-3 py-3 transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-dc-gold ${
                active ? "bg-dc-cream" : "hover:bg-dc-cream/70 active:bg-dc-cream"
              }`}
            >
              <ConversationAvatar name={d.name} consult={d.consult} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-dc-ink">{d.name}</span>
                <span className="block truncate text-sm text-dc-text-3">{d.role}</span>
              </span>
              <svg
                aria-hidden
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0 text-dc-text-3 transition-transform duration-300 motion-safe:group-hover:translate-x-0.5"
              >
                <path d="M9 6l6 6-6 6" />
              </svg>
            </Link>
          </MotionItem>
        );
      })}
    </MotionList>
  );
}
