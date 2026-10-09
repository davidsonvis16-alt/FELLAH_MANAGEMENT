import type { ReactNode } from "react";
import { ATTENDANCE_LABELS, ATTENDANCE_TONE, type AttendanceStatus } from "@/lib/enums";
import { round1 } from "@/lib/grading";
import { CountUp } from "./live";

export function Card({
  title,
  action,
  children,
  bodyClass = "p-4",
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  bodyClass?: string;
}) {
  return (
    <section className="card">
      {title ? (
        <div className="card-head">
          <h2 className="card-title">{title}</h2>
          {action}
        </div>
      ) : null}
      <div className={bodyClass}>{children}</div>
    </section>
  );
}

/** A single headline number. No plot, so no hover layer. */
export function StatTile({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "good" | "warning" | "critical" | "neutral";
}) {
  return (
    <div className="card stat p-4 pt-5">
      <p className="stat-label">{label}</p>
      <p className="stat-value" style={tone && tone !== "neutral" ? { color: `var(--${tone})` } : undefined}>
        {typeof value === "string" || typeof value === "number" ? <CountUp value={value} /> : value}
      </p>
      {hint ? <p className="muted m-0 mt-1 text-[12.5px]">{hint}</p> : null}
    </div>
  );
}

/** Magnitude bar, one series: the row label carries identity, so no legend. */
export function Bar({
  label,
  value,
  max = 100,
  suffix = "%",
  series = 1,
  right,
}: {
  label: string;
  value: number | null;
  max?: number;
  suffix?: string;
  series?: 1 | 2 | 3;
  right?: ReactNode;
}) {
  const pct = value === null ? 0 : Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="mb-3 last:mb-0" title={value === null ? `${label}: no data` : `${label}: ${round1(value)}${suffix}`}>
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <span className="truncate">{label}</span>
        <span className="num shrink-0 font-semibold">
          {value === null ? <span className="muted">no data</span> : `${round1(value)}${suffix}`}
          {right ? <span className="ml-2">{right}</span> : null}
        </span>
      </div>
      <div className="bar-track">
        <div className="bar-fill" style={{ width: `${pct}%`, background: `var(--series-${series})` }} />
      </div>
    </div>
  );
}

const TREND_GLYPH = { up: "↑", down: "↓", flat: "→" };

export function Trend({ delta }: { delta: number | null }) {
  if (delta === null) return <span className="muted">-</span>;
  const direction = delta > 1 ? "up" : delta < -1 ? "down" : "flat";
  const color = direction === "up" ? "var(--up)" : direction === "down" ? "var(--critical)" : "var(--ink-muted)";
  return (
    <span style={{ color }} className="font-semibold whitespace-nowrap">
      {TREND_GLYPH[direction]} {Math.abs(round1(delta))}%
    </span>
  );
}

const ATTENDANCE_GLYPH: Record<AttendanceStatus, string> = {
  PRESENT: "✓",
  ABSENT: "✕",
  LATE: "◔",
  EXCUSED: "–",
};

/** Icon + label + colour - never colour alone. */
export function AttendanceBadge({ status }: { status: AttendanceStatus }) {
  const tone = ATTENDANCE_TONE[status];
  return (
    <span className={`badge tone-${tone}`}>
      <span aria-hidden>{ATTENDANCE_GLYPH[status]}</span>
      <span style={{ color: "var(--ink-2)" }}>{ATTENDANCE_LABELS[status]}</span>
    </span>
  );
}

export function GradePill({ grade, percent }: { grade: string | null; percent: number | null }) {
  if (percent === null) return <span className="muted">not marked</span>;
  const tone = percent >= 50 ? "good" : percent >= 40 ? "warning" : "critical";
  return (
    <span className={`badge tone-${tone}`}>
      <span className="badge-dot" aria-hidden />
      <span style={{ color: "var(--ink)" }}>
        {grade} &middot; {round1(percent)}%
      </span>
    </span>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="muted m-0 py-6 text-center">{children}</p>;
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="alert alert-critical" role="alert">
      <span aria-hidden style={{ color: "var(--critical)" }}>
        &#9888;
      </span>
      <span>{message}</span>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="m-0 text-[30px] leading-tight">{title}</h1>
        {subtitle ? <p className="ink-2 m-0 mt-0.5">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}
