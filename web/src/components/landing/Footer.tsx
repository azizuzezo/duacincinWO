import Image from "next/image";
import Link from "next/link";

const COLUMNS = [
  {
    title: "Client",
    links: [
      { href: "/vendors", label: "Cari Vendor" },
      { href: "/inspirasi", label: "Inspirasi" },
      { href: "/client/register", label: "Daftar" },
      { href: "/client/login", label: "Masuk" },
    ],
  },
  {
    title: "Vendor",
    links: [
      { href: "/vendor/register", label: "Daftar Jadi Mitra" },
      { href: "/vendor/login", label: "Masuk" },
      { href: "/legal/vendor-agreement", label: "Perjanjian Kemitraan" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/legal/client-tos", label: "Ketentuan Layanan" },
      { href: "/legal/vendor-agreement", label: "Perjanjian Vendor" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-dc-black/5 bg-dc-white">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/brand/duacincin-logo.webp" alt="DuaCincin" width={32} height={32} />
              <span className="font-heading text-lg font-extrabold text-dc-navy">DuaCincin</span>
            </Link>
            <p className="mt-3 max-w-xs text-sm text-dc-black/60">
              Wadah tepercaya untuk merencanakan pernikahan — vendor terverifikasi, budget planner otomatis, dan
              transaksi aman lewat escrow.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold text-dc-navy">{col.title}</h4>
              <ul className="mt-3 flex flex-col gap-2">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-dc-black/60 hover:text-dc-gold">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-dc-black/5 pt-6 text-xs text-dc-black/40 sm:flex-row">
          <span>© {new Date().getFullYear()} DuaCincin. Seluruh hak cipta dilindungi.</span>
          <Link href="/internal/login" className="hover:text-dc-navy">
            Login Internal
          </Link>
        </div>
      </div>
    </footer>
  );
}
