"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { logActivity, requireRole } from "@/lib/auth";
import { AUDIENCES, PAYMENT_METHODS, PAYMENT_LABELS } from "@/lib/enums";
import { formatKsh } from "@/lib/grading";
import { toDateOnly } from "@/lib/dates";
import type { ActionState } from "./students";

// ---------------------------------------------------------------- fees

const paymentSchema = z.object({
  studentId: z.string().min(1),
  amount: z.coerce.number().positive("Enter an amount above 0"),
  method: z.enum(PAYMENT_METHODS),
  reference: z.string().trim().optional(),
  paidOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose the payment date"),
});

/** Applies a payment to the student's oldest unpaid invoices first. */
export async function recordPayment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireRole("ADMIN");
  const reference = formData.get("reference");
  const parsed = paymentSchema.safeParse({
    studentId: formData.get("studentId"),
    amount: formData.get("amount"),
    method: formData.get("method"),
    reference: typeof reference === "string" && reference.trim() !== "" ? reference : undefined,
    paidOn: formData.get("paidOn"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the payment" };
  const input = parsed.data;
  if (input.method !== "CASH" && !input.reference) return { error: `Enter the ${PAYMENT_LABELS[input.method]} reference` };

  const invoices = await db.feeInvoice.findMany({
    where: { studentId: input.studentId },
    include: { payments: { select: { amount: true } }, student: { include: { user: { select: { name: true } } } } },
    orderBy: [{ dueOn: "asc" }, { createdAt: "asc" }],
  });
  if (invoices.length === 0) return { error: "This student has no invoices to pay against" };

  const open = invoices
    .map((i) => ({ id: i.id, due: i.amount - i.payments.reduce((s, p) => s + p.amount, 0) }))
    .filter((i) => i.due > 0);
  const outstanding = open.reduce((s, i) => s + i.due, 0);
  if (input.amount > outstanding) return { error: `That is more than the balance of ${formatKsh(outstanding)}` };

  let left = input.amount;
  const paidOn = toDateOnly(input.paidOn);
  await db.$transaction(async (tx) => {
    for (const invoice of open) {
      if (left <= 0) break;
      const part = Math.min(left, invoice.due);
      left -= part;
      await tx.feePayment.create({
        data: { invoiceId: invoice.id, amount: part, method: input.method, reference: input.reference ?? null, paidOn, recordedById: session.userId },
      });
    }
  });

  const name = invoices[0].student.user.name;
  await logActivity({
    actorId: session.userId,
    action: "fees.paid",
    entity: "Student",
    entityId: input.studentId,
    summary: `Received ${formatKsh(input.amount)} (${PAYMENT_LABELS[input.method]}) for ${name}`,
  });

  revalidatePath("/admin/fees");
  revalidatePath(`/admin/students/${input.studentId}`);
  revalidatePath("/admin");
  return { ok: true };
}

// ---------------------------------------------------------------- notice board

const noticeSchema = z.object({
  title: z.string().trim().min(3, "Give the notice a title"),
  body: z.string().trim().min(5, "Write the notice"),
  audience: z.enum(AUDIENCES),
  pinned: z.boolean(),
});

export async function createAnnouncement(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireRole("ADMIN");
  const parsed = noticeSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    audience: formData.get("audience"),
    pinned: formData.get("pinned") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the notice" };

  const notice = await db.announcement.create({ data: { ...parsed.data, authorId: session.userId } });
  await logActivity({ actorId: session.userId, action: "notice.posted", entity: "Announcement", entityId: notice.id, summary: `Posted notice "${notice.title}"` });

  revalidatePath("/admin/notices");
  revalidatePath("/teacher");
  revalidatePath("/student");
  return { ok: true };
}

export async function deleteAnnouncement(formData: FormData): Promise<void> {
  const session = await requireRole("ADMIN");
  const id = formData.get("id");
  if (typeof id !== "string") return;
  const notice = await db.announcement.delete({ where: { id } }).catch(() => null);
  if (notice) {
    await logActivity({ actorId: session.userId, action: "notice.removed", entity: "Announcement", entityId: id, summary: `Removed notice "${notice.title}"` });
  }
  revalidatePath("/admin/notices");
}
