"use client";

import { apiGet, type Booking } from "@/lib/api";
import { createLiveStore } from "@/lib/liveStore";

// Booking requests waiting for the vendor's answer, live (shared poll every 8s,
// instant refresh after any change the vendor makes).
const store = createLiveStore<number>(() => apiGet<Booking[]>("/api/v1/bookings").then((d) => (d ?? []).filter((b) => b.status === "requested").length), 8_000);

export function useVendorRequests(enabled: boolean) {
  const { data } = store.useLive(enabled);
  return data ?? 0;
}
