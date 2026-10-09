"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { logActivity, requireRole } from "@/lib/auth";
import { getCurrentTerm } from "@/lib/queries";
import { toDateOnly } from "@/lib/dates";
import { ASSESSMENT_KINDS, ATTENDANCE_STATUSES, type AttendanceStatus } from "@/lib/enums";
import type { ActionState } from "./students";

/** A teacher may only write to units assigned to them. */
async function ownUnit(classSubjectId: string) {
  const session = await requireRole("TEACHER");
  const unit = await db.classSubject.findUnique({
    where: { id: classSubjectId },
    include: { subject: true, class: true },
  });
  if (!unit || !session.profileId || unit.teacherId !== session.profileId) return null;
  return { session, unit };
}

// ---------------------------------------------------------------- attendance

const registerSchema = z.object({
  classSubjectId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date"),
  period: z.coerce.number().int().min(1).max(8),
});

export async function saveAttendance(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = registerSchema.safeParse({
    classSubjectId: formData.get("classSubjectId"),
    date: formData.get("date"),
    period: formData.get("period"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the register" };

  const owned = await ownUnit(parsed.data.classSubjectId);
  if (!owned) return { error: "You do not teach this unit" };
  const { session, unit } = owned;

  const date = toDateOnly(parsed.data.date);
  if (date.getTime() > toDateOnly(new Date()).getTime()) return { error: "You cannot mark a register for a future date" };

  const term = await getCurrentTerm();
  if (!term) return { error: "No academic term is set up" };

  const students = await db.student.findMany({ where: { classId: unit.classId, status: "ACTIVE" }, select: { id: true } });
  const records: { studentId: string; status: AttendanceStatus }[] = [];
  for (const student of students) {
    const status = formData.get(`status-${student.id}`);
    if (typeof status !== "string" || !(ATTENDANCE_STATUSES as readonly string[]).includes(status)) {
      return { error: "Mark every student before saving" };
    }
    records.push({ studentId: student.id, status: status as AttendanceStatus });
  }

  const register = await db.$transaction(async (tx) => {
    const saved = await tx.attendanceSession.upsert({
      where: { classSubjectId_date_period: { classSubjectId: unit.id, date, period: parsed.data.period } },
      create: { classSubjectId: unit.id, termId: term.id, date, period: parsed.data.period, takenById: session.profileId },
      update: { takenById: session.profileId },
    });
    for (const record of records) {
      await tx.attendance.upsert({
        where: { sessionId_studentId: { sessionId: saved.id, studentId: record.studentId } },
        create: { sessionId: saved.id, studentId: record.studentId, status: record.status },
        update: { status: record.status },
      });
    }
    return saved;
  });

  const absent = records.filter((r) => r.status === "ABSENT").length;
  await logActivity({
    actorId: session.userId,
    action: "attendance.saved",
    entity: "AttendanceSession",
    entityId: register.id,
    summary: `${session.name} marked attendance for ${unit.subject.name} (${unit.class.code}) - ${absent} absent`,
  });

  revalidatePath("/teacher");
  revalidatePath(`/teacher/units/${unit.id}`);
  revalidatePath("/admin");
  return { ok: true };
}

// ---------------------------------------------------------------- assessments

const assessmentSchema = z.object({
  classSubjectId: z.string().min(1),
  name: z.string().trim().min(2, "Name the assessment"),
  kind: z.enum(ASSESSMENT_KINDS),
  maxScore: z.coerce.number().positive("Out of must be more than 0").max(1000),
  weight: z.coerce.number().min(0).max(100, "Weight is a percentage, 0-100"),
  dueOn: z.string().optional(),
});

export async function createAssessment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const dueOn = formData.get("dueOn");
  const parsed = assessmentSchema.safeParse({
    classSubjectId: formData.get("classSubjectId"),
    name: formData.get("name"),
    kind: formData.get("kind"),
    maxScore: formData.get("maxScore"),
    weight: formData.get("weight"),
    dueOn: typeof dueOn === "string" && dueOn !== "" ? dueOn : undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form" };

  const owned = await ownUnit(parsed.data.classSubjectId);
  if (!owned) return { error: "You do not teach this unit" };
  const { session, unit } = owned;

  const term = await getCurrentTerm();
  if (!term) return { error: "No academic term is set up" };

  const existingWeight = await db.assessment.aggregate({
    where: { classSubjectId: unit.id, termId: term.id },
    _sum: { weight: true },
  });
  if ((existingWeight._sum.weight ?? 0) + parsed.data.weight > 100) {
    return { error: `That takes the unit past 100% - only ${100 - (existingWeight._sum.weight ?? 0)}% weight is left this term` };
  }

  const assessment = await db.assessment.create({
    data: {
      classSubjectId: unit.id,
      termId: term.id,
      name: parsed.data.name,
      kind: parsed.data.kind,
      maxScore: parsed.data.maxScore,
      weight: parsed.data.weight,
      dueOn: parsed.data.dueOn ? toDateOnly(parsed.data.dueOn) : null,
    },
  });
  await logActivity({
    actorId: session.userId,
    action: "assessment.created",
    entity: "Assessment",
    entityId: assessment.id,
    summary: `${session.name} set ${assessment.name} for ${unit.subject.name} (${unit.class.code})`,
  });

  revalidatePath(`/teacher/units/${unit.id}`);
  redirect(`/teacher/units/${unit.id}/assessments/${assessment.id}`);
}

// ---------------------------------------------------------------- marks

export async function saveMarks(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const assessmentId = formData.get("assessmentId");
  if (typeof assessmentId !== "string" || !assessmentId) return { error: "Missing assessment" };

  const assessment = await db.assessment.findUnique({ where: { id: assessmentId } });
  if (!assessment) return { error: "That assessment no longer exists" };

  const owned = await ownUnit(assessment.classSubjectId);
  if (!owned) return { error: "You do not teach this unit" };
  const { session, unit } = owned;

  const students = await db.student.findMany({
    where: { classId: unit.classId, status: "ACTIVE" },
    select: { id: true, user: { select: { name: true } } },
  });

  // Blank = not handed in (null), which is different from a zero.
  const scores: { studentId: string; score: number | null }[] = [];
  for (const student of students) {
    const raw = formData.get(`score-${student.id}`);
    const text = typeof raw === "string" ? raw.trim() : "";
    if (text === "") {
      scores.push({ studentId: student.id, score: null });
      continue;
    }
    const score = Number(text);
    if (!Number.isFinite(score) || score < 0 || score > assessment.maxScore) {
      return { error: `${student.user.name}: enter a score from 0 to ${assessment.maxScore}, or leave it blank` };
    }
    scores.push({ studentId: student.id, score });
  }

  const now = new Date();
  await db.$transaction(
    scores.map((row) =>
      db.mark.upsert({
        where: { assessmentId_studentId: { assessmentId: assessment.id, studentId: row.studentId } },
        create: {
          assessmentId: assessment.id,
          studentId: row.studentId,
          score: row.score,
          submittedAt: row.score === null ? null : now,
          enteredById: session.profileId,
        },
        update: { score: row.score, enteredById: session.profileId },
      }),
    ),
  );
  if (!assessment.publishedAt) {
    await db.assessment.update({ where: { id: assessment.id }, data: { publishedAt: now } });
  }

  const entered = scores.filter((s) => s.score !== null).length;
  await logActivity({
    actorId: session.userId,
    action: "marks.entered",
    entity: "Assessment",
    entityId: assessment.id,
    summary: `${session.name} entered ${assessment.name} marks for ${unit.subject.name} (${entered}/${scores.length})`,
  });

  revalidatePath(`/teacher/units/${unit.id}`);
  revalidatePath(`/teacher/units/${unit.id}/assessments/${assessment.id}`);
  revalidatePath("/admin");
  return { ok: true };
}
