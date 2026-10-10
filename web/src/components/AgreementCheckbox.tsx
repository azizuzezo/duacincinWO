"use client";

import Link from "next/link";

export function AgreementCheckbox({
  checked,
  onChange,
  href,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  href: string;
  label: string;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-md border border-dc-ink/10 bg-dc-white px-3 py-3 text-sm text-dc-black/80">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-dc-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold"
      />
      <span>
        Saya menyetujui{" "}
        <Link
          href={href}
          target="_blank"
          className="font-semibold text-dc-clay underline underline-offset-2 hover:text-dc-ink"
        >
          {label}
        </Link>
      </span>
    </label>
  );
}
