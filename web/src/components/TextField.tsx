"use client";

import { useId } from "react";

type TextFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  required?: boolean;
};

export function TextField({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  placeholder,
  required = true,
}: TextFieldProps) {
  const id = useId();

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-dc-ink">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        required={required}
        className="min-h-11 w-full rounded-md border border-dc-ink/20 bg-dc-white px-4 py-2.5 text-dc-black transition placeholder:text-dc-black/40 focus:border-dc-ink focus:outline-2 focus:outline-offset-2 focus:outline-dc-gold"
      />
    </div>
  );
}
