"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ROOTS = ["/admin", "/teacher", "/student"];

export function NavLink({ href, label, glyph, sw }: { href: string; label: string; glyph?: string; sw?: string }) {
  const pathname = usePathname();
  const active = pathname === href || (!ROOTS.includes(href) && pathname.startsWith(href));
  return (
    <Link href={href} className="nav-link" data-active={active} aria-current={active ? "page" : undefined}>
      {glyph ? (
        <span aria-hidden className="nav-glyph">
          {glyph}
        </span>
      ) : null}
      <span className="min-w-0">
        <span className="block">{label}</span>
        {sw ? <span className="nav-sw">{sw}</span> : null}
      </span>
    </Link>
  );
}
