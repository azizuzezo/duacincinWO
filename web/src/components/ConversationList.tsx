"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ErrorState, FOCUS, SkeletonList } from "@/app/client/_ui";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { apiGet, ApiError, type Conversation } from "@/lib/api";

function conversationLabel(c: Conversation, currentUserId: string): string {
  if (c.type === "consultation") {
    return c.client_name ? `Konsultasi: ${c.client_name}` : "Konsultasi dengan Wedding Consultant";
  }
  // vendor_chat: show whichever side ISN'T the viewer.
  if (c.client_id === currentUserId) return c.vendor_business_name ?? "Chat dengan Vendor";
  return c.client_name ?? "Chat dengan Client";
}

/** Initials from the display name, skipping the "Konsultasi:" prefix. */
function initialsOf(label: string): string {
  const name = label.replace(/^Konsultasi:\s*/, "").trim();
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase() || "?";
}

export function ConversationList({
  basePath,
  emptyLabel,
  currentUserId,
}: {
  basePath: string;
  emptyLabel: string;
  currentUserId: string;
}) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    setError(null);
    apiGet<Conversation[]>("/api/v1/conversations")
      .then((c) => setConversations(c ?? []))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Gagal memuat daftar percakapan."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    queueMicrotask(load);
  }, []);

  if (loading) return <SkeletonList rows={4} height="h-14" />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (conversations.length === 0) return <EmptyState title="Belum ada percakapan" body={emptyLabel} />;

  return (
    <Card className="divide-y divide-dc-ink/10 overflow-hidden">
      {conversations.map((c) => (
        <Link key={c.id} href={`${basePath}/${c.id}`} className={`flex min-h-14 items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-dc-cream focus-visible:-outline-offset-2 ${FOCUS}`}>
          <span className="flex min-w-0 items-center gap-3">
            <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-dc-ink text-xs font-semibold text-dc-white">
              {initialsOf(conversationLabel(c, currentUserId))}
            </span>
            <span className="min-w-0 truncate font-medium text-dc-ink">{conversationLabel(c, currentUserId)}</span>
          </span>
          <span className="shrink-0 text-xs tabular-nums text-dc-black/60">#{c.id.slice(0, 8)}</span>
        </Link>
      ))}
    </Card>
  );
}
