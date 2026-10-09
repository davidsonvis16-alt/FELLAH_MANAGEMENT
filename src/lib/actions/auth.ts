"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { endSession, isDemoMode, startSession, verifyPassword } from "@/lib/auth";
import { ROLE_HOME, type Role } from "@/lib/enums";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

export type LoginState = { error?: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your details" };
  }

  const user = await db.user.findUnique({
    where: { email: parsed.data.email },
    include: { teacher: { select: { id: true } }, student: { select: { id: true } } },
  });

  // Same message either way - do not reveal which accounts exist.
  if (!user || !user.isActive || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return { error: "Email or password is incorrect" };
  }

  await startSession({
    userId: user.id,
    role: user.role as Role,
    name: user.name,
    profileId: user.teacher?.id ?? user.student?.id ?? null,
  });
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  redirect(ROLE_HOME[user.role as Role] ?? "/");
}

// One-click sign-in for the seeded demo accounts. Off unless DEMO_MODE=true, so a
// real deployment cannot be entered without a password.
const DEMO_ACCOUNTS: Record<string, string> = {
  ADMIN: "admin@fellah.ac.ke",
  TEACHER: "j.mwangi@fellah.ac.ke",
  STUDENT: "davis.patrick@fellah.ac.ke",
};

export async function demoLogin(_prev: LoginState, formData: FormData): Promise<LoginState> {
  if (!isDemoMode()) return { error: "Quick sign-in is not available. Use your email and password." };
  const email = DEMO_ACCOUNTS[String(formData.get("role"))];
  if (!email) return { error: "Choose who you are signing in as" };

  const user = await db.user.findUnique({
    where: { email },
    include: { teacher: { select: { id: true } }, student: { select: { id: true } } },
  });
  if (!user || !user.isActive) {
    return { error: "This account is not available right now. Try again later." };
  }

  await startSession({
    userId: user.id,
    role: user.role as Role,
    name: user.name,
    profileId: user.teacher?.id ?? user.student?.id ?? null,
  });
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  redirect(ROLE_HOME[user.role as Role] ?? "/");
}

export async function logout(): Promise<void> {
  await endSession();
  redirect("/login");
}
