"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword, logActivity, requireRole } from "@/lib/auth";
import type { ActionState } from "./students";

const teacherSchema = z.object({
  name: z.string().trim().min(3, "Enter the teacher's full name"),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  phone: z.string().trim().optional(),
  password: z.string().min(8, "The temporary password must be at least 8 characters"),
  staffNo: z.string().trim().min(1, "Enter a staff number"),
  qualification: z.string().trim().optional(),
});

export async function createTeacher(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireRole("ADMIN");
  const parsed = teacherSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    password: formData.get("password"),
    staffNo: formData.get("staffNo"),
    qualification: formData.get("qualification") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form" };
  const input = parsed.data;

  if (await db.user.findUnique({ where: { email: input.email }, select: { id: true } })) {
    return { error: "That email address is already in use" };
  }
  if (await db.teacher.findUnique({ where: { staffNo: input.staffNo }, select: { id: true } })) {
    return { error: `Staff number ${input.staffNo} is already in use` };
  }

  const teacher = await db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: input.email,
        passwordHash: await hashPassword(input.password),
        name: input.name,
        phone: input.phone ?? null,
        role: "TEACHER",
      },
    });
    return tx.teacher.create({
      data: { userId: user.id, staffNo: input.staffNo, qualification: input.qualification ?? null },
    });
  });

  await logActivity({
    actorId: session.userId,
    action: "teacher.created",
    entity: "Teacher",
    entityId: teacher.id,
    summary: `Added teacher ${input.name} (${input.staffNo})`,
  });

  revalidatePath("/admin/teachers");
  revalidatePath("/admin");
  redirect(`/admin/teachers/${teacher.id}`);
}

const assignSchema = z.object({
  classSubjectId: z.string().min(1),
  teacherId: z.string().optional(),
});

export async function assignUnitTeacher(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireRole("ADMIN");
  const parsed = assignSchema.safeParse({
    classSubjectId: formData.get("classSubjectId"),
    teacherId: (formData.get("teacherId") as string) || undefined,
  });
  if (!parsed.success) return { error: "Could not assign that unit" };

  const unit = await db.classSubject.update({
    where: { id: parsed.data.classSubjectId },
    data: { teacherId: parsed.data.teacherId ?? null },
    include: { subject: true, class: true, teacher: { include: { user: { select: { name: true } } } } },
  });

  await logActivity({
    actorId: session.userId,
    action: "unit.assigned",
    entity: "ClassSubject",
    entityId: unit.id,
    summary: `${unit.subject.name} for ${unit.class.name} assigned to ${unit.teacher?.user.name ?? "nobody"}`,
  });

  revalidatePath(`/admin/classes/${unit.classId}`);
  revalidatePath("/admin/teachers");
  return { ok: true };
}
