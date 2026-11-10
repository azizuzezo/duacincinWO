"use client";

import { InvitationPanel } from "@/components/invitation/InvitationPanel";
import { CLIENT_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { WithUser } from "@/components/WithUser";

/** /client/undangan: the couple's digital invitation on DuaCincin Undangan,
 * prefilled from this WO project (see server/internal/invitationlink).
 * The panel carries the visible headline (it changes with the link state),
 * so the page title is for screen readers and the document outline. */
export default function UndanganPage() {
  return (
    <WithUser allowedRoles={["client"]} loginPath="/login">
      {(user) => (
        <Shell user={user} navItems={CLIENT_NAV} loginPath="/login" eyebrow="Client">
          <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
            <h1 className="sr-only">Undangan digital</h1>
            <InvitationPanel />
          </div>
        </Shell>
      )}
    </WithUser>
  );
}
