"use client";

import { useCallback, useEffect, useState } from "react";

import { apiGet } from "@/lib/api";

export type AdminQueues = { disputes: number; disbursements: number; vendors: number; nameChanges: number };

// Admin pages each mount their own Shell, so a short module-level cache keeps
// "4 list requests on every navigation" down to one per 30 seconds.
const TTL_MS = 30_000;
let cache: { at: number; data: AdminQueues } | null = null;

async function fetchQueues(): Promise<AdminQueues> {
  const len = (path: string) => apiGet<unknown[]>(path).then((d) => (d ?? []).length);
  const [disputes, disbursements, vendors, nameChanges] = await Promise.all([
    len("/api/v1/admin/disputes/open"),
    len("/api/v1/admin/disbursements/pending"),
    len("/api/v1/admin/vendors/pending"),
    len("/api/v1/admin/vendor-name-changes/pending"),
  ]);
  return { disputes, disbursements, vendors, nameChanges };
}

/** Open work per admin queue, derived from the existing list endpoints (no
 * dedicated count endpoint). `enabled` is false for non-admin roles. */
export function useAdminQueues(enabled: boolean) {
  const [queues, setQueues] = useState<AdminQueues | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(enabled);

  const load = useCallback(
    (force: boolean) => {
      if (!enabled) return;
      if (!force && cache && Date.now() - cache.at < TTL_MS) {
        setQueues(cache.data);
        setLoading(false);
        return;
      }
      setLoading(true);
      setFailed(false);
      fetchQueues()
        .then((data) => {
          cache = { at: Date.now(), data };
          setQueues(data);
        })
        .catch(() => setFailed(true))
        .finally(() => setLoading(false));
    },
    [enabled],
  );

  useEffect(() => {
    queueMicrotask(() => load(false));
  }, [load]);

  return { queues, loading, failed, reload: () => load(true) };
}
