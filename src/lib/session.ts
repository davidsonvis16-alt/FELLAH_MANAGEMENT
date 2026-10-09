import { SignJWT, jwtVerify } from "jose";
import type { Role } from "./enums";

const COOKIE_NAME = "fellah_session";
const MAX_AGE_SECONDS = 60 * 60 * 8;

export type SessionPayload = {
  userId: string;
  role: Role;
  name: string;
  /** teacher.id or student.id, so a page does not have to look it up again. */
  profileId: string | null;
};

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 24) {
    throw new Error("AUTH_SECRET is missing or too short - see .env.example");
  }
  return new TextEncoder().encode(value);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secret());
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const { userId, role, name, profileId } = payload as Record<string, unknown>;
    if (typeof userId !== "string" || typeof role !== "string" || typeof name !== "string") {
      return null;
    }
    return {
      userId,
      role: role as Role,
      name,
      profileId: typeof profileId === "string" ? profileId : null,
    };
  } catch {
    return null;
  }
}

export const sessionCookie = {
  name: COOKIE_NAME,
  maxAge: MAX_AGE_SECONDS,
};
