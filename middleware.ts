import { NextResponse, type NextRequest } from "next/server";
import { sessionCookie, verifySession } from "@/lib/session";
import { ROLE_HOME, type Role } from "@/lib/enums";

const AREA_ROLES: Record<string, Role[]> = {
  "/admin": ["ADMIN"],
  "/teacher": ["TEACHER", "ADMIN"],
  "/student": ["STUDENT", "GUARDIAN"],
};

/**
 * First gate only. Every page and server action re-checks with requireRole(),
 * so a bypass here still cannot read or write anything.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const area = Object.keys(AREA_ROLES).find((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  if (!area) return NextResponse.next();

  const session = await verifySession(request.cookies.get(sessionCookie.name)?.value);
  if (!session) {
    const url = new URL("/login", request.url);
    return NextResponse.redirect(url);
  }
  if (!AREA_ROLES[area].includes(session.role)) {
    return NextResponse.redirect(new URL(ROLE_HOME[session.role] ?? "/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/teacher/:path*", "/student/:path*"],
};
