import Link from "next/link";
import { notFound } from "next/navigation";
import { studentProfile, allClasses, feeStatement } from "@/lib/queries";
import { AttendanceBadge, Card, Empty, GradePill, PageHeader, StatTile, Trend } from "@/components/ui";
import { formatKsh, formatPercent, PASS_MARK, round1 } from "@/lib/grading";
import { formatDate } from "@/lib/dates";
import type { AttendanceStatus } from "@/lib/enums";
import { StudentEditForm } from "./edit-form";

export const dynamic = "force-dynamic";

export default async function StudentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [profile, classes, fees] = await Promise.all([studentProfile(id), allClasses(), feeStatement(id)]);
  if (!profile) notFound();

  const { student, term, units, average, rank, attendance, weekAbsences, pendingWork, recentMarks, recentAttendance } = profile;
  const primaryGuardian = student.guardians[0]?.guardian ?? null;

  return (
    <>
      <PageHeader
        title={student.user.name}
        subtitle={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <code>{student.admissionNo}</code>
            <span className="muted">&middot;</span>
            <span>{student.class?.name ?? "No class assigned"}</span>
            <span className="muted">&middot;</span>
            <span className="badge">{student.status.charAt(0) + student.status.slice(1).toLowerCase()}</span>
          </span>
        }
        action={
          <Link href="/admin/students" className="btn">
            Back to students
          </Link>
        }
      />

      {weekAbsences >= 3 ? (
        <div className="alert alert-critical mb-4" role="alert">
          <span aria-hidden style={{ color: "var(--critical)" }}>
            &#9888;
          </span>
          <span>
            <strong>Attendance alert.</strong> {student.user.name.split(" ")[0]} has missed {weekAbsences} classes this week.
          </span>
        </div>
      ) : null}

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Attendance"
          value={formatPercent(attendance.rate, "--")}
          hint={`${attendance.counts.ABSENT} absent · ${attendance.counts.LATE} late`}
          tone={attendance.rate === null ? "neutral" : attendance.rate >= 90 ? "good" : attendance.rate >= 75 ? "warning" : "critical"}
        />
        <StatTile
          label="Average"
          value={formatPercent(average, "--")}
          hint={term ? `${term.name} to date` : "no term"}
          tone={average === null ? "neutral" : average >= PASS_MARK ? "good" : "critical"}
        />
        <StatTile
          label="Class position"
          value={rank ? `${rank.position}/${rank.outOf}` : "--"}
          hint={student.class?.name ?? "no class"}
        />
        <StatTile
          label="Missing work"
          value={pendingWork}
          hint={pendingWork === 0 ? "nothing overdue" : "past the due date"}
          tone={pendingWork === 0 ? "neutral" : "warning"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="flex flex-col gap-4">
          <Card title={`Academic performance${term ? ` - ${term.name}` : ""}`} bodyClass="">
            {units.length === 0 ? (
              <div className="p-4">
                <Empty>No units for this student yet.</Empty>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Unit</th>
                      <th>Teacher</th>
                      <th className="num">Marked</th>
                      <th className="num">Score</th>
                      <th className="num">Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {units.map((unit) => (
                      <tr key={unit.classSubjectId}>
                        <td>
                          <span className="font-semibold">{unit.subject}</span>
                          <div className="muted text-[12px]">{unit.code}</div>
                        </td>
                        <td className="whitespace-nowrap">{unit.teacher ?? <span className="muted">unassigned</span>}</td>
                        <td className="num muted whitespace-nowrap">
                          {round1(unit.gradedWeight)}/{round1(unit.totalWeight)}%
                        </td>
                        <td className="num">
                          <GradePill grade={unit.grade} percent={unit.percent} />
                        </td>
                        <td className="num">
                          <Trend delta={unit.trend} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card title="Recent marks" bodyClass="">
            {recentMarks.length === 0 ? (
              <div className="p-4">
                <Empty>No marks recorded yet.</Empty>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Assessment</th>
                      <th>Unit</th>
                      <th className="num">Score</th>
                      <th className="num">Out of</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentMarks.map((mark) => (
                      <tr key={mark.id}>
                        <td>{mark.assessment.name}</td>
                        <td>{mark.assessment.classSubject.subject.name}</td>
                        <td className="num font-semibold">{mark.score}</td>
                        <td className="num muted">{mark.assessment.maxScore}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card title="Attendance history - latest sessions" bodyClass="">
            {recentAttendance.length === 0 ? (
              <div className="p-4">
                <Empty>No attendance recorded yet.</Empty>
              </div>
            ) : (
              <div className="table-wrap">
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
                    {recentAttendance.map((record) => (
                      <tr key={record.id}>
                        <td className="whitespace-nowrap">{formatDate(record.session.date)}</td>
                        <td>{record.session.classSubject.subject.name}</td>
                        <td className="muted">P{record.session.period}</td>
                        <td>
                          <AttendanceBadge status={record.status as AttendanceStatus} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card title="Contact">
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
              <dt className="muted">Email</dt>
              <dd className="m-0 truncate">{student.user.email}</dd>
              <dt className="muted">Phone</dt>
              <dd className="m-0">{student.user.phone ?? "-"}</dd>
              <dt className="muted">Home area</dt>
              <dd className="m-0">{student.address ?? "-"}</dd>
              <dt className="muted">Date of birth</dt>
              <dd className="m-0">{formatDate(student.dateOfBirth)}</dd>
              <dt className="muted">Admitted</dt>
              <dd className="m-0">{formatDate(student.admittedOn)}</dd>
              <dt className="muted">Class teacher</dt>
              <dd className="m-0">{student.class?.classTeacher?.user.name ?? "-"}</dd>
            </dl>
          </Card>

          <Card
            title="Fees"
            action={
              <Link href="/admin/fees" className="btn btn-sm">
                Record payment
              </Link>
            }
          >
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
              <dt className="muted">Billed</dt>
              <dd className="num m-0">{formatKsh(fees.billed)}</dd>
              <dt className="muted">Paid</dt>
              <dd className="num m-0">{formatKsh(fees.paid)}</dd>
              <dt className="muted">Balance</dt>
              <dd className={`num m-0 font-semibold ${fees.balance > 0 ? "tone-critical" : "tone-good"}`}>{fees.balance > 0 ? formatKsh(fees.balance) : "✓ cleared"}</dd>
            </dl>
            {fees.payments.length > 0 ? (
              <ul className="m-0 mt-3 list-none border-t p-0 pt-2 text-[12.5px]" style={{ borderColor: "var(--line)" }}>
                {fees.payments.slice(0, 4).map((p) => (
                  <li key={p.id} className="flex justify-between gap-3 py-0.5">
                    <span className="muted">
                      {formatDate(p.paidOn)} &middot; {p.method === "MPESA" ? "M-Pesa" : p.method.charAt(0) + p.method.slice(1).toLowerCase()}
                    </span>
                    <span className="num">{formatKsh(p.amount)}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </Card>

          <Card title="Parent / guardian">
            {student.guardians.length === 0 ? (
              <Empty>No guardian on record.</Empty>
            ) : (
              <ul className="m-0 flex list-none flex-col gap-3 p-0">
                {student.guardians.map(({ guardian, isPrimary }) => (
                  <li key={guardian.id}>
                    <p className="m-0 font-semibold">
                      {guardian.name}
                      {isPrimary ? <span className="badge ml-2">primary</span> : null}
                    </p>
                    <p className="ink-2 m-0 text-[13px]">
                      {guardian.relationship.charAt(0) + guardian.relationship.slice(1).toLowerCase()} &middot; {guardian.phone}
                    </p>
                    {guardian.email ? <p className="muted m-0 truncate text-[12.5px]">{guardian.email}</p> : null}
                  </li>
                ))}
              </ul>
            )}
            {primaryGuardian ? (
              <p className="muted m-0 mt-3 border-t pt-3 text-[12px]" style={{ borderColor: "var(--line)" }}>
                Parent sign-in and SMS notifications arrive in V2.
              </p>
            ) : null}
          </Card>

          <Card title="Record">
            <StudentEditForm
              student={{
                id: student.id,
                classId: student.classId,
                status: student.status,
                phone: student.user.phone,
                address: student.address,
                notes: student.notes,
              }}
              classes={classes.map((c) => ({ id: c.id, name: c.name }))}
            />
          </Card>
        </div>
      </div>
    </>
  );
}
