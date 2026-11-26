"use client";

import { apiGet } from "@/lib/api";
import { createLiveStore } from "@/lib/liveStore";

export type AdminQueues = { disputes: number; disbursements: number; vendors: number; nameChanges: number };

type Wire = { disputes: number; disbursements: number; vendors: number; name_changes: number };

// One request (GET /admin/queues) every 5 seconds while the tab is visible,
// shared by every component that shows a queue number, and refreshed at once
// after any change the admin makes.
const store = createLiveStore<AdminQueues>(
  () => apiGet<Wire>("/api/v1/admin/queues").then((d) => ({ disputes: d.disputes, disbursements: d.disbursements, vendors: d.vendors, nameChanges: d.name_changes })),
  5_000,
);

/** Open work per admin queue, live. `enabled` is false for non-admin roles. */
export function useAdminQueues(enabled: boolean) {
  const { data, loading, failed, reload } = store.useLive(enabled);
  return { queues: data, loading, failed, reload };
}
