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
