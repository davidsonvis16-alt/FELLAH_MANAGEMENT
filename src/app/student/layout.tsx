import { requireRole } from "@/lib/auth";
import { AppShell, type NavItem } from "@/components/shell";

const NAV: NavItem[] = [
  { href: "/student", label: "Overview", sw: "Muhtasari", glyph: "◫" },
  { href: "/student/results", label: "Report card", sw: "Ripoti", glyph: "▤" },
  { href: "/student/attendance", label: "Attendance", sw: "Mahudhurio", glyph: "✓" },
  { href: "/student/timetable", label: "Timetable", sw: "Ratiba", glyph: "▦" },
  { href: "/student/fees", label: "Fees", sw: "Ada", glyph: "¤" },
];

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("STUDENT", "GUARDIAN");
  return (
    <AppShell nav={NAV} user={{ name: session.name, role: session.role }}>
      {children}
    </AppShell>
  );
}
