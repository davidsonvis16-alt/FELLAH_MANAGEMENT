import { DAY_NAMES, PERIODS } from "@/lib/dates";

export type TimetableEntry = { dayOfWeek: number; startsAt: string; code: string; title: string; room: string | null; note?: string };

/** Stable flag colour per unit code: 0 green, 1 red, 2 black. */
function toneFor(code: string) {
  let h = 0;
  for (const ch of code) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % 3;
}

/** Period x weekday grid. `today` (1-5) highlights the current column. */
export function TimetableGrid({ entries, today }: { entries: TimetableEntry[]; today?: number }) {
  return (
    <div className="table-wrap">
      <table className="tt">
        <thead>
          <tr>
            <th className="tt-time">Period</th>
            {DAY_NAMES.map((day, i) => (
              <th key={day} data-today={today === i + 1}>
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PERIODS.map((p) => (
            <tr key={p.period}>
              <td className="tt-time">
                <span className="block font-semibold">P{p.period}</span>
                <span className="muted text-[11px]">
                  {p.startsAt}-{p.endsAt}
                </span>
              </td>
              {[1, 2, 3, 4, 5].map((day) => {
                const cell = entries.filter((e) => e.dayOfWeek === day && e.startsAt === p.startsAt);
                return (
                  <td key={day} data-today={today === day}>
                    {cell.length === 0 ? (
                      <span className="tt-free">free</span>
                    ) : (
                      cell.map((e, i) => (
                        <div key={i} className="tt-cell" data-tone={toneFor(e.code)} title={`${e.title}${e.room ? ` · ${e.room}` : ""}`}>
                          <span className="tt-code">{e.code}</span>
                          <span className="tt-meta">{[e.note, e.room].filter(Boolean).join(" · ")}</span>
                        </div>
                      ))
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
