import Link from "next/link";
import { attendanceAlerts, dashboardStats, feeBalances, noticesFor, subjectPerformance } from "@/lib/queries";
import { Bar, Card, Empty, StatTile } from "@/components/ui";
import { formatKsh, formatPercent, round1 } from "@/lib/grading";
import { NoticeBoard } from "@/components/notices";
import { relativeTime } from "@/lib/dates";
import { HarambeeMeter, WelcomeBanner } from "@/components/kenya";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [stats, session] = await Promise.all([dashboardStats(), getSession()]);
  const [performance, alerts, fees, notices] = await Promise.all([
    stats.term ? subjectPerformance(stats.term.id) : Promise.resolve([]),
    attendanceAlerts(3, 5),
    feeBalances(stats.term?.id),
    noticesFor(null, 3),
  ]);
  const billed = fees.reduce((s, r) => s + r.billed, 0);
  const collected = fees.reduce((s, r) => s + r.paid, 0);

  const { todayCounts } = stats;
  const markedHint =
    stats.expectedSessions > 0
      ? `${stats.sessionsMarked} of ${stats.expectedSessions} timetabled classes marked`
      : "No classes timetabled today";

  return (
    <>
      <WelcomeBanner name={session?.name.split(" ")[0] ?? "Mwalimu Mkuu"} kicker={stats.term ? `${stats.term.name} · ${stats.term.year.name}` : "No academic term set"} />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatTile label="Active students" value={stats.studentCount} hint={`${stats.classCount} classes`} />
        <StatTile label="Teachers" value={stats.teacherCount} hint={`${stats.subjectCount} subjects offered`} />
        <StatTile
          label="Attendance today"
          value={formatPercent(stats.attendanceToday, "--")}
          hint={markedHint}
          tone={stats.attendanceToday === null ? "neutral" : stats.attendanceToday >= 90 ? "good" : stats.attendanceToday >= 75 ? "warning" : "critical"}
        />
        <StatTile
          label="Attendance this term"
          value={formatPercent(stats.termAttendance?.rate ?? null, "--")}
          hint={`${stats.termAttendance?.total ?? 0} records`}
        />
        <StatTile
          label="Fees collected"
          value={billed > 0 ? `${round1((collected / billed) * 100)}%` : "--"}
          hint={`${formatKsh(billed - collected)} outstanding`}
          tone={billed > 0 && collected / billed >= 0.8 ? "good" : "warning"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card title="Average mark by subject - this term">
          {performance.length === 0 ? (
            <Empty>No marks entered yet this term.</Empty>
          ) : (
            <>
              {performance.map((row) => (
                <Bar key={row.code} label={`${row.subject} (${row.code})`} value={row.average} />
              ))}
              <p className="muted m-0 mt-3 text-[12px]">
                Weighted over the assessments marked so far. Hover a row for the exact value.
              </p>
            </>
          )}
        </Card>

        <div className="flex flex-col gap-4">
          <Card
            title="Harambee · Fee drive"
            action={
              <Link href="/admin/fees" className="btn btn-sm">
                Open fees
              </Link>
            }
          >
            {billed === 0 ? (
              <Empty>No fees billed this term.</Empty>
            ) : (
              <HarambeeMeter
                collected={collected}
                billed={billed}
                formatted={{ collected: formatKsh(collected), billed: formatKsh(billed), outstanding: formatKsh(billed - collected) }}
              />
            )}
          </Card>

          <Card title="Today's attendance">
            {todayCounts.PRESENT + todayCounts.ABSENT + todayCounts.LATE + todayCounts.EXCUSED === 0 ? (
              <Empty>Nothing marked today yet.</Empty>
            ) : (
              <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-2">
                {(
                  [
                    ["Present", todayCounts.PRESENT, "good"],
                    ["Late", todayCounts.LATE, "warning"],
                    ["Absent", todayCounts.ABSENT, "critical"],
                    ["Excused", todayCounts.EXCUSED, "neutral"],
                  ] as const
                ).map(([label, value, tone]) => (
                  <div key={label} className="flex items-center justify-between gap-2">
                    <dt className={`badge tone-${tone}`}>
                      <span className="badge-dot" aria-hidden />
                      <span style={{ color: "var(--ink-2)" }}>{label}</span>
                    </dt>
                    <dd className="num m-0 font-semibold">{value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </Card>

          <Card title="Attendance alerts - this week">
            {alerts.length === 0 ? (
              <Empty>No student has missed 3 or more classes this week.</Empty>
            ) : (
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {alerts.map((alert) => (
                  <li key={alert.studentId} className="alert alert-warning">
                    <span aria-hidden style={{ color: "var(--warning)" }}>
                      &#9888;
                    </span>
                    <span className="min-w-0">
                      <Link href={`/admin/students/${alert.studentId}`} className="font-semibold underline-offset-2 hover:underline">
                        {alert.name}
                      </Link>
                      <span className="muted"> &middot; {alert.className ?? "no class"}</span>
                      <br />
                      <span className="ink-2">Missed {alert.absences} classes this week</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <NoticeBoard
          notices={notices}
          action={
            <Link href="/admin/notices" className="btn btn-sm">
              Manage
            </Link>
          }
        />
        <Card title="Recent activity" bodyClass="">
          {stats.activity.length === 0 ? (
            <div className="p-4">
              <Empty>Nothing yet.</Empty>
            </div>
          ) : (
            <ul className="m-0 list-none p-0">
              {stats.activity.map((entry) => (
                <li key={entry.id} className="flex items-baseline justify-between gap-4 border-b px-4 py-2.5 last:border-b-0" style={{ borderColor: "var(--grid)" }}>
                  <span className="min-w-0">
                    <span className="block truncate">{entry.summary}</span>
                    <span className="muted text-[12px]">{entry.actor?.name ?? "System"}</span>
                  </span>
                  <span className="muted shrink-0 text-[12px]">{relativeTime(entry.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
