import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { studentListRows } from "@/lib/queries";
import { Card, Empty, PageHeader, StatTile } from "@/components/ui";
import { formatPercent, round1, PASS_MARK } from "@/lib/grading";
import { DAY_NAMES } from "@/lib/dates";
import { UnitPanel } from "./unit-panel";

export const dynamic = "force-dynamic";

const PERIODS = ["08:00", "10:30", "14:00"];

export default async function ClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const klass = await db.class.findUnique({
    where: { id },
    include: {
      classTeacher: { include: { user: { select: { name: true } } } },
      classSubjects: {
        include: {
          subject: true,
          teacher: { include: { user: { select: { name: true } } } },
          slots: { include: { room: true } },
          _count: { select: { assessments: true, attendanceSessions: true } },
        },
        orderBy: { subject: { name: "asc" } },
      },
    },
  });
  if (!klass) notFound();

  const [roster, subjects, teachers] = await Promise.all([
    studentListRows({ classId: klass.id }),
    db.subject.findMany({ orderBy: { name: "asc" } }),
    db.teacher.findMany({ include: { user: { select: { name: true } } }, orderBy: { user: { name: "asc" } } }),
  ]);

  const rates = roster.map((r) => r.attendanceRate).filter((r): r is number => r !== null);
  const averages = roster.map((r) => r.average).filter((a): a is number => a !== null);
  const classAttendance = rates.length ? round1(rates.reduce((a, b) => a + b, 0) / rates.length) : null;
  const classAverage = averages.length ? round1(averages.reduce((a, b) => a + b, 0) / averages.length) : null;
  const atRisk = roster.filter((r) => (r.attendanceRate !== null && r.attendanceRate < 75) || (r.average !== null && r.average < PASS_MARK)).length;

  // One row per period, one column per weekday - the timetable as the class sees it.
  const grid = PERIODS.map((start) => ({
    start,
    cells: [1, 2, 3, 4, 5].map((day) => {
      const match = klass.classSubjects.flatMap((unit) => unit.slots.map((slot) => ({ unit, slot }))).find(({ slot }) => slot.dayOfWeek === day && slot.startsAt === start);
      return match ? { code: match.unit.subject.code, room: match.slot.room?.name ?? null } : null;
    }),
  }));

  return (
    <>
      <PageHeader
        title={klass.name}
        subtitle={
          <span className="flex flex-wrap items-center gap-x-2">
            <code>{klass.code}</code>
            <span className="muted">&middot;</span>
            <span>Level {klass.level}</span>
            <span className="muted">&middot;</span>
            <span>Class teacher: {klass.classTeacher?.user.name ?? "unassigned"}</span>
          </span>
        }
        action={
          <Link href="/admin/classes" className="btn">
            Back to classes
          </Link>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Students" value={roster.length} hint={`capacity ${klass.capacity}`} />
        <StatTile label="Units" value={klass.classSubjects.length} />
        <StatTile
          label="Class attendance"
          value={formatPercent(classAttendance, "--")}
          tone={classAttendance === null ? "neutral" : classAttendance >= 90 ? "good" : classAttendance >= 75 ? "warning" : "critical"}
        />
        <StatTile label="Class average" value={formatPercent(classAverage, "--")} hint={`${atRisk} need attention`} tone={atRisk > 0 ? "warning" : "neutral"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card title="Register" bodyClass="">
          {roster.length === 0 ? (
            <div className="p-4">
              <Empty>No students in this class yet.</Empty>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Admission no.</th>
                    <th>Name</th>
                    <th className="num">Attendance</th>
                    <th className="num">Average</th>
                    <th className="num">Missing</th>
                  </tr>
                </thead>
                <tbody>
                  {roster.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <code className="text-[12.5px]">{row.admissionNo}</code>
                      </td>
                      <td>
                        <Link href={`/admin/students/${row.id}`} className="font-semibold underline-offset-2 hover:underline">
                          {row.name}
                        </Link>
                      </td>
                      <td className="num">
                        <span className={row.attendanceRate !== null && row.attendanceRate < 75 ? "tone-critical" : undefined}>
                          {formatPercent(row.attendanceRate, "--")}
                        </span>
                      </td>
                      <td className="num">
                        <span className={row.average !== null && row.average < PASS_MARK ? "tone-critical" : undefined}>
                          {formatPercent(row.average, "--")}
                        </span>
                      </td>
                      <td className="num">{row.missingWork > 0 ? <span className="tone-warning font-semibold">{row.missingWork}</span> : <span className="muted">0</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <div className="flex flex-col gap-4">
          <UnitPanel
            classId={klass.id}
            units={klass.classSubjects.map((unit) => ({
              id: unit.id,
              subject: unit.subject.name,
              code: unit.subject.code,
              teacherId: unit.teacherId,
              teacherName: unit.teacher?.user.name ?? null,
              assessments: unit._count.assessments,
              sessions: unit._count.attendanceSessions,
            }))}
            subjects={subjects.map((s) => ({ id: s.id, name: s.name, code: s.code }))}
            teachers={teachers.map((t) => ({ id: t.id, name: t.user.name }))}
          />

          <Card title="Timetable" bodyClass="">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Time</th>
                    {DAY_NAMES.map((day) => (
                      <th key={day}>{day}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {grid.map((row) => (
                    <tr key={row.start}>
                      <td className="muted whitespace-nowrap">{row.start}</td>
                      {row.cells.map((cell, index) => (
                        <td key={index}>
                          {cell ? (
                            <span title={cell.room ?? undefined} className="font-semibold">
                              {cell.code}
                            </span>
                          ) : (
                            <span className="muted">-</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="muted m-0 px-4 py-3 text-[12px]">Conflict-checked automatic generation is V3; this grid is seeded and read-only in V1.</p>
          </Card>
        </div>
      </div>
    </>
  );
}
