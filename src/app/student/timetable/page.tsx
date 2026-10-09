import { db } from "@/lib/db";
import { currentStudent } from "@/lib/student";
import { Card, Empty, PageHeader } from "@/components/ui";
import { TimetableGrid } from "@/components/timetable";
import { isoWeekday, todayDateOnly } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function StudentTimetable() {
  const { studentId } = await currentStudent();
  const student = await db.student.findUnique({ where: { id: studentId }, include: { class: true } });
  const units = student?.classId
    ? await db.classSubject.findMany({
        where: { classId: student.classId },
        include: { subject: true, teacher: { include: { user: { select: { name: true } } } }, slots: { include: { room: true } } },
        orderBy: { subject: { name: "asc" } },
      })
    : [];

  return (
    <>
      <PageHeader title="Timetable" subtitle={student?.class?.name ?? "No class assigned"} />
      {units.length === 0 ? (
        <Card>
          <Empty>No timetable yet.</Empty>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          <Card bodyClass="">
            <TimetableGrid
              today={isoWeekday(todayDateOnly())}
              entries={units.flatMap((u) =>
                u.slots.map((s) => ({ dayOfWeek: s.dayOfWeek, startsAt: s.startsAt, code: u.subject.code, title: u.subject.name, room: s.room?.name ?? null })),
              )}
            />
          </Card>
          <Card title="Key" bodyClass="">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Unit</th>
                    <th>Lecturer</th>
                    <th className="num">Lessons / week</th>
                  </tr>
                </thead>
                <tbody>
                  {units.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <code>{u.subject.code}</code>
                      </td>
                      <td>{u.subject.name}</td>
                      <td className="ink-2">{u.teacher?.user.name ?? "-"}</td>
                      <td className="num">{u.slots.length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
