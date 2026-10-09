"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword, logActivity, requireRole } from "@/lib/auth";
import { GENDERS, RELATIONSHIPS, STUDENT_STATUSES } from "@/lib/enums";

export type ActionState = { error?: string; ok?: boolean };

const studentSchema = z.object({
  name: z.string().trim().min(3, "Enter the student's full name"),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  phone: z.string().trim().optional(),
  password: z.string().min(8, "The temporary password must be at least 8 characters"),
  gender: z.enum(GENDERS),
  dateOfBirth: z.string().optional(),
  classId: z.string().optional(),
  admissionNo: z.string().trim().optional(),
  address: z.string().trim().optional(),
  guardianName: z.string().trim().optional(),
  guardianPhone: z.string().trim().optional(),
  guardianEmail: z.string().trim().optional(),
  guardianRelationship: z.enum(RELATIONSHIPS).optional(),
});

async function nextAdmissionNo(): Promise<string> {
  const year = String(new Date().getUTCFullYear()).slice(-2);
  const count = await db.student.count();
  return `FEL/${String(count + 1).padStart(4, "0")}/${year}`;
}

function read(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

export async function createStudent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireRole("ADMIN");

  const parsed = studentSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: read(formData, "phone"),
    password: formData.get("password"),
    gender: formData.get("gender"),
    dateOfBirth: read(formData, "dateOfBirth"),
    classId: read(formData, "classId"),
    admissionNo: read(formData, "admissionNo"),
    address: read(formData, "address"),
    guardianName: read(formData, "guardianName"),
    guardianPhone: read(formData, "guardianPhone"),
    guardianEmail: read(formData, "guardianEmail"),
    guardianRelationship: read(formData, "guardianRelationship"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form" };
  const input = parsed.data;

  if (await db.user.findUnique({ where: { email: input.email }, select: { id: true } })) {
    return { error: "That email address is already in use" };
  }
  const admissionNo = input.admissionNo ?? (await nextAdmissionNo());
  if (await db.student.findUnique({ where: { admissionNo }, select: { id: true } })) {
    return { error: `Admission number ${admissionNo} is already taken` };
  }
  if (input.guardianName && !input.guardianPhone) {
    return { error: "A guardian needs a phone number" };
  }

  const student = await db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: input.email,
        passwordHash: await hashPassword(input.password),
        name: input.name,
        phone: input.phone ?? null,
        role: "STUDENT",
      },
    });
    const created = await tx.student.create({
      data: {
        userId: user.id,
        admissionNo,
        classId: input.classId ?? null,
        gender: input.gender,
        dateOfBirth: input.dateOfBirth ? new Date(`${input.dateOfBirth}T00:00:00.000Z`) : null,
        address: input.address ?? null,
        status: "ACTIVE",
      },
    });
    if (input.guardianName && input.guardianPhone) {
      const guardian = await tx.guardian.create({
        data: {
          name: input.guardianName,
          phone: input.guardianPhone,
          email: input.guardianEmail ?? null,
          relationship: input.guardianRelationship ?? "GUARDIAN",
        },
      });
      await tx.studentGuardian.create({
        data: { studentId: created.id, guardianId: guardian.id, isPrimary: true },
      });
    }
    return created;
  });

  await logActivity({
    actorId: session.userId,
    action: "student.created",
    entity: "Student",
    entityId: student.id,
    summary: `Admitted ${input.name} (${admissionNo})`,
  });

  revalidatePath("/admin/students");
  revalidatePath("/admin");
  redirect(`/admin/students/${student.id}`);
}

const updateSchema = z.object({
  studentId: z.string().min(1),
  classId: z.string().optional(),
  status: z.enum(STUDENT_STATUSES),
  phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export async function updateStudent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireRole("ADMIN");
  const parsed = updateSchema.safeParse({
    studentId: formData.get("studentId"),
    classId: read(formData, "classId"),
    status: formData.get("status"),
    phone: read(formData, "phone"),
    address: read(formData, "address"),
    notes: read(formData, "notes"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form" };

  const student = await db.student.update({
    where: { id: parsed.data.studentId },
    data: {
      classId: parsed.data.classId ?? null,
      status: parsed.data.status,
      address: parsed.data.address ?? null,
      notes: parsed.data.notes ?? null,
    },
    include: { user: { select: { name: true } } },
  });
  if (parsed.data.phone !== undefined) {
    await db.user.update({ where: { id: student.userId }, data: { phone: parsed.data.phone } });
  }

  await logActivity({
    actorId: session.userId,
    action: "student.updated",
    entity: "Student",
    entityId: student.id,
    summary: `Updated record for ${student.user.name}`,
  });

  revalidatePath(`/admin/students/${student.id}`);
  revalidatePath("/admin/students");
  return { ok: true };
}
