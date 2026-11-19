import type { CurrentUser } from "@/lib/api";

// One dashboard per role. The backend tells us which one via `role` on the
// login response, so there's nothing to ask the user upfront. Shared by the
// email login and "Masuk dengan Google" so both land in the same place.
export const DASHBOARD_BY_ROLE: Record<CurrentUser["role"], string> = {
  client: "/client/dashboard",
  vendor: "/vendor/dashboard",
  admin: "/internal/admin/dashboard",
  wedding_consultant: "/internal/consultations",
};

/** A "come back here after logging in" target from ?next=. Only paths on
 * this site ("/client/consultation"), never another origin ("//evil.com",
 * "https://..."), so it can not be used to send people elsewhere. */
export function safeNext(raw: string | null | undefined): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return null;
  return raw.length > 300 ? null : raw;
}

/** Read ?next= from the current address (browser only). */
export function nextFromLocation(): string | null {
  if (typeof window === "undefined") return null;
  return safeNext(new URLSearchParams(window.location.search).get("next"));
}

/** Where to land after logging in: the page that asked for it, when it fits
 * the role (a client area for a client), else the role's dashboard. */
export function afterLogin(role: CurrentUser["role"], next: string | null = nextFromLocation()): string {
  if (next) {
    const clientOnly = next.startsWith("/client");
    const vendorOnly = next.startsWith("/vendor/");
    const internalOnly = next.startsWith("/internal");
    if ((!clientOnly || role === "client") && (!vendorOnly || role === "vendor") && !internalOnly) return next;
  }
  return DASHBOARD_BY_ROLE[role];
}

/** loginPath plus ?next=<this page>, so login brings the visitor back. */
export function loginWithNext(loginPath: string): string {
  if (typeof window === "undefined") return loginPath;
  const here = window.location.pathname + window.location.search;
  const sep = loginPath.includes("?") ? "&" : "?";
  return `${loginPath}${sep}next=${encodeURIComponent(here)}`;
}
