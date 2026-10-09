import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { teacherUnit } from "@/lib/teacher";
import { PageHeader, StatTile } from "@/components/ui";
import { formatDate } from "@/lib/dates";
import { formatPercent, round1 } from "@/lib/grading";
import { MarksForm } from "./marks-form";

export const dynamic = "force-dynamic";

export default async function MarksPage({ params }: { params: Promise<{ id: string; assessmentId: string }> }) {
  const { id, assessmentId } = await params;
  const { unit } = await teacherUnit(id);
  const assessment = await db.assessment.findUnique({ where: { id: assessmentId }, include: { marks: true } });
  if (!assessment || assessment.classSubjectId !== unit.id) notFound();

  const students = await db.student.findMany({
    where: { classId: unit.classId, status: "ACTIVE" },
    include: { user: { select: { name: true } } },
    orderBy: { user: { name: "asc" } },
  });

  const scores = assessment.marks.map((m) => m.score).filter((s): s is number => s !== null);
  const mean = scores.length ? round1((scores.reduce((a, b) => a + b, 0) / scores.length / assessment.maxScore) * 100) : null;
  const high = scores.length ? Math.max(...scores) : null;
  const low = scores.length ? Math.min(...scores) : null;

  return (
    <>
      <PageHeader
        title={assessment.name}
        subtitle={`${unit.subject.name} · ${unit.class.code} · out of ${assessment.maxScore} · ${assessment.weight}% of unit · due ${formatDate(assessment.dueOn)}`}
        action={
          <Link href={`/teacher/units/${unit.id}`} className="btn">
            Back to unit
          </Link>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Marked" value={`${scores.length}/${students.length}`} />
        <StatTile label="Mean" value={formatPercent(mean, "--")} />
        <StatTile label="Highest" value={high ?? "--"} hint={`of ${assessment.maxScore}`} />
        <StatTile label="Lowest" value={low ?? "--"} hint={`of ${assessment.maxScore}`} />
      </div>

      <MarksForm
        assessmentId={assessment.id}
        maxScore={assessment.maxScore}
        students={students.map((s) => ({
          id: s.id,
          name: s.user.name,
          admissionNo: s.admissionNo,
          score: assessment.marks.find((m) => m.studentId === s.id)?.score ?? null,
        }))}
      />
    </>
  );
}
