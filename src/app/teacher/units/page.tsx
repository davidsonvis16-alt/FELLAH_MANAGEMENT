import Link from "next/link";
import { db } from "@/lib/db";
import { currentTeacher } from "@/lib/teacher";
import { getCurrentTerm } from "@/lib/queries";
import { Card, Empty, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function TeacherUnits() {
  const { teacherId } = await currentTeacher();
  const term = await getCurrentTerm();
  const units = await db.classSubject.findMany({
    where: { teacherId },
    include: {
      subject: true,
      class: { include: { _count: { select: { students: { where: { status: "ACTIVE" } } } } } },
      _count: { select: { attendanceSessions: true } },
      assessments: { where: term ? { termId: term.id } : {}, select: { weight: true } },
    },
    orderBy: [{ class: { code: "asc" } }, { subject: { name: "asc" } }],
  });

  return (
    <>
      <PageHeader title="My units" subtitle={`${units.length} units${term ? ` · ${term.name}` : ""}`} />
      <Card bodyClass="">
        {units.length === 0 ? (
          <div className="p-4">
            <Empty>No units assigned to you yet. Ask the administrator.</Empty>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Unit</th>
                  <th>Class</th>
                  <th className="num">Students</th>
                  <th className="num">Registers</th>
                  <th className="num">Assessments</th>
                  <th className="num">Weight set</th>
                </tr>
              </thead>
              <tbody>
                {units.map((unit) => {
                  const weight = unit.assessments.reduce((s, a) => s + a.weight, 0);
                  return (
                    <tr key={unit.id}>
                      <td>
                        <Link href={`/teacher/units/${unit.id}`} className="font-semibold underline-offset-2 hover:underline">
                          {unit.subject.name}
                        </Link>
                        <div className="muted text-[12px]">{unit.subject.code}</div>
                      </td>
                      <td>{unit.class.name}</td>
                      <td className="num">{unit.class._count.students}</td>
                      <td className="num">{unit._count.attendanceSessions}</td>
                      <td className="num">{unit.assessments.length}</td>
                      <td className="num">
                        <span className={weight === 100 ? "tone-good" : "tone-warning"}>{weight}%</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
