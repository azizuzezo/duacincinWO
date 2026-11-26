"use client";

import { ArticleComposer } from "@/components/admin/composer/ArticleComposer";
import { AdminShell } from "@/components/shell/AdminShell";
import { ADMIN_NAV } from "@/components/shell/navConfig";
import { WithUser } from "@/components/WithUser";

export default function AdminArtikelBaruPage() {
  return (
    <WithUser allowedRoles={["admin"]} loginPath="/login">
      {(user) => (
        <AdminShell tone="wd" user={user} navItems={ADMIN_NAV} loginPath="/login" eyebrow="Admin">
          <ArticleComposer />
        </AdminShell>
      )}
    </WithUser>
  );
}
