"use client";

// Public data for the home page, fetched once in the browser (same endpoints
// and same apiGet as /vendors and /inspirasi) and shared by every section that
// needs it, so the category mosaic, the vendor rail and the inspiration teaser
// do not each hit the API. Nothing here is invented: when a request fails or
// returns nothing, the sections that depend on it hide themselves.
import { useEffect, useState } from "react";

import { apiGet, type DirectoryCard, type InspirationItem } from "@/lib/api";

export type Remote<T> = { status: "loading" } | { status: "ready"; data: T } | { status: "error" };

const cache = new Map<string, Promise<unknown>>();

function load<T>(path: string): Promise<T> {
  let p = cache.get(path) as Promise<T> | undefined;
  if (!p) {
    p = apiGet<T>(path);
    cache.set(path, p);
    // A failed request should be retried on the next mount, not cached.
    p.catch(() => cache.delete(path));
  }
  return p;
}

function useRemote<T>(path: string): Remote<T> {
  const [state, setState] = useState<Remote<T>>({ status: "loading" });
  useEffect(() => {
    let alive = true;
    load<T>(path)
      .then((data) => alive && setState({ status: "ready", data }))
      .catch(() => alive && setState({ status: "error" }));
    return () => {
      alive = false;
    };
  }, [path]);
  return state;
}

/** Every approved vendor in the public directory. */
export function useDirectory(): Remote<DirectoryCard[]> {
  return useRemote<DirectoryCard[]>("/api/v1/vendors");
}

/** The curated inspiration gallery. */
export function useInspiration(): Remote<InspirationItem[]> {
  return useRemote<InspirationItem[]>("/api/v1/inspiration");
}
