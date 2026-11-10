"use client";

import { Input } from "@/components/ui/Field";

type TextFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  required?: boolean;
};

/** Legacy controlled text field (auth forms). New code uses ui/Field Input. */
export function TextField({ label, value, onChange, type = "text", autoComplete, placeholder, required = true }: TextFieldProps) {
  return (
    <Input
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      type={type}
      autoComplete={autoComplete}
      placeholder={placeholder}
      required={required}
    />
  );
}
