"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { logActivity, requireRole } from "@/lib/auth";
import type { ActionState } from "./students";

const subjectSchema = z.object({
  name: z.string().trim().min(3, "Enter the subject name"),
  code: z.string().trim().min(2, "Enter a subject code").transform((value) => value.toUpperCase()),
  description: z.string().trim().optional(),
});

export async function createSubject(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireRole("ADMIN");
  const parsed = subjectSchema.safeParse({
    name: formData.get("name"),
    code: formData.get("code"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form" };

  if (await db.subject.findUnique({ where: { code: parsed.data.code }, select: { id: true } })) {
    return { error: `Subject code ${parsed.data.code} already exists` };
  }

  const subject = await db.subject.create({ data: parsed.data });
  await logActivity({
    actorId: session.userId,
    action: "subject.created",
    entity: "Subject",
    entityId: subject.id,
    summary: `Added subject ${subject.name} (${subject.code})`,
  });
  revalidatePath("/admin/subjects");
  return { ok: true };
}

const classSchema = z.object({
  name: z.string().trim().min(3, "Enter the class name"),
  code: z.string().trim().min(2, "Enter a class code").transform((value) => value.toUpperCase()),
  level: z.coerce.number().int().min(1, "Level must be 1 or more").max(8),
  capacity: z.coerce.number().int().min(1).max(500),
  classTeacherId: z.string().optional(),
});

export async function createClass(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireRole("ADMIN");
  const parsed = classSchema.safeParse({
    name: formData.get("name"),
    code: formData.get("code"),
    level: formData.get("level"),
    capacity: formData.get("capacity") || 60,
    classTeacherId: (formData.get("classTeacherId") as string) || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form" };

  if (await db.class.findUnique({ where: { code: parsed.data.code }, select: { id: true } })) {
    return { error: `Class code ${parsed.data.code} already exists` };
  }

  const klass = await db.class.create({
    data: {
      name: parsed.data.name,
      code: parsed.data.code,
      level: parsed.data.level,
      capacity: parsed.data.capacity,
      classTeacherId: parsed.data.classTeacherId ?? null,
    },
  });
  await logActivity({
    actorId: session.userId,
    action: "class.created",
    entity: "Class",
    entityId: klass.id,
    summary: `Created class ${klass.name}`,
  });
  revalidatePath("/admin/classes");
  return { ok: true };
}

const unitSchema = z.object({
  classId: z.string().min(1),
  subjectId: z.string().min(1, "Choose a subject"),
  teacherId: z.string().optional(),
});

export async function addUnitToClass(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireRole("ADMIN");
  const parsed = unitSchema.safeParse({
    classId: formData.get("classId"),
    subjectId: formData.get("subjectId"),
    teacherId: (formData.get("teacherId") as string) || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Choose a subject" };

  const existing = await db.classSubject.findUnique({
    where: { classId_subjectId: { classId: parsed.data.classId, subjectId: parsed.data.subjectId } },
    select: { id: true },
  });
  if (existing) return { error: "That subject is already on this class" };

  const unit = await db.classSubject.create({
    data: {
      classId: parsed.data.classId,
      subjectId: parsed.data.subjectId,
      teacherId: parsed.data.teacherId ?? null,
    },
    include: { subject: true, class: true },
  });
  await logActivity({
    actorId: session.userId,
    action: "unit.created",
    entity: "ClassSubject",
    entityId: unit.id,
    summary: `${unit.subject.name} added to ${unit.class.name}`,
  });
  revalidatePath(`/admin/classes/${parsed.data.classId}`);
  return { ok: true };
}
