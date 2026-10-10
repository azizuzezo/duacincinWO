"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { apiGet, type CurrentUser } from "@/lib/api";

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
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    apiGet<CurrentUser>("/api/v1/auth/me")
      .then((u) => {
        if (!allowedRoles.includes(u.role)) {
          router.replace(loginPath);
          return;
        }
        setUser(u);
      })
      .catch(() => router.replace(loginPath))
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
