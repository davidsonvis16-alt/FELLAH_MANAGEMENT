import Link from "next/link";
import { allClasses, studentListRows } from "@/lib/queries";
import { Card, Empty, PageHeader } from "@/components/ui";
import { formatPercent, PASS_MARK } from "@/lib/grading";
import { STUDENT_STATUSES } from "@/lib/enums";

export const dynamic = "force-dynamic";

function toneFor(rate: number | null) {
  if (rate === null) return "tone-neutral";
  if (rate >= 90) return "tone-good";
  if (rate >= 75) return "tone-warning";
  return "tone-critical";
}

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; classId?: string; status?: string }>;
}) {
  const params = await searchParams;
  const [rows, classes] = await Promise.all([
    studentListRows({ search: params.q, classId: params.classId, status: params.status }),
    allClasses(),
  ]);

  return (
    <>
      <PageHeader
        title="Students"
        subtitle={`${rows.length} ${rows.length === 1 ? "record" : "records"}`}
        action={
          <Link href="/admin/students/new" className="btn btn-primary">
            Admit student
          </Link>
        }
      />

      <form method="get" className="card mb-4 flex flex-wrap items-end gap-3 p-3">
        <div className="min-w-[200px] flex-1">
          <label className="label" htmlFor="q">
            Search
          </label>
          <input id="q" name="q" defaultValue={params.q ?? ""} placeholder="Name, admission number or email" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="classId">
            Class
          </label>
          <select id="classId" name="classId" defaultValue={params.classId ?? ""} className="select">
            <option value="">All classes</option>
            {classes.map((klass) => (
              <option key={klass.id} value={klass.id}>
                {klass.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="status">
            Status
          </label>
          <select id="status" name="status" defaultValue={params.status ?? ""} className="select">
            <option value="">Any status</option>
            {STUDENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status.charAt(0) + status.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn">
          Apply
        </button>
        <Link href="/admin/students" className="btn btn-sm">
          Reset
        </Link>
      </form>

      <Card bodyClass="">
        {rows.length === 0 ? (
          <div className="p-4">
            <Empty>No students match those filters.</Empty>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Admission no.</th>
                  <th>Name</th>
                  <th>Class</th>
                  <th className="num">Attendance</th>
                  <th className="num">Average</th>
                  <th className="num">Missing work</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="whitespace-nowrap">
                      <code className="text-[12.5px]">{row.admissionNo}</code>
                    </td>
                    <td>
                      <Link href={`/admin/students/${row.id}`} className="font-semibold underline-offset-2 hover:underline">
                        {row.name}
                      </Link>
                      <div className="muted text-[12px]">{row.email}</div>
                    </td>
                    <td className="whitespace-nowrap">{row.className ?? <span className="muted">unassigned</span>}</td>
                    <td className="num">
                      <span className={toneFor(row.attendanceRate)}>{formatPercent(row.attendanceRate, "--")}</span>
                    </td>
                    <td className="num">
                      <span className={row.average !== null && row.average < PASS_MARK ? "tone-critical" : undefined}>
                        {formatPercent(row.average, "--")}
                      </span>
                    </td>
                    <td className="num">
                      {row.missingWork > 0 ? <span className="tone-warning font-semibold">{row.missingWork}</span> : <span className="muted">0</span>}
                    </td>
                    <td>
                      <span className="badge">{row.status.charAt(0) + row.status.slice(1).toLowerCase()}</span>
                    </td>
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
