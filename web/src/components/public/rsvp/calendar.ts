// Date helpers for the guest RSVP page. Event dates come as "YYYY-MM-DD" (or
// an ISO timestamp); a date-only value is read as a local calendar day so a
// guest in any timezone sees the same day the couple chose.

export function parseEventDate(value?: string): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Whole days from today to the event (0 = today, negative = past). */
export function daysUntil(d: Date): number {
  const today = new Date();
  const a = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const b = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((b - a) / 864e5);
}

const ymd = (d: Date) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;

function nextDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
}

export function googleCalendarUrl(title: string, d: Date, location: string): string {
  const p = new URLSearchParams({ action: "TEMPLATE", text: title, dates: `${ymd(d)}/${ymd(nextDay(d))}`, location });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

/** An all-day .ics file the guest's phone calendar can open. */
export function downloadIcs(title: string, d: Date, location: string) {
  const esc = (s: string) => s.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//DuaCincin//RSVP//ID",
    "BEGIN:VEVENT",
    `UID:${ymd(d)}-${Math.random().toString(36).slice(2)}@duacincin.id`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
    `DTSTART;VALUE=DATE:${ymd(d)}`,
    `DTEND;VALUE=DATE:${ymd(nextDay(d))}`,
    `SUMMARY:${esc(title)}`,
    location ? `LOCATION:${esc(location)}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "undangan-pernikahan.ics";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
