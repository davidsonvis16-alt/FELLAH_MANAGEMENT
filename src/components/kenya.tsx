import type { ReactNode } from "react";
import { NairobiClock } from "./live";

/** Maasai shield with crossed spears - the emblem at the heart of the flag. */
export function ShieldMark({ size = 32, spear = "currentColor", className }: { size?: number; spear?: string; className?: string }) {
  return (
    <svg viewBox="0 0 40 48" width={size} height={(size * 48) / 40} className={className} aria-hidden>
      <g stroke={spear} strokeWidth="1.8" strokeLinecap="round">
        <line x1="7" y1="5" x2="33" y2="45" />
        <line x1="33" y1="5" x2="7" y2="45" />
      </g>
      <g fill={spear}>
        <path d="M5.2 2.2 9.6 4.4 8.4 7.6Z" />
        <path d="M34.8 2.2 30.4 4.4 31.6 7.6Z" />
      </g>
      <ellipse cx="20" cy="25" rx="10.5" ry="18" fill="#0b0b0b" />
      <ellipse cx="20" cy="25" rx="7" ry="18" fill="#c8102e" />
      <ellipse cx="20" cy="25" rx="7" ry="18" fill="none" stroke="#fff" strokeWidth="1.1" />
      <path d="M20 9.5c-2 4-2 8 0 11 2-3 2-7 0-11Zm0 30c-2-4-2-8 0-11 2 3 2 7 0 11Z" fill="#fff" />
      <ellipse cx="20" cy="25" rx="2.4" ry="3.4" fill="#fff" />
    </svg>
  );
}

/** Black / white / red / white / green - the flag as a thin band. */
export function FlagStripe({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`flag-stripe ${className}`} />;
}

export function Beads({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`beads ${className}`} />;
}

/** Methali - Swahili proverbs. One a day, the same for everyone in the school. */
const METHALI: [string, string][] = [
  ["Haba na haba hujaza kibaba.", "Little by little fills the measure."],
  ["Elimu ni bahari.", "Education is an ocean - there is always more."],
  ["Penye nia pana njia.", "Where there is a will, there is a way."],
  ["Mwenda pole hajikwai.", "One who walks steadily does not stumble."],
  ["Bidii yako ndiyo ngazi yako.", "Your effort is your ladder."],
  ["Kidole kimoja hakivunji chawa.", "One finger cannot crush a louse - we rise together."],
  ["Usipoziba ufa utajenga ukuta.", "Fix the crack now, or rebuild the wall later."],
  ["Asiyefunzwa na mamaye hufunzwa na ulimwengu.", "Who is not taught at home is taught by the world."],
  ["Mti hukua kwa mizizi yake.", "A tree grows from its roots."],
  ["Akili ni nywele, kila mtu ana zake.", "Wisdom is like hair - everyone has their own."],
  ["Ukiona vyaelea, vimeundwa.", "What floats with ease was carefully built."],
  ["Juhudi si kitu bila maarifa.", "Effort is nothing without knowledge."],
  ["Kuuliza si ujinga.", "To ask is not foolishness."],
  ["Harambee!", "Let us all pull together."],
];

export function methaliOfDay(date = new Date()): [string, string] {
  const dayOfYear = Math.floor((date.getTime() - Date.UTC(date.getUTCFullYear(), 0, 0)) / 86_400_000);
  return METHALI[dayOfYear % METHALI.length];
}

/** Hour of day in Nairobi, regardless of where the server runs. */
function nairobiHour(date = new Date()): number {
  return Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Africa/Nairobi" }).format(date)) % 24;
}

export function salamu(date = new Date()): { sw: string; en: string } {
  const h = nairobiHour(date);
  if (h < 12) return { sw: "Habari za asubuhi", en: "Good morning" };
  if (h < 16) return { sw: "Habari za mchana", en: "Good afternoon" };
  return { sw: "Habari za jioni", en: "Good evening" };
}

/** Dashboard hero: Swahili greeting, live Nairobi clock, the methali of the day. */
export function WelcomeBanner({ name, kicker, children }: { name: string; kicker?: ReactNode; children?: ReactNode }) {
  const greeting = salamu();
  const [sw, en] = methaliOfDay();
  return (
    <section className="welcome mb-5 px-5 py-6 md:px-8 md:py-8">
      <div aria-hidden className="welcome-flag hidden sm:block" />
      <ShieldMark className="welcome-shield hidden md:block" spear="#fff" size={140} />
      <div className="relative flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="welcome-kicker">
            <span className="live-dot" aria-hidden />
            <NairobiClock /> Nairobi
          </span>
          {kicker ? <span className="welcome-kicker">{kicker}</span> : null}
        </div>
        <div>
          <p className="m-0 text-[13px] font-semibold uppercase tracking-[0.12em] opacity-75">{greeting.en}</p>
          <h1 className="m-0 mt-1 text-[32px] leading-[1.05] md:text-[42px]">
            {greeting.sw}, {name}!
          </h1>
        </div>
        <figure className="methali m-0">
          <p className="m-0 mb-1 text-[10.5px] font-bold uppercase tracking-[0.14em] opacity-70">Methali ya leo · Proverb of the day</p>
          <blockquote className="methali-sw m-0">“{sw}”</blockquote>
          <figcaption className="methali-en">{en}</figcaption>
        </figure>
        {children}
      </div>
    </section>
  );
}

/** Fee collection as a shared effort - the school pulling together. */
export function HarambeeMeter({ collected, billed, formatted }: { collected: number; billed: number; formatted: { collected: string; billed: string; outstanding: string } }) {
  const pct = billed > 0 ? Math.min(100, (collected / billed) * 100) : 0;
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="display m-0 text-[34px] font-bold leading-none tracking-[-0.04em]" style={{ color: "var(--kenya-green)" }}>
            {pct.toFixed(1)}%
          </p>
          <p className="muted m-0 mt-1 text-[12.5px]">
            {formatted.collected} of {formatted.billed} collected
          </p>
        </div>
        <span className="badge" style={{ color: "var(--energy)", borderColor: "color-mix(in srgb, var(--energy) 30%, transparent)", background: "var(--energy-soft)" }}>
          {formatted.outstanding} to go
        </span>
      </div>
      <div className="harambee-track" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label="Fees collected">
        <div className="harambee-fill" style={{ width: `${pct}%` }} />
        {[25, 50, 75].map((m) => (
          <span key={m} aria-hidden className="harambee-marker" style={{ left: `${m}%` }} />
        ))}
      </div>
      <p className="ink-2 m-0 mt-3 text-[12.5px]">
        <strong style={{ color: "var(--kenya-green)" }}>Harambee!</strong>{" "}
        {pct >= 80 ? "Tunakaribia - we are nearly there." : pct >= 50 ? "Pamoja tunaweza - past halfway, keep pulling." : "Kila shilingi inahesabu - every shilling counts."}
      </p>
    </div>
  );
}
