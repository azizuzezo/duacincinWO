"use client";

// The signed-in client's frame: the same marketplace header as the public
// site (search, sections, footer) with the account menu in the corner, so the
// client area feels like the marketplace, not a separate admin panel. Same
// props as the old Shell, so every client page only swaps the component.
import { HomeFooter } from "@/components/home/HomeFooter";
import { ChatDock } from "@/components/messages/ChatDock";
import { HomeNav } from "@/components/home/HomeNav";
import type { CurrentUser } from "@/lib/api";

export function ClientShell({ user, children }: { user: CurrentUser; children: React.ReactNode }) {
  return (
    <div className="wd dc-app flex min-h-svh flex-col">
      <HomeNav user={user} />
      <main id="konten" tabIndex={-1} className="min-w-0 flex-1 bg-white focus:outline-none">
        <div className="dc-page-enter">{children}</div>
      </main>
      <HomeFooter />
      <ChatDock user={user} />
    </div>
  );
}
