import Link from "next/link";
import { allClasses } from "@/lib/queries";
import { db } from "@/lib/db";
import { Card, Empty, PageHeader } from "@/components/ui";
import { ClassForm } from "./class-form";

export const dynamic = "force-dynamic";

export default async function ClassesPage() {
  const [classes, teachers] = await Promise.all([
    allClasses(),
    db.teacher.findMany({ include: { user: { select: { name: true } } }, orderBy: { user: { name: "asc" } } }),
  ]);

  return (
    <>
      <PageHeader title="Classes" subtitle={`${classes.length} classes`} />

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card bodyClass="">
          {classes.length === 0 ? (
            <div className="p-4">
              <Empty>No classes yet.</Empty>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Class</th>
                    <th>Class teacher</th>
                    <th className="num">Students</th>
                    <th className="num">Units</th>
                    <th className="num">Capacity</th>
                  </tr>
                </thead>
                <tbody>
                  {classes.map((klass) => (
                    <tr key={klass.id}>
                      <td>
                        <code className="text-[12.5px]">{klass.code}</code>
                      </td>
                      <td>
                        <Link href={`/admin/classes/${klass.id}`} className="font-semibold underline-offset-2 hover:underline">
                          {klass.name}
                        </Link>
                        <div className="muted text-[12px]">Level {klass.level}</div>
                      </td>
                      <td>{klass.classTeacher?.user.name ?? <span className="muted">unassigned</span>}</td>
                      <td className="num">{klass._count.students}</td>
                      <td className="num">{klass._count.classSubjects}</td>
                      <td className="num muted">{klass.capacity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <ClassForm teachers={teachers.map((t) => ({ id: t.id, name: t.user.name }))} />
      </div>
    </>
  );
}
