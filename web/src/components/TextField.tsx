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
      <label htmlFor={id} className="text-sm font-medium text-dc-navy">
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
        className="w-full rounded-xl border border-dc-black/15 bg-dc-white px-4 py-2.5 text-dc-black outline-none transition focus:border-dc-gold focus:ring-2 focus:ring-dc-gold/30"
      />
    </div>
  );
}
