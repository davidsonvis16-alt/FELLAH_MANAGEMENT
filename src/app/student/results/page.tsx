import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { currentStudent } from "@/lib/student";
import { studentProfile } from "@/lib/queries";
import { Card, Empty, GradePill, PageHeader, Trend } from "@/components/ui";
import { formatPercent, GRADE_BANDS, gradeFor, PASS_MARK, round1 } from "@/lib/grading";
import { formatDate } from "@/lib/dates";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

export default async function ReportCard() {
  const { studentId } = await currentStudent();
  const profile = await studentProfile(studentId);
  if (!profile) notFound();
  const { student, term, units, average, rank, attendance } = profile;

  // Every assessment with this student's score, grouped by unit.
  const assessments = student.classId
    ? await db.assessment.findMany({
        where: { classSubject: { classId: student.classId }, ...(term ? { termId: term.id } : {}) },
        include: { marks: { where: { studentId } } },
        orderBy: { createdAt: "asc" },
      })
    : [];

  const overall = gradeFor(average);
  const columns = [...new Set(assessments.map((a) => a.name))];

  return (
    <>
      <PageHeader title="Report card" subtitle={term ? `${term.name} · ${term.year.name} · provisional, term in progress` : "No term"} action={<PrintButton />} />

      <section className="card report mb-4 p-5">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-5 gap-y-1 text-[13px]">
            <dt className="muted">Student</dt>
            <dd className="m-0 font-semibold">{student.user.name}</dd>
            <dt className="muted">Admission no.</dt>
            <dd className="m-0">
              <code>{student.admissionNo}</code>
            </dd>
            <dt className="muted">Class</dt>
            <dd className="m-0">{student.class?.name ?? "-"}</dd>
            <dt className="muted">Class teacher</dt>
            <dd className="m-0">{student.class?.classTeacher?.user.name ?? "-"}</dd>
            <dt className="muted">Issued</dt>
            <dd className="m-0">{formatDate(new Date())}</dd>
          </dl>
          <div className="report-score">
            <span className="stat-label">Mean grade</span>
            <span className="report-grade">{overall?.grade ?? "-"}</span>
            <span className="num ink-2">{formatPercent(average, "--")}</span>
            <span className="muted text-[12px]">{rank ? `Position ${rank.position} of ${rank.outOf}` : ""}</span>
          </div>
        </div>
      </section>

      <Card title="Units" bodyClass="">
        {units.length === 0 ? (
          <div className="p-4">
            <Empty>No units.</Empty>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Unit</th>
                  {columns.map((n) => (
                    <th key={n} className="num">
                      {n}
                    </th>
                  ))}
                  <th className="num">Marked</th>
                  <th className="num">Total</th>
                  <th className="num">Trend</th>
                  <th>Remark</th>
                </tr>
              </thead>
              <tbody>
                {units.map((u) => {
                  const unitAssessments = assessments.filter((a) => a.classSubjectId === u.classSubjectId);
                  return (
                    <tr key={u.classSubjectId}>
                      <td>
                        <span className="font-semibold">{u.subject}</span>
                        <div className="muted text-[12px]">
                          {u.code} &middot; {u.teacher ?? "unassigned"}
                        </div>
                      </td>
                      {columns.map((name) => {
                        const a = unitAssessments.find((x) => x.name === name);
                        const mark = a?.marks[0];
                        return (
                          <td key={name} className="num">
                            {!a ? (
                              <span className="muted">-</span>
                            ) : mark?.score !== null && mark?.score !== undefined ? (
                              <>
                                {mark.score}
                                <span className="muted">/{a.maxScore}</span>
                              </>
                            ) : a.dueOn && a.dueOn < new Date() && mark ? (
                              <span className="tone-critical font-semibold" title="Not handed in">
                                missing
                              </span>
                            ) : (
                              <span className="muted">pending</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="num muted">{round1(u.gradedWeight)}%</td>
                      <td className="num">
                        <GradePill grade={u.grade} percent={u.percent} />
                      </td>
                      <td className="num">
                        <Trend delta={u.trend} />
                      </td>
                      <td className="ink-2 whitespace-nowrap">{gradeFor(u.percent)?.remark ?? "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Attendance this term">
          <dl className="m-0 grid grid-cols-4 gap-3 text-center">
            {(
              [
                ["Present", attendance.counts.PRESENT],
                ["Late", attendance.counts.LATE],
                ["Absent", attendance.counts.ABSENT],
                ["Excused", attendance.counts.EXCUSED],
              ] as const
            ).map(([label, n]) => (
              <div key={label}>
                <dd className="num m-0 text-[20px] font-semibold">{n}</dd>
                <dt className="muted text-[12px]">{label}</dt>
              </div>
            ))}
          </dl>
          <p className="ink-2 m-0 mt-3 text-[13px]">
            Attendance rate <strong>{formatPercent(attendance.rate, "--")}</strong> over {attendance.total} sessions.
          </p>
        </Card>
        <Card title="Grading scale">
          <div className="flex flex-wrap gap-1.5">
            {GRADE_BANDS.map((b) => (
              <span key={b.grade} className="badge" title={b.remark}>
                <strong style={{ color: "var(--ink)" }}>{b.grade}</strong> {b.floor}+
              </span>
            ))}
          </div>
          <p className="muted m-0 mt-3 text-[12px]">
            Totals are weighted over the assessments marked so far. Pass mark is {PASS_MARK}%. A missing piece of work counts as not handed in, not as zero.
          </p>
        </Card>
      </div>
    </>
  );
}
