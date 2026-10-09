import Link from "next/link";
import { db } from "@/lib/db";
import { Card, Empty, PageHeader } from "@/components/ui";
import { formatDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function TeachersPage() {
  const teachers = await db.teacher.findMany({
    include: {
      user: { select: { name: true, email: true, phone: true } },
      classesLed: { select: { code: true } },
      classSubjects: { include: { subject: { select: { code: true } }, class: { select: { code: true } } } },
    },
    orderBy: { user: { name: "asc" } },
  });

  return (
    <>
      <PageHeader
        title="Teachers"
        subtitle={`${teachers.length} on staff`}
        action={
          <Link href="/admin/teachers/new" className="btn btn-primary">
            Add teacher
          </Link>
        }
      />
      <Card bodyClass="">
        {teachers.length === 0 ? (
          <div className="p-4">
            <Empty>No teachers yet.</Empty>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Staff no.</th>
                  <th>Name</th>
                  <th>Units taught</th>
                  <th>Class teacher of</th>
                  <th>Employed</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map((teacher) => (
                  <tr key={teacher.id}>
                    <td>
                      <code className="text-[12.5px]">{teacher.staffNo}</code>
                    </td>
                    <td>
                      <Link href={`/admin/teachers/${teacher.id}`} className="font-semibold underline-offset-2 hover:underline">
                        {teacher.user.name}
                      </Link>
                      <div className="muted text-[12px]">{teacher.user.email}</div>
                    </td>
                    <td>
                      <span className="flex flex-wrap gap-1">
                        {teacher.classSubjects.length === 0 ? (
                          <span className="muted">none</span>
                        ) : (
                          teacher.classSubjects.map((unit) => (
                            <span key={unit.id} className="badge">
                              {unit.subject.code} &middot; {unit.class.code}
                            </span>
                          ))
                        )}
                      </span>
                    </td>
                    <td>
                      {teacher.classesLed.length === 0 ? (
                        <span className="muted">-</span>
                      ) : (
                        teacher.classesLed.map((klass) => klass.code).join(", ")
                      )}
                    </td>
                    <td className="whitespace-nowrap">{formatDate(teacher.employedOn)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
