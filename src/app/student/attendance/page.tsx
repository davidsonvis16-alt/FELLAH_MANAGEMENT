import { db } from "@/lib/db";
import { currentStudent } from "@/lib/student";
import { attendanceSummary, getCurrentTerm } from "@/lib/queries";
import { AttendanceBadge, Bar, Card, Empty, PageHeader, StatTile } from "@/components/ui";
import { formatDate } from "@/lib/dates";
import { formatPercent, round1 } from "@/lib/grading";
import type { AttendanceStatus } from "@/lib/enums";

export const dynamic = "force-dynamic";

export default async function StudentAttendance() {
  const { studentId } = await currentStudent();
  const term = await getCurrentTerm();
  const where = { studentId, ...(term ? { session: { termId: term.id } } : {}) };
  const [summary, records] = await Promise.all([
    attendanceSummary(where),
    db.attendance.findMany({
      where,
      include: { session: { include: { classSubject: { include: { subject: true } } } } },
      orderBy: [{ session: { date: "desc" } }, { session: { period: "desc" } }],
    }),
  ]);

  // Rate per unit: shows which class is being skipped, not just how often.
  const byUnit = new Map<string, { name: string; expected: number; attended: number }>();
  for (const r of records) {
    const key = r.session.classSubjectId;
    const entry = byUnit.get(key) ?? { name: r.session.classSubject.subject.name, expected: 0, attended: 0 };
    if (r.status !== "EXCUSED") entry.expected += 1;
    if (r.status === "PRESENT" || r.status === "LATE") entry.attended += 1;
    byUnit.set(key, entry);
  }

  return (
    <>
      <PageHeader title="Attendance" subtitle={term ? `${term.name} · ${term.year.name}` : ""} />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Rate" value={formatPercent(summary.rate, "--")} tone={summary.rate === null ? "neutral" : summary.rate >= 90 ? "good" : summary.rate >= 75 ? "warning" : "critical"} />
        <StatTile label="Sessions" value={summary.total} />
        <StatTile label="Absent" value={summary.counts.ABSENT} tone={summary.counts.ABSENT > 0 ? "critical" : "neutral"} />
        <StatTile label="Late" value={summary.counts.LATE} tone={summary.counts.LATE > 0 ? "warning" : "neutral"} />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <Card title="By unit">
          {byUnit.size === 0 ? (
            <Empty>No attendance yet.</Empty>
          ) : (
            [...byUnit.entries()]
              .sort((a, b) => a[1].name.localeCompare(b[1].name))
              .map(([key, u]) => <Bar key={key} label={u.name} value={u.expected ? round1((u.attended / u.expected) * 100) : null} series={u.expected && u.attended / u.expected < 0.75 ? 2 : 1} />)
          )}
        </Card>
        <Card title="History" bodyClass="">
          {records.length === 0 ? (
            <div className="p-4">
              <Empty>No sessions recorded.</Empty>
            </div>
          ) : (
            <div className="table-wrap max-h-[560px] overflow-y-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Unit</th>
                    <th>Period</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.id}>
                      <td className="whitespace-nowrap">{formatDate(r.session.date)}</td>
                      <td>{r.session.classSubject.subject.name}</td>
                      <td className="muted">P{r.session.period}</td>
                      <td>
                        <AttendanceBadge status={r.status as AttendanceStatus} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
