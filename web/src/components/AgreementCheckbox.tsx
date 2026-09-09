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
    <label className="flex items-start gap-2 text-sm text-dc-black/70">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 accent-dc-gold"
      />
      <span>
        Saya menyetujui{" "}
        <Link href={href} target="_blank" className="font-semibold text-dc-navy hover:text-dc-gold">
          {label}
        </Link>
      </span>
    </label>
  );
}
