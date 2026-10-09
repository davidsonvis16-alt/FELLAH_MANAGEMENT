import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { sessionCookie, signSession, verifySession, type SessionPayload } from "./session";
import { ROLE_HOME, type Role } from "./enums";

export { isDemoMode } from "./demo";

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  return verifySession(jar.get(sessionCookie.name)?.value);
}

export async function startSession(payload: SessionPayload): Promise<void> {
  const token = await signSession(payload);
  const jar = await cookies();
  jar.set(sessionCookie.name, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionCookie.maxAge,
  });
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(sessionCookie.name);
}

/** Guard for a page or server action. Redirects rather than throwing to the user. */
export async function requireRole(...allowed: Role[]): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!allowed.includes(session.role)) redirect(ROLE_HOME[session.role] ?? "/login");
  return session;
}

export async function logActivity(input: {
  actorId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  summary: string;
}): Promise<void> {
  await db.activityLog.create({
    data: {
      actorId: input.actorId ?? null,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? null,
      summary: input.summary,
    },
  });
}
