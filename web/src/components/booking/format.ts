// Human Indonesian dates and money helpers for the booking + chat screens.
// Event dates come from the API as "YYYY-MM-DD" (a calendar day, no time
// zone), so they are parsed as a local date to avoid an off-by-one shift.

const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export function parseDay(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "9 Januari 2027" (or the raw value when it cannot be read). */
export function formatTanggal(value: string, withDay = false): string {
  const d = parseDay(value);
  if (!d) return value;
  const base = `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  return withDay ? `${DAYS[d.getDay()]}, ${base}` : base;
}

export function monthShort(d: Date): string {
  return MONTHS_SHORT[d.getMonth()];
}

export function dayName(d: Date): string {
  return DAYS[d.getDay()];
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Whole days from today to the given day (negative when past). */
export function daysUntil(value: string): number | null {
  const d = parseDay(value);
  if (!d) return null;
  return Math.round((startOfDay(d) - startOfDay(new Date())) / 86_400_000);
}

/** "96 hari lagi", "Besok", "Hari ini", "20 hari lalu". */
export function countdownLabel(value: string): string | null {
  const n = daysUntil(value);
  if (n === null) return null;
  if (n === 0) return "Hari ini";
  if (n === 1) return "Besok";
  if (n > 1) return `${n} hari lagi`;
  if (n === -1) return "Kemarin";
  return `${-n} hari lalu`;
}

/** "14.30" (Indonesian time notation). */
export function formatJam(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}.${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Day separator in a chat thread: "Hari ini", "Kemarin", "Senin, 9 November 2026". */
export function chatDayLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const diff = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86_400_000);
  if (diff === 0) return "Hari ini";
  if (diff === 1) return "Kemarin";
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function sameDay(a: string, b: string): boolean {
  const x = new Date(a);
  const y = new Date(b);
  return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate();
}

/** Initials for an avatar (never a generated photo). */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.trim().slice(0, 2).toUpperCase() || "?";
}
