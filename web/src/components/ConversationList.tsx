"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { apiGet, ApiError, type Conversation } from "@/lib/api";

function conversationLabel(c: Conversation, currentUserId: string): string {
  if (c.type === "consultation") {
    return c.client_name ? `Konsultasi — ${c.client_name}` : "Konsultasi dengan Wedding Consultant";
  }
  // vendor_chat: show whichever side ISN'T the viewer.
  if (c.client_id === currentUserId) return c.vendor_business_name ?? "Chat dengan Vendor";
  return c.client_name ?? "Chat dengan Client";
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

  useEffect(() => {
    apiGet<Conversation[]>("/api/v1/conversations")
      .then((c) => setConversations(c ?? []))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Gagal memuat daftar percakapan."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="p-6 text-center text-dc-black/60">Memuat…</p>;
  if (error) return <p className="p-6 text-center text-sm text-red-600">{error}</p>;
  if (conversations.length === 0) return <EmptyState title="Belum ada percakapan" body={emptyLabel} />;

  return (
    <Card className="divide-y divide-dc-black/5">
      {conversations.map((c) => (
        <Link key={c.id} href={`${basePath}/${c.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-dc-offwhite">
          <span className="font-medium text-dc-navy">{conversationLabel(c, currentUserId)}</span>
          <span className="text-xs text-dc-black/40">#{c.id.slice(0, 8)}</span>
        </Link>
      ))}
    </Card>
  );
}
