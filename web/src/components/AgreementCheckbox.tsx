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
    <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-md border border-dc-line bg-dc-white px-4 py-3.5 text-sm leading-relaxed text-dc-text-2 transition-colors hover:border-dc-line-strong has-[:checked]:border-dc-gold has-[:checked]:bg-dc-gold/[0.06]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-dc-clay focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold"
      />
      <span>
        Saya menyetujui{" "}
        <Link
          href={href}
          target="_blank"
          className="font-semibold text-dc-ink underline decoration-dc-gold underline-offset-4 hover:text-dc-clay"
        >
          {label}
        </Link>
      </span>
    </label>
  );
}

/** Signup consent by action: shown before the signup buttons, so finishing
 * registration is the acceptance (no checkbox). The server records the
 * accepted version and time. */
export function AgreementNotice({ href, label, role }: { href: string; label: string; role: string }) {
  return (
    <p className="rounded-md border border-dc-line bg-dc-white px-4 py-3 text-sm leading-relaxed text-dc-text-2">
      Dengan mendaftar sebagai {role}, kamu menyatakan telah membaca dan menyetujui{" "}
      <Link
        href={href}
        target="_blank"
        className="font-semibold text-dc-ink underline decoration-dc-gold underline-offset-4 hover:text-dc-clay"
      >
        {label}
      </Link>
      .
    </p>
  );
}
