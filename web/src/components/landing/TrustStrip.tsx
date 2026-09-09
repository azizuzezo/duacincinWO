const ITEMS = [
  { label: "Vendor Diverifikasi Admin" },
  { label: "Dana Ditahan Aman (Escrow)" },
  { label: "Riwayat Chat Tercatat" },
  { label: "Budget Planner Otomatis" },
];

export function TrustStrip() {
  return (
    <div className="border-b border-dc-black/5 bg-dc-offwhite">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-4 py-5 text-sm font-medium text-dc-navy/70">
        {ITEMS.map((item) => (
          <span key={item.label} className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F5A623" strokeWidth="3">
              <path d="M5 12l5 5L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
