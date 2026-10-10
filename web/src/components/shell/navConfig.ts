import type { NavItem } from "./Shell";

const ICON = {
  home: ["M3 11.5 12 4l9 7.5", "M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9"],
  search: ["M6 9l3 3-3 3", "M11 15h4", "M2 4h13a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2Z"],
  pie: ["M12 3v9l6 3", "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"],
  checklist: ["M5 4h11v16H5Z", "M8 9h5M8 12.5h5M8 16h3M9 4V2h3v2"],
  calendar: ["M4 6h13a1 1 0 0 1 1 1v9a2 2 0 0 1-2 2H4Z", "M13 3v4M8 9h9M8 12.5h9M8 16h5"],
  chat: ["M18 12.5a6.5 6.5 0 0 1-9.5 5.8L3 19l0.9-4.2A6.5 6.5 0 1 1 18 12.5Z"],
  badge: ["M12 3l8 4v5c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V7l8-4Z", "M9 12l2 2 4-4"],
  users: [
    "M2 19v-1a4 4 0 0 1 4-4h3a4 4 0 0 1 4 4v1M7.5 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM15 5a3 3 0 0 1 0 5.8M18 19v-1a4 4 0 0 0-2.6-3.75",
  ],
  warning: ["M11 2 1 19h20L11 2ZM11 9v4M11 15.5h.01"],
  cash: ["M11 1v20M16 4.5H8.2a3 3 0 0 0 0 6h5.6a3 3 0 0 1 0 6H5"],
  image: ["M1 15l4-5.5 3 3.5 2-2.5L16 15M0 3h18v14H0Z"],
} as const;

export const CLIENT_NAV: NavItem[] = [
  { tab: true, href: "/client/dashboard", label: "Dashboard", icon: ICON.home },
  { tab: true, href: "/vendors", label: "Cari Vendor", short: "Vendor", icon: ICON.search },
  { href: "/client/budget", label: "Budget Planner", short: "Budget", icon: ICON.pie },
  { href: "/client/wedding-planner", label: "Wedding Planner", short: "Planner", icon: ICON.checklist },
  { tab: true, href: "/client/bookings", label: "Booking", icon: ICON.calendar },
  { href: "/client/consultation", label: "Konsultasi", icon: ICON.users },
  { tab: true, href: "/client/messages", label: "Pesan", icon: ICON.chat },
  { href: "/client/account", label: "Akun", icon: ICON.badge },
];

export const VENDOR_NAV: NavItem[] = [
  { tab: true, href: "/vendor/dashboard", label: "Hari ini", icon: ICON.home },
  { tab: true, href: "/vendor/bookings", label: "Booking", icon: ICON.calendar },
  { tab: true, href: "/vendor/messages", label: "Pesan", icon: ICON.chat },
  {
    tab: true,
    href: "/vendor/profile",
    match: ["/vendor/portfolio", "/vendor/paket"],
    label: "Etalase",
    icon: ICON.image,
  },
  { href: "/vendor/payouts", label: "Pencairan", icon: ICON.cash },
];

export const ADMIN_NAV: NavItem[] = [
  { tab: true, href: "/internal/admin/dashboard", label: "Antrian kerja", short: "Antrian", icon: ICON.home },
  { tab: true, href: "/internal/admin/vendors", group: "Verifikasi", label: "Vendor Pending", short: "Pending", icon: ICON.badge },
  { href: "/internal/admin/vendor-name-changes", group: "Verifikasi", label: "Ganti Nama Vendor", icon: ICON.badge },
  { href: "/internal/admin/vendors/approved", group: "Verifikasi", label: "Vendor Aktif", icon: ICON.users },
  { tab: true, href: "/internal/admin/disputes", group: "Uang dan sengketa", label: "Sengketa", icon: ICON.warning },
  { tab: true, href: "/internal/admin/disbursements", group: "Uang dan sengketa", label: "Pencairan", icon: ICON.cash },
  { href: "/internal/consultations", group: "Layanan", label: "Konsultasi", icon: ICON.chat },
  { href: "/internal/admin/inspirasi", group: "Layanan", label: "Inspirasi", icon: ICON.image },
  { href: "/internal/admin/audit-log", group: "Sistem", label: "Audit Log", icon: ICON.checklist },
];

export const CONSULTANT_NAV: NavItem[] = [{ href: "/internal/consultations", label: "Inbox Konsultasi", icon: ICON.chat }];
