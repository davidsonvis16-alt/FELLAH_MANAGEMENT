import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Card, Empty, PageHeader, StatTile } from "@/components/ui";
import { formatDate, DAY_NAMES } from "@/lib/dates";
import { getCurrentTerm, attendanceSummary } from "@/lib/queries";
import { formatPercent } from "@/lib/grading";

export const dynamic = "force-dynamic";

export default async function TeacherProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const teacher = await db.teacher.findUnique({
    where: { id },
    include: {
      user: true,
      classesLed: true,
      classSubjects: {
        include: {
          subject: true,
          class: { include: { _count: { select: { students: true } } } },
          slots: { include: { room: true }, orderBy: [{ dayOfWeek: "asc" }, { startsAt: "asc" }] },
          _count: { select: { assessments: true, attendanceSessions: true } },
        },
      },
    },
  });
  if (!teacher) notFound();

  const term = await getCurrentTerm();
  const attendance = await attendanceSummary({
    session: { takenById: teacher.id, ...(term ? { termId: term.id } : {}) },
  });
  const sessionsTaken = await db.attendanceSession.count({ where: { takenById: teacher.id } });

  return (
    <>
      <PageHeader
        title={teacher.user.name}
        subtitle={
          <span className="flex flex-wrap items-center gap-x-2">
            <code>{teacher.staffNo}</code>
            <span className="muted">&middot;</span>
            <span>{teacher.qualification ?? "no qualification on record"}</span>
          </span>
        }
        action={
          <Link href="/admin/teachers" className="btn">
            Back to teachers
          </Link>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Units taught" value={teacher.classSubjects.length} />
        <StatTile label="Class teacher of" value={teacher.classesLed.length} hint={teacher.classesLed.map((c) => c.code).join(", ") || "none"} />
        <StatTile label="Sessions marked" value={sessionsTaken} hint="attendance registers" />
        <StatTile label="Attendance in their classes" value={formatPercent(attendance.rate, "--")} hint={term?.name ?? ""} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Units" bodyClass="">
          {teacher.classSubjects.length === 0 ? (
            <div className="p-4">
              <Empty>No units assigned.</Empty>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Class</th>
                    <th className="num">Students</th>
                    <th className="num">Assessments</th>
                  </tr>
                </thead>
                <tbody>
                  {teacher.classSubjects.map((unit) => (
                    <tr key={unit.id}>
                      <td>
                        <span className="font-semibold">{unit.subject.name}</span>
                        <div className="muted text-[12px]">{unit.subject.code}</div>
                      </td>
                      <td>
                        <Link href={`/admin/classes/${unit.classId}`} className="underline-offset-2 hover:underline">
                          {unit.class.name}
                        </Link>
                      </td>
                      <td className="num">{unit.class._count.students}</td>
                      <td className="num">{unit._count.assessments}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <div className="flex flex-col gap-4">
          <Card title="Weekly timetable" bodyClass="">
            {teacher.classSubjects.every((unit) => unit.slots.length === 0) ? (
              <div className="p-4">
                <Empty>No timetabled lessons.</Empty>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Day</th>
                      <th>Time</th>
                      <th>Unit</th>
                      <th>Room</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teacher.classSubjects
                      .flatMap((unit) => unit.slots.map((slot) => ({ unit, slot })))
                      .sort((a, b) => a.slot.dayOfWeek - b.slot.dayOfWeek || a.slot.startsAt.localeCompare(b.slot.startsAt))
                      .map(({ unit, slot }) => (
                        <tr key={slot.id}>
                          <td>{DAY_NAMES[slot.dayOfWeek - 1]}</td>
                          <td className="whitespace-nowrap">
                            {slot.startsAt}-{slot.endsAt}
                          </td>
                          <td>
                            {unit.subject.code} &middot; {unit.class.code}
                          </td>
                          <td className="muted">{slot.room?.name ?? "-"}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card title="Contact">
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
              <dt className="muted">Email</dt>
              <dd className="m-0 truncate">{teacher.user.email}</dd>
              <dt className="muted">Phone</dt>
              <dd className="m-0">{teacher.user.phone ?? "-"}</dd>
              <dt className="muted">Employed</dt>
              <dd className="m-0">{formatDate(teacher.employedOn)}</dd>
              <dt className="muted">Last sign-in</dt>
              <dd className="m-0">{teacher.user.lastLoginAt ? formatDate(teacher.user.lastLoginAt) : "never"}</dd>
            </dl>
          </Card>
        </div>
      </div>
    </>
  );
}
