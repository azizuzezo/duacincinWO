"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { apiGet, type CurrentUser } from "@/lib/api";

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

  useEffect(() => {
    apiGet<CurrentUser>("/api/v1/auth/me")
      .then((u) => {
        if (!allowedRoles.includes(u.role)) {
          router.replace(loginPath);
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
      .catch(() => {
        lastUser = null;
        setUser(null);
        router.replace(loginPath);
      })
      .finally(() => setChecking(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (checking) {
    return (
      <div role="status" aria-label="Memuat" className="flex min-h-screen items-center justify-center bg-dc-ivory">
        <div className="h-6 w-6 motion-safe:animate-spin rounded-full border-2 border-dc-ink/15 border-t-dc-clay" />
      </div>
    );
  }
  if (!user) return null;

  return <>{children(user)}</>;
}
