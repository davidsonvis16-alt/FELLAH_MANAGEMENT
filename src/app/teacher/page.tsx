import Link from "next/link";
import { db } from "@/lib/db";
import { currentTeacher } from "@/lib/teacher";
import { attendanceSummary, getCurrentTerm, noticesFor } from "@/lib/queries";
import { NoticeBoard } from "@/components/notices";
import { Card, Empty, StatTile } from "@/components/ui";
import { WelcomeBanner } from "@/components/kenya";
import { formatPercent } from "@/lib/grading";
import { formatDate, isoWeekday, periodFor, todayDateOnly, toInputDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function TeacherToday() {
  const { session, teacherId } = await currentTeacher();
  const term = await getCurrentTerm();
  const today = todayDateOnly();
  const weekday = isoWeekday(today);

  const units = await db.classSubject.findMany({
    where: { teacherId },
    include: {
      subject: true,
      class: { include: { _count: { select: { students: { where: { status: "ACTIVE" } } } } } },
      slots: { include: { room: true } },
      assessments: {
        where: term ? { termId: term.id } : {},
        include: { marks: { select: { score: true } } },
      },
    },
    orderBy: { subject: { name: "asc" } },
  });

  const registersToday = await db.attendanceSession.findMany({
    where: { classSubjectId: { in: units.map((u) => u.id) }, date: today },
    select: { classSubjectId: true, period: true, _count: { select: { records: true } } },
  });
  const marked = new Set(registersToday.map((r) => `${r.classSubjectId}:${r.period}`));

  const lessons = units
    .flatMap((unit) => unit.slots.filter((slot) => slot.dayOfWeek === weekday).map((slot) => ({ unit, slot, period: periodFor(slot.startsAt) })))
    .sort((a, b) => a.slot.startsAt.localeCompare(b.slot.startsAt));

  const attendance = await attendanceSummary({
    session: { classSubjectId: { in: units.map((u) => u.id) }, ...(term ? { termId: term.id } : {}) },
  });

  // Assessments past due with marks still to enter.
  const toMark = units.flatMap((unit) =>
    unit.assessments
      .filter((a) => a.dueOn && a.dueOn <= today && a.marks.filter((m) => m.score !== null).length < unit.class._count.students)
      .map((a) => ({ unit, assessment: a, entered: a.marks.filter((m) => m.score !== null).length })),
  );

  const registersLeft = lessons.filter((l) => !marked.has(`${l.unit.id}:${l.period}`)).length;
  const students = units.reduce((sum, u) => sum + u.class._count.students, 0);

  return (
    <>
      <WelcomeBanner name={`Mwalimu ${session.name.split(" ")[0]}`} kicker={`${formatDate(today)}${term ? ` · ${term.name}, ${term.year.name}` : ""}`}>
        <p className="m-0 text-[14px] opacity-90">
          {lessons.length === 0
            ? "No lessons today. Pumzika - take a breather."
            : registersLeft === 0
              ? `All ${lessons.length} registers taken today. Kazi nzuri - great work!`
              : `${lessons.length} lesson${lessons.length === 1 ? "" : "s"} today, ${registersLeft} register${registersLeft === 1 ? "" : "s"} still to take.`}
        </p>
      </WelcomeBanner>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Lessons today" value={lessons.length} hint={`${lessons.filter((l) => marked.has(`${l.unit.id}:${l.period}`)).length} registers taken`} />
        <StatTile label="Units" value={units.length} hint={`${students} student places`} />
        <StatTile
          label="Attendance in my units"
          value={formatPercent(attendance.rate, "--")}
          tone={attendance.rate === null ? "neutral" : attendance.rate >= 90 ? "good" : attendance.rate >= 75 ? "warning" : "critical"}
          hint={term?.name}
        />
        <StatTile label="To mark" value={toMark.length} hint="assessments past due" tone={toMark.length > 0 ? "warning" : "neutral"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card title="Today's lessons" bodyClass="">
          {lessons.length === 0 ? (
            <div className="p-4">
              <Empty>No lessons timetabled today.</Empty>
            </div>
          ) : (
            <ul className="m-0 list-none p-0">
              {lessons.map(({ unit, slot, period }) => {
                const done = marked.has(`${unit.id}:${period}`);
                return (
                  <li key={slot.id} className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 last:border-b-0" style={{ borderColor: "var(--grid)" }}>
                    <span className="min-w-0">
                      <span className="muted mr-2 text-[12.5px]">
                        {slot.startsAt}-{slot.endsAt}
                      </span>
                      <span className="font-semibold">{unit.subject.name}</span>
                      <span className="muted">
                        {" "}
                        &middot; {unit.class.code} &middot; {slot.room?.name ?? "no room"}
                      </span>
                    </span>
                    <Link
                      href={`/teacher/units/${unit.id}/attendance?date=${toInputDate(today)}&period=${period}`}
                      className={done ? "btn btn-sm" : "btn btn-sm btn-primary"}
                    >
                      {done ? (
                        <>
                          <span aria-hidden className="tone-good">
                            ✓
                          </span>
                          Register taken
                        </>
                      ) : (
                        "Take register"
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <div className="flex flex-col gap-4">
        <Card title="Marks to enter" bodyClass="">
          {toMark.length === 0 ? (
            <div className="p-4">
              <Empty>All caught up.</Empty>
            </div>
          ) : (
            <ul className="m-0 list-none p-0">
              {toMark.map(({ unit, assessment, entered }) => (
                <li key={assessment.id} className="border-b px-4 py-3 last:border-b-0" style={{ borderColor: "var(--grid)" }}>
                  <Link href={`/teacher/units/${unit.id}/assessments/${assessment.id}`} className="font-semibold underline-offset-2 hover:underline">
                    {assessment.name} &middot; {unit.subject.code}
                  </Link>
                  <span className="muted"> &middot; {unit.class.code}</span>
                  <br />
                  <span className="ink-2 text-[12.5px]">
                    {entered}/{unit.class._count.students} marked &middot; due {formatDate(assessment.dueOn)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <NoticeBoard notices={await noticesFor("STAFF", 4)} />
        </div>
      </div>
    </>
  );
}
