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

  if (checking) return <p className="p-8 text-center text-dc-black/60">Memuat…</p>;
  if (!user) return null;

  return <>{children(user)}</>;
}
