import { requireRole } from "@/lib/auth";
import { AppShell, type NavItem } from "@/components/shell";

const NAV: NavItem[] = [
  { href: "/teacher", label: "Today", sw: "Leo", glyph: "◫" },
  { href: "/teacher/units", label: "My units", sw: "Vitengo vyangu", glyph: "▤" },
];

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("TEACHER");
  return (
    <AppShell nav={NAV} user={{ name: session.name, role: session.role }}>
      {children}
    </AppShell>
  );
}
