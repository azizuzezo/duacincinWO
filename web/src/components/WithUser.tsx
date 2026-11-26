"use client";

import { useRouter } from "next/navigation";

import { loginWithNext } from "@/components/auth/redirect";
import { WhatsAppGate } from "@/components/wa/WhatsAppVerify";
import { useEffect, useState } from "react";

import { apiGet, ApiError, type CurrentUser } from "@/lib/api";

// The signed-in user from the last check, kept for this browser tab only
// (module memory: never on the server, never in storage). Moving between
// dashboard pages then renders the page and its shell at once instead of
// blanking the whole screen to a spinner while /auth/me answers again; the
// check still runs on every page and redirects if the session has ended.
let lastUser: CurrentUser | null = null;

/** Call when the session ends (logout) so the next page waits for a fresh check. */
export function forgetCurrentUser() {
  lastUser = null;
}

/** Patch the signed-in user (e.g. after a new profile picture) so every page and the header show it at once. */
export function updateCurrentUser(patch: Partial<CurrentUser>) {
  if (!lastUser) return;
  lastUser = { ...lastUser, ...patch };
  window.dispatchEvent(new Event("dc:user"));
}

export function WithUser({
  allowedRoles,
  loginPath,
  children,
}: {
  allowedRoles: CurrentUser["role"][];
  loginPath: string;
  children: (user: CurrentUser) => React.ReactNode;
}) {
  const router = useRouter();
  // Only trusted for a role this page allows; otherwise wait for the server.
  const cached = lastUser && allowedRoles.includes(lastUser.role) ? lastUser : null;
  const [user, setUser] = useState<CurrentUser | null>(cached);
  const [checking, setChecking] = useState(!cached);
  // The check failed for a reason other than "not signed in" (API slow, down
  // or rate limited). The session cookie is still valid, so keep it and offer
  // a retry instead of sending the person back to the login page.
  const [unreachable, setUnreachable] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    apiGet<CurrentUser>("/api/v1/auth/me")
      .then((u) => {
        if (!allowedRoles.includes(u.role)) {
          router.replace(loginWithNext(loginPath));
          return;
        }
        // Keep the same object when nothing changed, so pages keyed on `user`
        // do not load their data twice.
        const same = lastUser && JSON.stringify(lastUser) === JSON.stringify(u);
        if (!same) {
          lastUser = u;
          setUser(u);
        }
      })
      .catch((err) => {
        // Only a 401 means the session is gone. Anything else keeps it.
        if (err instanceof ApiError && err.status === 401) {
          lastUser = null;
          setUser(null);
          router.replace(loginWithNext(loginPath));
        } else if (!lastUser) {
          setUnreachable(true);
        }
      })
      .finally(() => setChecking(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  // A page patched the user (updateCurrentUser): take the new copy.
  useEffect(() => {
    const on = () => lastUser && setUser(lastUser);
    window.addEventListener("dc:user", on);
    return () => window.removeEventListener("dc:user", on);
  }, []);

  if (checking) {
    return (
      <div role="status" aria-label="Memuat" className="flex min-h-screen items-center justify-center bg-dc-ivory">
        <div className="h-6 w-6 motion-safe:animate-spin rounded-full border-2 border-dc-ink/15 border-t-dc-clay" />
      </div>
    );
  }
  if (!user && unreachable) {
    return (
      <div role="alert" className="flex min-h-screen flex-col items-center justify-center gap-3 bg-dc-ivory px-6 text-center">
        <p className="text-lg font-semibold text-dc-ink">Belum bisa terhubung ke server</p>
        <p className="max-w-sm text-sm text-dc-text-2">Sesimu masih tersimpan. Coba muat ulang sebentar lagi.</p>
        <button
          type="button"
          onClick={() => {
            setUnreachable(false);
            setChecking(true);
            setAttempt((n) => n + 1);
          }}
          className="inline-flex min-h-11 items-center rounded-full bg-dc-ink px-6 text-sm font-semibold text-dc-on-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold"
        >
          Coba lagi
        </button>
      </div>
    );
  }
  if (!user) return null;

  return (
    <>
      {children(user)}
      <WhatsAppGate user={user} />
    </>
  );
}
