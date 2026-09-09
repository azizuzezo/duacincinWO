"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { apiGet, ApiError, type Conversation } from "@/lib/api";

export function ConversationList({ basePath, emptyLabel }: { basePath: string; emptyLabel: string }) {
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
  if (conversations.length === 0) return <p className="p-6 text-center text-dc-black/60">{emptyLabel}</p>;

  return (
    <ul className="divide-y divide-dc-black/10 rounded-2xl border border-dc-black/10 bg-dc-white">
      {conversations.map((c) => (
        <li key={c.id}>
          <Link href={`${basePath}/${c.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-dc-offwhite">
            <span className="font-medium text-dc-navy">
              {c.type === "consultation" ? "Konsultasi dengan Wedding Consultant" : "Chat dengan Vendor"}
            </span>
            <span className="text-xs text-dc-black/40">#{c.id.slice(0, 8)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
