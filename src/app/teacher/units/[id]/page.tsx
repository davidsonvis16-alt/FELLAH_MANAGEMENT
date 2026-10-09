import Link from "next/link";
import { db } from "@/lib/db";
import { teacherUnit } from "@/lib/teacher";
import { getCurrentTerm } from "@/lib/queries";
import { computeUnit, formatPercent, PASS_MARK, type ScoredMark } from "@/lib/grading";
import { Card, Empty, GradePill, PageHeader, StatTile } from "@/components/ui";
import { formatDate, todayDateOnly, toInputDate } from "@/lib/dates";
import { AssessmentForm } from "./assessment-form";

export const dynamic = "force-dynamic";

export default async function TeacherUnitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { unit } = await teacherUnit(id);
  const term = await getCurrentTerm();

  const [students, assessments, registers] = await Promise.all([
    db.student.findMany({
      where: { classId: unit.classId, status: "ACTIVE" },
      include: { user: { select: { name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
    db.assessment.findMany({
      where: { classSubjectId: unit.id, ...(term ? { termId: term.id } : {}) },
      include: { marks: { select: { studentId: true, score: true } } },
      orderBy: { createdAt: "asc" },
    }),
    db.attendanceSession.findMany({
      where: { classSubjectId: unit.id },
      include: { records: { select: { studentId: true, status: true } } },
      orderBy: [{ date: "desc" }, { period: "desc" }],
    }),
  ]);

  const rows = students.map((student) => {
    const marks: ScoredMark[] = assessments.map((a) => ({
      score: a.marks.find((m) => m.studentId === student.id)?.score ?? null,
      assessment: { id: a.id, maxScore: a.maxScore, weight: a.weight, dueOn: a.dueOn },
    }));
    const result = computeUnit(marks, assessments);
    let expected = 0;
    let attended = 0;
    for (const register of registers) {
      const record = register.records.find((r) => r.studentId === student.id);
      if (!record || record.status === "EXCUSED") continue;
      expected += 1;
      if (record.status === "PRESENT" || record.status === "LATE") attended += 1;
    }
    return { student, result, attendance: expected > 0 ? Math.round((attended / expected) * 1000) / 10 : null };
  });

  const scored = rows.map((r) => r.result.percent).filter((p): p is number => p !== null);
  const unitAverage = scored.length ? Math.round((scored.reduce((a, b) => a + b, 0) / scored.length) * 10) / 10 : null;
  const below = scored.filter((p) => p < PASS_MARK).length;
  const weightSet = assessments.reduce((s, a) => s + a.weight, 0);

  return (
    <>
      <PageHeader
        title={unit.subject.name}
        subtitle={
          <span className="flex flex-wrap items-center gap-x-2">
            <code>{unit.subject.code}</code>
            <span className="muted">&middot;</span>
            <span>{unit.class.name}</span>
          </span>
        }
        action={
          <div className="flex gap-2">
            <Link href={`/teacher/units/${unit.id}/attendance?date=${toInputDate(todayDateOnly())}`} className="btn btn-primary">
              Take register
            </Link>
            <Link href="/teacher/units" className="btn">
              All units
            </Link>
          </div>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Students" value={students.length} />
        <StatTile label="Unit average" value={formatPercent(unitAverage, "--")} tone={unitAverage === null ? "neutral" : unitAverage >= PASS_MARK ? "good" : "critical"} />
        <StatTile label="Below pass" value={below} hint={`under ${PASS_MARK}%`} tone={below > 0 ? "warning" : "neutral"} />
        <StatTile label="Registers" value={registers.length} hint={registers[0] ? `last ${formatDate(registers[0].date)}` : "none yet"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card title="Class list" bodyClass="">
          {rows.length === 0 ? (
            <div className="p-4">
              <Empty>No active students in this class.</Empty>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th className="num">Attendance</th>
                    <th className="num">Missing</th>
                    <th className="num">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ student, result, attendance }) => (
                    <tr key={student.id}>
                      <td>
                        <span className="font-semibold">{student.user.name}</span>
                        <div className="muted text-[12px]">{student.admissionNo}</div>
                      </td>
                      <td className="num">
                        <span className={attendance !== null && attendance < 75 ? "tone-critical" : undefined}>{formatPercent(attendance, "--")}</span>
                      </td>
                      <td className="num">{result.missingCount > 0 ? <span className="tone-warning font-semibold">{result.missingCount}</span> : <span className="muted">0</span>}</td>
                      <td className="num">
                        <GradePill grade={result.grade} percent={result.percent} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <div className="flex flex-col gap-4">
          <Card title="Assessments" action={<span className="muted text-[12px]">{weightSet}% of 100% set</span>} bodyClass="">
            {assessments.length === 0 ? (
              <div className="p-4">
                <Empty>No assessments yet this term.</Empty>
              </div>
            ) : (
              <ul className="m-0 list-none p-0">
                {assessments.map((a) => {
                  const entered = a.marks.filter((m) => m.score !== null).length;
                  return (
                    <li key={a.id} className="flex items-center justify-between gap-3 border-b px-4 py-3 last:border-b-0" style={{ borderColor: "var(--grid)" }}>
                      <span className="min-w-0">
                        <Link href={`/teacher/units/${unit.id}/assessments/${a.id}`} className="font-semibold underline-offset-2 hover:underline">
                          {a.name}
                        </Link>
                        <span className="muted text-[12.5px]">
                          {" "}
                          &middot; /{a.maxScore} &middot; {a.weight}%
                        </span>
                        <br />
                        <span className="muted text-[12px]">due {formatDate(a.dueOn)}</span>
                      </span>
                      <span className={`num text-[12.5px] font-semibold ${entered === students.length ? "tone-good" : "ink-2"}`}>
                        {entered}/{students.length}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          {weightSet < 100 ? <AssessmentForm classSubjectId={unit.id} remaining={100 - weightSet} /> : null}

          <Card title="Recent registers" bodyClass="">
            {registers.length === 0 ? (
              <div className="p-4">
                <Empty>No registers taken yet.</Empty>
              </div>
            ) : (
              <ul className="m-0 list-none p-0">
                {registers.slice(0, 8).map((r) => {
                  const absent = r.records.filter((x) => x.status === "ABSENT").length;
                  return (
                    <li key={r.id} className="flex items-center justify-between gap-3 border-b px-4 py-2.5 last:border-b-0" style={{ borderColor: "var(--grid)" }}>
                      <Link href={`/teacher/units/${unit.id}/attendance?date=${toInputDate(r.date)}&period=${r.period}`} className="underline-offset-2 hover:underline">
                        {formatDate(r.date)} <span className="muted">&middot; P{r.period}</span>
                      </Link>
                      <span className={`text-[12.5px] ${absent > 0 ? "tone-critical font-semibold" : "muted"}`}>{absent} absent</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
