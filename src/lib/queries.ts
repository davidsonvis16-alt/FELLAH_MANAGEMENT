import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { todayDateOnly, startOfWeek } from "./dates";
import { computeUnit, overallAverage, positionOf, round1, type ScoredMark } from "./grading";
import type { AttendanceStatus } from "./enums";

// ---------------------------------------------------------------- calendar

export async function getCurrentTerm() {
  return (
    (await db.term.findFirst({ where: { isCurrent: true }, include: { year: true } })) ??
    (await db.term.findFirst({ orderBy: { startsOn: "desc" }, include: { year: true } }))
  );
}

// ---------------------------------------------------------------- attendance

export type AttendanceSummary = {
  total: number;
  counts: Record<AttendanceStatus, number>;
  /** Present + Late over all sessions that expected the student (Excused excluded). */
  rate: number | null;
};

export async function attendanceSummary(where: Prisma.AttendanceWhereInput): Promise<AttendanceSummary> {
  const rows = await db.attendance.groupBy({ by: ["status"], where, _count: { _all: true } });
  const counts: Record<AttendanceStatus, number> = { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0 };
  for (const row of rows) {
    if (row.status in counts) counts[row.status as AttendanceStatus] = row._count._all;
  }
  const total = counts.PRESENT + counts.ABSENT + counts.LATE + counts.EXCUSED;
  const expected = total - counts.EXCUSED;
  return {
    total,
    counts,
    rate: expected > 0 ? round1(((counts.PRESENT + counts.LATE) / expected) * 100) : null,
  };
}

/** Absences this week, per student - the input to the V3 early-warning monitor. */
export async function absencesThisWeek(studentId: string): Promise<number> {
  return db.attendance.count({
    where: {
      studentId,
      status: "ABSENT",
      session: { date: { gte: startOfWeek() } },
    },
  });
}

// ---------------------------------------------------------------- academic

export type UnitBreakdown = {
  classSubjectId: string;
  subject: string;
  code: string;
  teacher: string | null;
  percent: number | null;
  grade: string | null;
  gradedWeight: number;
  totalWeight: number;
  missingCount: number;
  /** Change between the two most recently marked assessments, in percentage points. */
  trend: number | null;
};

export async function unitBreakdown(studentId: string, termId: string): Promise<UnitBreakdown[]> {
  const student = await db.student.findUnique({ where: { id: studentId }, select: { classId: true } });
  if (!student?.classId) return [];

  const classSubjects = await db.classSubject.findMany({
    where: { classId: student.classId },
    include: {
      subject: true,
      teacher: { include: { user: { select: { name: true } } } },
      assessments: {
        where: { termId },
        orderBy: { createdAt: "asc" },
        include: { marks: { where: { studentId } } },
      },
    },
    orderBy: { subject: { name: "asc" } },
  });

  return classSubjects.map((cs) => {
    const marks: ScoredMark[] = cs.assessments.map((a) => ({
      score: a.marks[0]?.score ?? null,
      assessment: { id: a.id, maxScore: a.maxScore, weight: a.weight, dueOn: a.dueOn },
    }));
    const result = computeUnit(marks, cs.assessments);

    const scoredSeries = cs.assessments
      .filter((a) => a.marks[0]?.score !== null && a.marks[0]?.score !== undefined && a.maxScore > 0)
      .map((a) => ((a.marks[0]!.score as number) / a.maxScore) * 100);
    const trend =
      scoredSeries.length >= 2
        ? round1(scoredSeries[scoredSeries.length - 1] - scoredSeries[scoredSeries.length - 2])
        : null;

    return {
      classSubjectId: cs.id,
      subject: cs.subject.name,
      code: cs.subject.code,
      teacher: cs.teacher?.user.name ?? null,
      percent: result.percent,
      grade: result.grade,
      gradedWeight: result.gradedWeight,
      totalWeight: result.totalWeight,
      missingCount: result.missingCount,
      trend,
    };
  });
}

/** Weighted average per student in a class, used for ranking. */
export async function classAverages(classId: string, termId: string): Promise<Map<string, number | null>> {
  const students = await db.student.findMany({
    where: { classId, status: "ACTIVE" },
    select: { id: true },
  });
  const assessments = await db.assessment.findMany({
    where: { termId, classSubject: { classId } },
    select: {
      id: true,
      maxScore: true,
      weight: true,
      dueOn: true,
      classSubjectId: true,
      marks: { select: { studentId: true, score: true } },
    },
  });

  const byUnit = new Map<string, typeof assessments>();
  for (const a of assessments) {
    const list = byUnit.get(a.classSubjectId) ?? [];
    list.push(a);
    byUnit.set(a.classSubjectId, list);
  }

  const out = new Map<string, number | null>();
  for (const student of students) {
    const units: { percent: number | null }[] = [];
    for (const list of byUnit.values()) {
      const marks: ScoredMark[] = list.map((a) => ({
        score: a.marks.find((m) => m.studentId === student.id)?.score ?? null,
        assessment: { id: a.id, maxScore: a.maxScore, weight: a.weight, dueOn: a.dueOn },
      }));
      units.push(computeUnit(marks, list));
    }
    out.set(student.id, overallAverage(units));
  }
  return out;
}

// ---------------------------------------------------------------- student 360

export async function studentProfile(studentId: string) {
  const term = await getCurrentTerm();
  const student = await db.student.findUnique({
    where: { id: studentId },
    include: {
      user: true,
      class: { include: { classTeacher: { include: { user: { select: { name: true } } } } } },
      guardians: { include: { guardian: true }, orderBy: { isPrimary: "desc" } },
    },
  });
  if (!student) return null;

  const units = term ? await unitBreakdown(student.id, term.id) : [];
  const average = overallAverage(units);

  let rank: { position: number; outOf: number } | null = null;
  if (student.classId && term) {
    const averages = await classAverages(student.classId, term.id);
    rank = positionOf(average, [...averages.values()]);
  }

  const [attendance, weekAbsences, recentMarks, recentAttendance] = await Promise.all([
    attendanceSummary({ studentId: student.id, ...(term ? { session: { termId: term.id } } : {}) }),
    absencesThisWeek(student.id),
    db.mark.findMany({
      where: { studentId: student.id, score: { not: null } },
      orderBy: { updatedAt: "desc" },
      take: 6,
      include: { assessment: { include: { classSubject: { include: { subject: true } } } } },
    }),
    db.attendance.findMany({
      where: { studentId: student.id },
      orderBy: { session: { date: "desc" } },
      take: 12,
      include: { session: { include: { classSubject: { include: { subject: true } } } } },
    }),
  ]);

  const pendingWork = units.reduce((sum, u) => sum + u.missingCount, 0);

  return { student, term, units, average, rank, attendance, weekAbsences, pendingWork, recentMarks, recentAttendance };
}

// ---------------------------------------------------------------- admin dashboard

export async function dashboardStats() {
  const term = await getCurrentTerm();
  const today = todayDateOnly();

  const [studentCount, teacherCount, classCount, subjectCount, sessionsToday, activity] = await Promise.all([
    db.student.count({ where: { status: "ACTIVE" } }),
    db.teacher.count(),
    db.class.count(),
    db.subject.count(),
    db.attendanceSession.findMany({
      where: { date: today },
      include: {
        classSubject: { include: { subject: true, class: true } },
        records: { select: { status: true } },
      },
    }),
    db.activityLog.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { actor: { select: { name: true, role: true } } } }),
  ]);

  const todayCounts = { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0 };
  for (const session of sessionsToday) {
    for (const record of session.records) {
      if (record.status in todayCounts) todayCounts[record.status as AttendanceStatus] += 1;
    }
  }
  const expectedToday = todayCounts.PRESENT + todayCounts.ABSENT + todayCounts.LATE;
  const attendanceToday = expectedToday > 0 ? round1(((todayCounts.PRESENT + todayCounts.LATE) / expectedToday) * 100) : null;

  // Expected sessions today, from the timetable, so "3 of 7 classes marked" is answerable.
  const weekday = new Date().getUTCDay();
  const expectedSessions = weekday >= 1 && weekday <= 5 ? await db.timetableSlot.count({ where: { dayOfWeek: weekday } }) : 0;

  const termAttendance = term ? await attendanceSummary({ session: { termId: term.id } }) : null;

  return {
    term,
    studentCount,
    teacherCount,
    classCount,
    subjectCount,
    attendanceToday,
    todayCounts,
    sessionsMarked: sessionsToday.length,
    expectedSessions,
    termAttendance,
    activity,
  };
}

/** Mean mark per subject across the school, for the dashboard performance panel. */
export async function subjectPerformance(termId: string) {
  const subjects = await db.subject.findMany({
    include: {
      classSubjects: {
        include: {
          assessments: {
            where: { termId },
            select: { maxScore: true, weight: true, dueOn: true, id: true, marks: { select: { score: true, studentId: true } } },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return subjects
    .map((subject) => {
      const percents: number[] = [];
      for (const cs of subject.classSubjects) {
        const studentIds = new Set(cs.assessments.flatMap((a) => a.marks.map((m) => m.studentId)));
        for (const studentId of studentIds) {
          const marks: ScoredMark[] = cs.assessments.map((a) => ({
            score: a.marks.find((m) => m.studentId === studentId)?.score ?? null,
            assessment: { id: a.id, maxScore: a.maxScore, weight: a.weight, dueOn: a.dueOn },
          }));
          const unit = computeUnit(marks, cs.assessments);
          if (unit.percent !== null) percents.push(unit.percent);
        }
      }
      return {
        subject: subject.name,
        code: subject.code,
        average: percents.length ? round1(percents.reduce((a, b) => a + b, 0) / percents.length) : null,
        students: percents.length,
      };
    })
    .filter((row) => row.average !== null)
    .sort((a, b) => (b.average ?? 0) - (a.average ?? 0));
}

// ---------------------------------------------------------------- alerts
//
// The V1 slice of the early-warning idea: absences are countable per teaching
// session, so "missed 4 classes this week" is a query, not a guess.

export type AttendanceAlert = {
  studentId: string;
  name: string;
  admissionNo: string;
  className: string | null;
  absences: number;
};

export async function attendanceAlerts(minAbsences = 3, take = 6): Promise<AttendanceAlert[]> {
  const grouped = await db.attendance.groupBy({
    by: ["studentId"],
    where: { status: "ABSENT", session: { date: { gte: startOfWeek() } } },
    _count: { _all: true },
    having: { studentId: { _count: { gte: minAbsences } } },
    orderBy: { _count: { studentId: "desc" } },
    take,
  });
  if (grouped.length === 0) return [];

  const students = await db.student.findMany({
    where: { id: { in: grouped.map((g) => g.studentId) } },
    include: { user: { select: { name: true } }, class: { select: { name: true } } },
  });

  return grouped
    .map((group) => {
      const student = students.find((s) => s.id === group.studentId);
      if (!student) return null;
      return {
        studentId: student.id,
        name: student.user.name,
        admissionNo: student.admissionNo,
        className: student.class?.name ?? null,
        absences: group._count._all,
      };
    })
    .filter((row): row is AttendanceAlert => row !== null);
}

// ---------------------------------------------------------------- list views

export type StudentRow = {
  id: string;
  name: string;
  email: string;
  admissionNo: string;
  className: string | null;
  classCode: string | null;
  status: string;
  attendanceRate: number | null;
  average: number | null;
  missingWork: number;
};

/**
 * One list query plus two aggregate passes - not one query per student.
 */
export async function studentListRows(filters: {
  search?: string;
  classId?: string;
  status?: string;
}): Promise<StudentRow[]> {
  const term = await getCurrentTerm();
  const search = filters.search?.trim();

  const where: Prisma.StudentWhereInput = {
    ...(filters.classId ? { classId: filters.classId } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(search
      ? {
          OR: [
            { admissionNo: { contains: search } },
            { user: { name: { contains: search } } },
            { user: { email: { contains: search } } },
          ],
        }
      : {}),
  };

  const students = await db.student.findMany({
    where,
    include: { user: { select: { name: true, email: true } }, class: { select: { name: true, code: true } } },
    orderBy: { user: { name: "asc" } },
  });
  if (students.length === 0) return [];

  const ids = students.map((s) => s.id);

  const [attendanceRows, missingRows] = await Promise.all([
    db.attendance.groupBy({
      by: ["studentId", "status"],
      where: { studentId: { in: ids }, ...(term ? { session: { termId: term.id } } : {}) },
      _count: { _all: true },
    }),
    db.mark.groupBy({
      by: ["studentId"],
      where: {
        studentId: { in: ids },
        score: null,
        assessment: { dueOn: { lt: new Date() }, ...(term ? { termId: term.id } : {}) },
      },
      _count: { _all: true },
    }),
  ]);

  const tally = new Map<string, { present: number; late: number; expected: number }>();
  for (const row of attendanceRows) {
    const entry = tally.get(row.studentId) ?? { present: 0, late: 0, expected: 0 };
    if (row.status === "PRESENT") entry.present += row._count._all;
    if (row.status === "LATE") entry.late += row._count._all;
    if (row.status !== "EXCUSED") entry.expected += row._count._all;
    tally.set(row.studentId, entry);
  }

  const missing = new Map(missingRows.map((row) => [row.studentId, row._count._all]));

  const averages = new Map<string, number | null>();
  if (term) {
    const classIds = [...new Set(students.map((s) => s.classId).filter((id): id is string => Boolean(id)))];
    for (const classId of classIds) {
      for (const [studentId, average] of await classAverages(classId, term.id)) {
        averages.set(studentId, average);
      }
    }
  }

  return students.map((student) => {
    const entry = tally.get(student.id);
    return {
      id: student.id,
      name: student.user.name,
      email: student.user.email,
      admissionNo: student.admissionNo,
      className: student.class?.name ?? null,
      classCode: student.class?.code ?? null,
      status: student.status,
      attendanceRate: entry && entry.expected > 0 ? round1(((entry.present + entry.late) / entry.expected) * 100) : null,
      average: averages.get(student.id) ?? null,
      missingWork: missing.get(student.id) ?? 0,
    };
  });
}

export async function allClasses() {
  return db.class.findMany({
    orderBy: { code: "asc" },
    include: {
      classTeacher: { include: { user: { select: { name: true } } } },
      _count: { select: { students: true, classSubjects: true } },
    },
  });
}

// ---------------------------------------------------------------- fees

export type FeeStatement = {
  billed: number;
  paid: number;
  balance: number;
  invoices: { id: string; description: string; amount: number; paid: number; dueOn: Date; term: string }[];
  payments: { id: string; amount: number; method: string; reference: string | null; paidOn: Date; description: string }[];
};

export async function feeStatement(studentId: string): Promise<FeeStatement> {
  const invoices = await db.feeInvoice.findMany({
    where: { studentId },
    include: { payments: true, term: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });
  const billed = invoices.reduce((sum, i) => sum + i.amount, 0);
  const paid = invoices.reduce((sum, i) => sum + i.payments.reduce((s, p) => s + p.amount, 0), 0);
  return {
    billed,
    paid,
    balance: billed - paid,
    invoices: invoices.map((i) => ({
      id: i.id,
      description: i.description,
      amount: i.amount,
      paid: i.payments.reduce((s, p) => s + p.amount, 0),
      dueOn: i.dueOn,
      term: i.term.name,
    })),
    payments: invoices
      .flatMap((i) => i.payments.map((p) => ({ id: p.id, amount: p.amount, method: p.method, reference: p.reference, paidOn: p.paidOn, description: i.description })))
      .sort((a, b) => b.paidOn.getTime() - a.paidOn.getTime()),
  };
}

export type FeeRow = { studentId: string; name: string; admissionNo: string; className: string | null; billed: number; paid: number; balance: number };

/** Per-student billed/paid/balance in two aggregate queries. */
export async function feeBalances(termId?: string): Promise<FeeRow[]> {
  const [students, billed, paid] = await Promise.all([
    db.student.findMany({
      where: { status: "ACTIVE" },
      include: { user: { select: { name: true } }, class: { select: { code: true } } },
      orderBy: { user: { name: "asc" } },
    }),
    db.feeInvoice.groupBy({ by: ["studentId"], where: termId ? { termId } : {}, _sum: { amount: true } }),
    db.feePayment.findMany({
      where: termId ? { invoice: { termId } } : {},
      select: { amount: true, invoice: { select: { studentId: true } } },
    }),
  ]);
  const billedBy = new Map(billed.map((b) => [b.studentId, b._sum.amount ?? 0]));
  const paidBy = new Map<string, number>();
  for (const p of paid) paidBy.set(p.invoice.studentId, (paidBy.get(p.invoice.studentId) ?? 0) + p.amount);

  return students.map((s) => {
    const b = billedBy.get(s.id) ?? 0;
    const p = paidBy.get(s.id) ?? 0;
    return { studentId: s.id, name: s.user.name, admissionNo: s.admissionNo, className: s.class?.code ?? null, billed: b, paid: p, balance: b - p };
  });
}

// ---------------------------------------------------------------- notice board

export async function noticesFor(audience: "STAFF" | "STUDENTS" | null, take = 10) {
  return db.announcement.findMany({
    where: audience ? { audience: { in: ["ALL", audience] } } : {},
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    take,
    include: { author: { select: { name: true } } },
  });
}
