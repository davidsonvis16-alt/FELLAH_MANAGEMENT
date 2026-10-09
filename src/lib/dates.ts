/** Dates are stored at 00:00 UTC so an attendance session has one canonical key. */
export function toDateOnly(value: Date | string): Date {
  const d = typeof value === "string" ? new Date(`${value}T00:00:00.000Z`) : value;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function todayDateOnly(): Date {
  return toDateOnly(new Date());
}

export function toInputDate(value: Date | string | null | undefined): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toISOString().slice(0, 10);
}

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "-";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}

export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "-";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function relativeTime(value: Date | string): string {
  const d = typeof value === "string" ? new Date(value) : value;
  const seconds = Math.round((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(d);
}

/** Monday 00:00 UTC of the week containing `value`. */
export function startOfWeek(value: Date = new Date()): Date {
  const d = toDateOnly(value);
  const weekday = d.getUTCDay() === 0 ? 7 : d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - (weekday - 1));
  return d;
}

export const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri"];

/** Teaching periods. A slot's start time maps to the period number its register is keyed on. */
export const PERIODS = [
  { period: 1, startsAt: "08:00", endsAt: "10:00" },
  { period: 2, startsAt: "10:30", endsAt: "12:30" },
  { period: 3, startsAt: "14:00", endsAt: "16:00" },
];

export function periodFor(startsAt: string): number {
  return PERIODS.find((p) => p.startsAt === startsAt)?.period ?? 1;
}

/** 1 = Monday .. 7 = Sunday. */
export function isoWeekday(value: Date): number {
  const day = value.getUTCDay();
  return day === 0 ? 7 : day;
}
