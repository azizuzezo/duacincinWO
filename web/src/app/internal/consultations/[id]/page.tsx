"use client";

import Link from "next/link";
import { use } from "react";

import { ChatThread } from "@/components/ChatThread";
import { ADMIN_NAV, CONSULTANT_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { WithUser } from "@/components/WithUser";
import type { CurrentUser } from "@/lib/api";

export default function ConsultationThreadPage({ params }: PageProps<"/internal/consultations/[id]">) {
  const { id } = use(params);

  return (
    <WithUser allowedRoles={["wedding_consultant", "admin"]} loginPath="/login">
      {(user) => <ConsultationThreadContent id={id} user={user} />}
    </WithUser>
  );
}

function ConsultationThreadContent({ id, user }: { id: string; user: CurrentUser }) {
  const isAdmin = user.role === "admin";
  return (
    <Shell user={user} navItems={isAdmin ? ADMIN_NAV : CONSULTANT_NAV} loginPath="/login" eyebrow={isAdmin ? "Admin" : "Consultant"}>
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <Link href="/internal/consultations" className="mb-4 inline-flex min-h-11 items-center text-sm font-semibold text-dc-clay underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dc-clay/50">
          ← Inbox Konsultasi
        </Link>
        <ChatThread conversationId={id} currentUserId={user.id} />
      </div>
    </Shell>
  );
}
