import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { currentStudent } from "@/lib/student";
import { feeStatement, noticesFor, studentProfile } from "@/lib/queries";
import { Bar, Card, Empty, GradePill, StatTile } from "@/components/ui";
import { WelcomeBanner } from "@/components/kenya";
import { NoticeBoard } from "@/components/notices";
import { formatKsh, formatPercent, PASS_MARK } from "@/lib/grading";
import { formatDate, isoWeekday, periodFor, todayDateOnly } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function StudentOverview() {
  const { studentId } = await currentStudent();
  const [profile, fees, notices] = await Promise.all([studentProfile(studentId), feeStatement(studentId), noticesFor("STUDENTS", 4)]);
  if (!profile) notFound();
  const { student, term, units, average, rank, attendance, weekAbsences, pendingWork } = profile;

  const today = todayDateOnly();
  const weekday = isoWeekday(today);
  const [todaySlots, upcoming] = await Promise.all([
    student.classId
      ? db.timetableSlot.findMany({
          where: { dayOfWeek: weekday, classSubject: { classId: student.classId } },
          include: { room: true, classSubject: { include: { subject: true } } },
          orderBy: { startsAt: "asc" },
        })
      : Promise.resolve([]),
    student.classId
      ? db.assessment.findMany({
          where: { classSubject: { classId: student.classId }, dueOn: { gte: today } },
          include: { classSubject: { include: { subject: true } } },
          orderBy: { dueOn: "asc" },
          take: 5,
        })
      : Promise.resolve([]),
  ]);

  return (
    <>
      <WelcomeBanner name={student.user.name.split(" ")[0]} kicker={term ? term.name : undefined}>
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          <span className="welcome-kicker">
            <code>{student.admissionNo}</code>
          </span>
          <span className="welcome-kicker">{student.class?.name ?? "No class assigned"}</span>
        </div>
      </WelcomeBanner>

      {weekAbsences >= 3 ? (
        <div className="alert alert-critical mb-4" role="alert">
          <span aria-hidden style={{ color: "var(--critical)" }}>
            &#9888;
          </span>
          <span>
            You have missed <strong>{weekAbsences} classes</strong> this week. Speak to your class teacher, {student.class?.classTeacher?.user.name ?? "your tutor"}.
          </span>
        </div>
      ) : null}

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatTile label="Average" value={formatPercent(average, "--")} tone={average === null ? "neutral" : average >= PASS_MARK ? "good" : "critical"} hint="term to date" />
        <StatTile label="Position" value={rank ? `${rank.position}/${rank.outOf}` : "--"} hint={student.class?.code} />
        <StatTile
          label="Attendance"
          value={formatPercent(attendance.rate, "--")}
          tone={attendance.rate === null ? "neutral" : attendance.rate >= 90 ? "good" : attendance.rate >= 75 ? "warning" : "critical"}
          hint={`${attendance.counts.ABSENT} absent`}
        />
        <StatTile label="Missing work" value={pendingWork} tone={pendingWork > 0 ? "warning" : "neutral"} hint="past due" />
        <StatTile label="Fee balance" value={fees.balance > 0 ? formatKsh(fees.balance) : "Cleared"} tone={fees.balance > 0 ? "warning" : "good"} hint={`of ${formatKsh(fees.billed)}`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-4">
          <Card
            title="My units"
            action={
              <Link href="/student/results" className="btn btn-sm">
                Report card
              </Link>
            }
          >
            {units.length === 0 ? (
              <Empty>No units yet.</Empty>
            ) : (
              units.map((u) => <Bar key={u.classSubjectId} label={`${u.subject}`} value={u.percent} right={<GradePill grade={u.grade} percent={u.percent} />} />)
            )}
          </Card>
          <NoticeBoard notices={notices} />
        </div>

        <div className="flex flex-col gap-4">
          <Card title="Today" bodyClass="">
            {todaySlots.length === 0 ? (
              <div className="p-4">
                <Empty>No classes today.</Empty>
              </div>
            ) : (
              <ul className="m-0 list-none p-0">
                {todaySlots.map((slot) => (
                  <li key={slot.id} className="flex items-baseline gap-3 border-b px-4 py-2.5 last:border-b-0" style={{ borderColor: "var(--grid)" }}>
                    <span className="muted num w-[86px] shrink-0 text-[12.5px]">
                      P{periodFor(slot.startsAt)} {slot.startsAt}
                    </span>
                    <span className="min-w-0">
                      <span className="font-semibold">{slot.classSubject.subject.name}</span>
                      <span className="muted"> &middot; {slot.room?.name ?? "TBA"}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Coming up" bodyClass="">
            {upcoming.length === 0 ? (
              <div className="p-4">
                <Empty>Nothing scheduled.</Empty>
              </div>
            ) : (
              <ul className="m-0 list-none p-0">
                {upcoming.map((a) => (
                  <li key={a.id} className="flex items-baseline justify-between gap-3 border-b px-4 py-2.5 last:border-b-0" style={{ borderColor: "var(--grid)" }}>
                    <span className="min-w-0">
                      <span className="font-semibold">{a.name}</span>
                      <span className="muted"> &middot; {a.classSubject.subject.code}</span>
                    </span>
                    <span className="muted shrink-0 text-[12.5px]">{formatDate(a.dueOn)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
