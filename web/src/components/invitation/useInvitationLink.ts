"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { apiGet, apiPost, ApiError } from "@/lib/api";

/** Link between this WO project and DuaCincin Invitation (server/internal/invitationlink). */
export type InvitationStatus = {
  linked: boolean;
  slug?: string;
  /** Public invitation link, only once the couple has published it. */
  url?: string;
  package_type?: string;
  guests: number;
  rsvp: { hadir: number; tidak: number; ragu: number };
  editor_url: string;
};

export type InvitationLinkState =
  | { kind: "loading" }
  | { kind: "unavailable" } // feature not switched on yet on this server
  | { kind: "error"; message: string }
  | { kind: "ready"; status: InvitationStatus };

const PACKAGE_LABEL: Record<string, string> = {
  bronze: "Paket Bronze",
  silver: "Paket Silver",
  gold: "Paket Gold",
  platinum: "Paket Platinum",
};

/** Plain-language package name ("demo" means no package chosen yet). */
export function packageLabel(type?: string): string {
  return (type && PACKAGE_LABEL[type]) || "Belum pilih paket";
}

const STATUS_ERROR = "Status undangan belum bisa dimuat. Coba lagi sebentar lagi.";

/** Fetches the status and returns the next state. `background`: return null
 * on a failure so whatever is shown stays (tab focus, after a sync). */
async function fetchStatus(background: boolean): Promise<InvitationLinkState | null> {
  try {
    const status = await apiGet<InvitationStatus>("/api/v1/invitation-link/status");
    return { kind: "ready", status };
  } catch (err) {
    if (err instanceof ApiError && err.status === 503) return { kind: "unavailable" };
    return background ? null : { kind: "error", message: STATUS_ERROR };
  }
}

/**
 * Loads the invitation status and exposes the two actions:
 * - open(): asks the API for a one-time signed link and opens it in a new tab
 *   (the tab is opened on click, before the request, so popup blockers allow it);
 * - syncGuests(): re-sends the guest list server to server (idempotent).
 * The status refreshes when the couple comes back to this tab.
 */
export function useInvitationLink() {
  const [state, setState] = useState<InvitationLinkState>({ kind: "loading" });
  const [opening, setOpening] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const mounted = useRef(true);

  // spinner: show the loading state first (retry button). background: keep what is
  // shown when a refresh fails (tab focus, after a sync).
  const load = useCallback(async ({ spinner = false, background = false } = {}) => {
    if (spinner) setState({ kind: "loading" });
    const next = await fetchStatus(background);
    if (mounted.current && next) setState(next);
  }, []);

  useEffect(() => {
    mounted.current = true;
    // State starts as "loading": fetch first, set state only in the callback.
    fetchStatus(false).then((next) => {
      if (mounted.current && next) setState(next);
    });
    const onVisible = () => {
      if (document.visibilityState === "visible") void load({ background: true });
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      mounted.current = false;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  /** Returns an error message, or null when the invitation tab was opened. */
  const open = useCallback(async (names?: { bride?: string; groom?: string }): Promise<string | null> => {
    const tab = window.open("", "_blank");
    setOpening(true);
    try {
      const { url } = await apiPost<{ url: string; expires_at: string; guests: number }>("/api/v1/invitation-link/handoff", {
        bride: names?.bride?.trim() ?? "",
        groom: names?.groom?.trim() ?? "",
      });
      if (tab) {
        tab.opener = null;
        tab.location.href = url;
      } else {
        window.location.href = url;
      }
      return null;
    } catch (err) {
      tab?.close();
      if (err instanceof ApiError && err.status === 503) return "Fitur undangan digital belum aktif. Coba lagi nanti.";
      if (err instanceof ApiError && err.status === 429) return "Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.";
      return "Undangan belum bisa dibuka. Periksa koneksi internetmu, lalu coba lagi.";
    } finally {
      if (mounted.current) setOpening(false);
    }
  }, []);

  /** Returns { added } on success or { error }. */
  const syncGuests = useCallback(async (): Promise<{ added: number } | { error: string }> => {
    setSyncing(true);
    try {
      const res = await apiPost<{ guests_added: number; guests: number }>("/api/v1/invitation-link/sync", {});
      void load({ background: true });
      return { added: res.guests_added };
    } catch (err) {
      if (err instanceof ApiError && (err.status === 409 || err.status === 429)) return { error: err.message };
      return { error: "Daftar tamu belum bisa dikirim. Coba lagi sebentar lagi." };
    } finally {
      if (mounted.current) setSyncing(false);
    }
  }, [load]);

  return { state, reload: () => load({ spinner: true }), open, opening, syncGuests, syncing };
}
