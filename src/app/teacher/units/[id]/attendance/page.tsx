import Link from "next/link";
import { db } from "@/lib/db";
import { teacherUnit } from "@/lib/teacher";
import { PageHeader } from "@/components/ui";
import { formatDate, isoWeekday, periodFor, PERIODS, toDateOnly, todayDateOnly, toInputDate } from "@/lib/dates";
import type { AttendanceStatus } from "@/lib/enums";
import { RegisterForm } from "./register-form";

export const dynamic = "force-dynamic";

export default async function RegisterPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date?: string; period?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const { unit } = await teacherUnit(id);

  const today = todayDateOnly();
  const date = query.date && /^\d{4}-\d{2}-\d{2}$/.test(query.date) ? toDateOnly(query.date) : today;

  // Default the period to this unit's first timetabled slot on that weekday.
  const slots = await db.timetableSlot.findMany({ where: { classSubjectId: unit.id, dayOfWeek: isoWeekday(date) }, orderBy: { startsAt: "asc" } });
  const requested = Number(query.period);
  const period = Number.isInteger(requested) && requested >= 1 && requested <= 8 ? requested : slots[0] ? periodFor(slots[0].startsAt) : 1;

  const [students, existing] = await Promise.all([
    db.student.findMany({
      where: { classId: unit.classId, status: "ACTIVE" },
      include: { user: { select: { name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
    db.attendanceSession.findUnique({
      where: { classSubjectId_date_period: { classSubjectId: unit.id, date, period } },
      include: { records: true },
    }),
  ]);

  // Absences already this week across all units: lets the teacher spot a pattern while marking.
  const weekStart = new Date(date);
  weekStart.setUTCDate(weekStart.getUTCDate() - (isoWeekday(date) - 1));
  const weekAbsences = await db.attendance.groupBy({
    by: ["studentId"],
    where: { studentId: { in: students.map((s) => s.id) }, status: "ABSENT", session: { date: { gte: weekStart, lte: date } } },
    _count: { _all: true },
  });
  const absencesBy = new Map(weekAbsences.map((row) => [row.studentId, row._count._all]));

  const slotLabel = PERIODS.find((p) => p.period === period);

  return (
    <>
      <PageHeader
        title="Register"
        subtitle={
          <span>
            {unit.subject.name} &middot; {unit.class.code} &middot; {formatDate(date)} &middot; P{period}
            {slotLabel ? ` (${slotLabel.startsAt}-${slotLabel.endsAt})` : ""}
          </span>
        }
        action={
          <Link href={`/teacher/units/${unit.id}`} className="btn">
            Back to unit
          </Link>
        }
      />

      <form className="card mb-4 flex flex-wrap items-end gap-3 p-4" method="get">
        <div>
          <label className="label" htmlFor="r-date">
            Date
          </label>
          <input id="r-date" name="date" type="date" defaultValue={toInputDate(date)} max={toInputDate(today)} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="r-period">
            Period
          </label>
          <select id="r-period" name="period" defaultValue={period} className="select">
            {PERIODS.map((p) => (
              <option key={p.period} value={p.period}>
                P{p.period} &middot; {p.startsAt}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn">
          Open
        </button>
        {existing ? (
          <span className="badge tone-good ml-auto">
            <span aria-hidden>✓</span>
            <span style={{ color: "var(--ink-2)" }}>Already taken - saving updates it</span>
          </span>
        ) : null}
      </form>

      <RegisterForm
        key={`${toInputDate(date)}-${period}`}
        classSubjectId={unit.id}
        date={toInputDate(date)}
        period={period}
        students={students.map((s) => ({
          id: s.id,
          name: s.user.name,
          admissionNo: s.admissionNo,
          weekAbsences: absencesBy.get(s.id) ?? 0,
          status: (existing?.records.find((r) => r.studentId === s.id)?.status as AttendanceStatus | undefined) ?? "PRESENT",
        }))}
      />
    </>
  );
}
