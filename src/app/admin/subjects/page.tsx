import { db } from "@/lib/db";
import { Card, Empty, PageHeader } from "@/components/ui";
import { SubjectForm } from "./subject-form";

export const dynamic = "force-dynamic";

export default async function SubjectsPage() {
  const subjects = await db.subject.findMany({
    orderBy: { code: "asc" },
    include: { classSubjects: { include: { class: { select: { code: true } }, teacher: { include: { user: { select: { name: true } } } } } } },
  });

  return (
    <>
      <PageHeader title="Subjects" subtitle={`${subjects.length} subjects in the catalogue`} />
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card bodyClass="">
          {subjects.length === 0 ? (
            <div className="p-4">
              <Empty>No subjects yet.</Empty>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Subject</th>
                    <th>Taught to</th>
                    <th>Teachers</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <code className="text-[12.5px]">{s.code}</code>
                      </td>
                      <td>
                        <span className="font-semibold">{s.name}</span>
                        {s.description ? <div className="muted text-[12px]">{s.description}</div> : null}
                      </td>
                      <td>
                        {s.classSubjects.length === 0 ? (
                          <span className="muted">not offered</span>
                        ) : (
                          <span className="flex flex-wrap gap-1">
                            {s.classSubjects.map((cs) => (
                              <span key={cs.id} className="badge">
                                {cs.class.code}
                              </span>
                            ))}
                          </span>
                        )}
                      </td>
                      <td className="ink-2">{[...new Set(s.classSubjects.map((cs) => cs.teacher?.user.name).filter(Boolean))].join(", ") || <span className="muted">-</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        <SubjectForm />
      </div>
    </>
  );
}
