import Link from "next/link";
import type { ReactNode } from "react";
import { NavLink } from "./nav-link";
import { Beads, FlagStripe, ShieldMark } from "./kenya";
import { NairobiClock } from "./live";
import { logout } from "@/lib/actions/auth";
import { isDemoMode } from "@/lib/auth";
import { getCurrentTerm } from "@/lib/queries";
import { formatDate, todayDateOnly } from "@/lib/dates";
import type { Role } from "@/lib/enums";

export type NavItem = { href: string; label: string; glyph: string; sw?: string };

const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Administrator",
  TEACHER: "Teacher",
  STUDENT: "Student",
  GUARDIAN: "Parent",
};

const ROLE_SW: Record<Role, string> = {
  ADMIN: "Msimamizi",
  TEACHER: "Mwalimu",
  STUDENT: "Mwanafunzi",
  GUARDIAN: "Mzazi",
};

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const WEEK_MS = 7 * 86_400_000;

function termProgress(term: { startsOn: Date; endsOn: Date }) {
  const total = Math.max(1, Math.ceil((term.endsOn.getTime() - term.startsOn.getTime()) / WEEK_MS));
  const elapsed = Date.now() - term.startsOn.getTime();
  const week = Math.min(total, Math.max(1, Math.ceil(elapsed / WEEK_MS)));
  const pct = Math.min(100, Math.max(0, (elapsed / (term.endsOn.getTime() - term.startsOn.getTime())) * 100));
  return { week, total, pct };
}

export async function AppShell({
  nav,
  user,
  children,
}: {
  nav: NavItem[];
  user: { name: string; role: Role };
  children: ReactNode;
}) {
  const term = await getCurrentTerm();
  const demo = isDemoMode();
  const progress = term ? termProgress(term) : null;

  return (
    <div className="flex min-h-screen">
      <aside className="sidebar sticky top-0 hidden h-screen w-[252px] shrink-0 flex-col px-3 pb-3 pt-5 md:flex">
        <Link href="/" className="mb-7 flex items-center gap-3 px-2">
          <span className="logo-mark">
            <ShieldMark size={30} spear="#fff" />
          </span>
          <span className="leading-tight">
            <span className="display block text-[19px] font-extrabold tracking-[0.06em]">FELLAH</span>
            <span className="muted block text-[11px] font-medium">Shule yetu · Our school</span>
          </span>
        </Link>

        <p className="side-section">
          {ROLE_SW[user.role]} · {ROLE_LABEL[user.role]}
        </p>
        <nav className="flex flex-col gap-1 overflow-y-auto pr-2">
          {nav.map((item) => (
            <NavLink key={item.href} href={item.href} label={item.label} sw={item.sw} glyph={item.glyph} />
          ))}
        </nav>

        {term && progress ? (
          <div className="mx-1 mr-3 mt-6 rounded-xl p-3" style={{ background: "rgba(0,0,0,0.22)", border: "1px solid var(--side-line)" }}>
            <div className="flex items-baseline justify-between">
              <p className="side-section m-0 p-0">Muhula</p>
              <span className="mono whitespace-nowrap text-[11px] font-semibold">
                Wiki {progress.week}/{progress.total}
              </span>
            </div>
            <p className="m-0 mt-1 text-[13px] font-semibold">
              {term.name} <span className="muted font-normal">· {term.year.name}</span>
            </p>
            <div className="mt-2 h-[6px] overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.12)" }}>
              <div className="bar-fill" style={{ width: `${progress.pct}%`, background: "linear-gradient(90deg, #fff, var(--kenya-red))" }} />
            </div>
          </div>
        ) : null}

        <div className="mr-3 mt-auto pt-3">
          <Beads className="mb-3 opacity-90" />
          <div className="flex items-center gap-2.5 px-1">
            <span
              aria-hidden
              className="display grid h-9 w-9 shrink-0 place-items-center rounded-full text-[12px] font-bold"
              style={{ background: "var(--kenya-red)", boxShadow: "0 0 0 2px var(--kenya-green-deep), 0 0 0 3.5px #fff" }}
            >
              {initials(user.name)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-semibold">{user.name}</span>
              <span className="muted block text-[11.5px]">{ROLE_LABEL[user.role]}</span>
            </span>
          </div>
          <form action={logout} className="mt-3 px-1">
            <button type="submit" className="btn btn-sm w-full justify-center">
              {demo ? "Switch user · Badili" : "Sign out · Toka"}
            </button>
          </form>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="topbar sticky top-0 z-10">
          <FlagStripe />
          <div className="mx-auto flex w-full max-w-[1240px] items-center gap-3 px-4 py-2.5 md:px-7">
            <span className="crumb hidden md:inline">
              <b>FELLAH</b> / {ROLE_LABEL[user.role]}
            </span>
            <span className="flex items-center gap-2 md:hidden">
              <ShieldMark size={20} spear="var(--kenya-black)" />
              <span className="display text-[16px] font-extrabold tracking-[0.06em]">FELLAH</span>
            </span>
            <span className="crumb ml-auto hidden sm:inline">{formatDate(todayDateOnly())}</span>
            <span className="clock ml-auto sm:ml-0" title="East Africa Time">
              <span className="live-dot" aria-hidden />
              <NairobiClock seconds />
              <span className="muted text-[10.5px]">EAT</span>
            </span>
            <form action={logout} className="md:hidden">
              <button type="submit" className="btn btn-sm">
                {demo ? "Switch user" : "Sign out"}
              </button>
            </form>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-3 pb-2 md:hidden">
            {nav.map((item) => (
              <NavLink key={item.href} href={item.href} label={item.label} />
            ))}
          </nav>
        </header>
        <main className="mx-auto w-full max-w-[1240px] px-4 py-5 md:px-7 md:py-7">{children}</main>
      </div>
    </div>
  );
}
