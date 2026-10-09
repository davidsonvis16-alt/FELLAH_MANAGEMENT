import { requireRole } from "@/lib/auth";
import { AppShell, type NavItem } from "@/components/shell";

const NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard", sw: "Muhtasari", glyph: "◫" },
  { href: "/admin/students", label: "Students", sw: "Wanafunzi", glyph: "◉" },
  { href: "/admin/teachers", label: "Teachers", sw: "Walimu", glyph: "◈" },
  { href: "/admin/classes", label: "Classes", sw: "Madarasa", glyph: "▤" },
  { href: "/admin/subjects", label: "Subjects", sw: "Masomo", glyph: "◇" },
  { href: "/admin/timetable", label: "Timetable", sw: "Ratiba", glyph: "▦" },
  { href: "/admin/fees", label: "Fees", sw: "Ada", glyph: "¤" },
  { href: "/admin/notices", label: "Notices", sw: "Matangazo", glyph: "✉" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("ADMIN");
  return (
    <AppShell nav={NAV} user={{ name: session.name, role: session.role }}>
      {children}
    </AppShell>
  );
}
