import "server-only";
import { notFound, redirect } from "next/navigation";
import { requireRole } from "./auth";
import { db } from "./db";

/** The signed-in teacher's own record. Pages call this instead of trusting a URL id. */
export async function currentTeacher() {
  const session = await requireRole("TEACHER");
  if (!session.profileId) redirect("/login");
  return { session, teacherId: session.profileId };
}

/** A unit the signed-in teacher is assigned to, or 404. */
export async function teacherUnit(classSubjectId: string) {
  const { session, teacherId } = await currentTeacher();
  const unit = await db.classSubject.findUnique({
    where: { id: classSubjectId },
    include: { subject: true, class: true },
  });
  if (!unit || unit.teacherId !== teacherId) notFound();
  return { session, teacherId, unit };
}
