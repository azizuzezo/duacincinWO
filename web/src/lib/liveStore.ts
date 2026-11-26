"use client";

// Live numbers for the menu badges (open admin work, unread notifications,
// booking requests). Serverless hosting has no push channel, so "live" means:
//  - one shared poll every few seconds while the tab is visible (one request
//    per badge no matter how many components show it),
//  - an immediate refresh when the tab comes back or the network returns,
//  - an immediate refresh after the person changes anything (api.ts fires
//    "dc:mutated" after every successful write), so a badge drops the moment
//    the last item is handled.
import { useCallback, useEffect, useSyncExternalStore } from "react";

type State<T> = { data: T | null; loading: boolean; failed: boolean };

export function createLiveStore<T>(fetcher: () => Promise<T>, intervalMs: number) {
  let state: State<T> = { data: null, loading: false, failed: false };
  const subs = new Set<() => void>();
  let timer: number | undefined;
  let inflight = false;
  let again = false;

  const emit = () => subs.forEach((s) => s());
  const set = (next: State<T>) => {
    state = next;
    emit();
  };

  async function refresh() {
    if (inflight) {
      again = true;
      return;
    }
    inflight = true;
    if (state.data === null) set({ ...state, loading: true });
    try {
      const data = await fetcher();
      set({ data, loading: false, failed: false });
    } catch {
      set({ ...state, loading: false, failed: true });
    } finally {
      inflight = false;
      if (again) {
        again = false;
        void refresh();
      }
    }
  }

  const onVisible = () => document.visibilityState === "visible" && void refresh();
  const onMutated = () => void refresh();

  function start() {
    void refresh();
    timer = window.setInterval(() => document.visibilityState === "visible" && void refresh(), intervalMs);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onMutated);
    window.addEventListener("dc:mutated", onMutated);
  }
  function stop() {
    window.clearInterval(timer);
    document.removeEventListener("visibilitychange", onVisible);
    window.removeEventListener("online", onMutated);
    window.removeEventListener("dc:mutated", onMutated);
  }

  const subscribe = (cb: () => void) => {
    subs.add(cb);
    if (subs.size === 1) start();
    return () => {
      subs.delete(cb);
      if (subs.size === 0) {
        stop();
        state = { data: null, loading: false, failed: false };
      }
    };
  };

  const loadingServer: State<T> = { data: null, loading: true, failed: false };
  const offServer: State<T> = { data: null, loading: false, failed: false };

  /** Subscribe a component. `enabled` false keeps it off (other roles). */
  function useLive(enabled = true) {
    const snap = useSyncExternalStore(
      enabled ? subscribe : () => () => {},
      () => (enabled ? state : offServer),
      () => (enabled ? loadingServer : offServer),
    );
    const reload = useCallback(() => void refresh(), []);
    useEffect(() => {
      // A second component mounting while data exists needs no extra fetch; the shared timer covers it.
    }, []);
    return { ...snap, reload };
  }

  return { useLive, refresh };
}
