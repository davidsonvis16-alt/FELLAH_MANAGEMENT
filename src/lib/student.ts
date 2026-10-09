import "server-only";
import { redirect } from "next/navigation";
import { requireRole } from "./auth";
import { db } from "./db";

/**
 * The student this session may see: their own record, or for a parent, their
 * primary child. Never taken from the URL.
 */
export async function currentStudent() {
  const session = await requireRole("STUDENT", "GUARDIAN");
  if (session.role === "STUDENT" && session.profileId) return { session, studentId: session.profileId };

  const link = await db.studentGuardian.findFirst({
    where: { guardian: { userId: session.userId } },
    orderBy: { isPrimary: "desc" },
    select: { studentId: true },
  });
  if (!link) redirect("/login");
  return { session, studentId: link.studentId };
}
