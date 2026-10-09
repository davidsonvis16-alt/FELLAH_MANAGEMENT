import Link from "next/link";
import { db } from "@/lib/db";
import { feeBalances, getCurrentTerm } from "@/lib/queries";
import { Bar, Card, Empty, PageHeader, StatTile } from "@/components/ui";
import { formatKsh, round1 } from "@/lib/grading";
import { formatDate } from "@/lib/dates";
import { PAYMENT_LABELS, type PaymentMethod } from "@/lib/enums";
import { PaymentForm } from "./payment-form";

export const dynamic = "force-dynamic";

const FILTERS = [
  { key: "owing", label: "Owing" },
  { key: "cleared", label: "Cleared" },
  { key: "all", label: "All" },
] as const;

export default async function FeesPage({ searchParams }: { searchParams: Promise<{ show?: string; q?: string }> }) {
  const query = await searchParams;
  const show = FILTERS.some((f) => f.key === query.show) ? query.show! : "owing";
  const search = query.q?.trim().toLowerCase() ?? "";

  const term = await getCurrentTerm();
  const [rows, recent, byMethod] = await Promise.all([
    feeBalances(term?.id),
    db.feePayment.findMany({
      orderBy: [{ paidOn: "desc" }, { id: "desc" }],
      take: 8,
      include: { invoice: { include: { student: { include: { user: { select: { name: true } } } } } } },
    }),
    db.feePayment.groupBy({ by: ["method"], where: term ? { invoice: { termId: term.id } } : {}, _sum: { amount: true } }),
  ]);

  const billed = rows.reduce((s, r) => s + r.billed, 0);
  const paid = rows.reduce((s, r) => s + r.paid, 0);
  const owing = rows.filter((r) => r.balance > 0);
  const collected = billed > 0 ? round1((paid / billed) * 100) : null;

  const visible = rows
    .filter((r) => (show === "owing" ? r.balance > 0 : show === "cleared" ? r.balance <= 0 : true))
    .filter((r) => !search || r.name.toLowerCase().includes(search) || r.admissionNo.toLowerCase().includes(search))
    .sort((a, b) => b.balance - a.balance);

  return (
    <>
      <PageHeader title="Fees" subtitle={term ? `${term.name} · ${term.year.name}` : "All terms"} />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Billed" value={formatKsh(billed)} hint={`${rows.length} students`} />
        <StatTile label="Collected" value={formatKsh(paid)} hint={collected === null ? "" : `${collected}% of billed`} tone="good" />
        <StatTile label="Outstanding" value={formatKsh(billed - paid)} tone={billed - paid > 0 ? "warning" : "neutral"} />
        <StatTile label="Students owing" value={owing.length} hint={`${owing.filter((r) => r.balance > 20000).length} over KSh 20,000`} tone={owing.length > 0 ? "warning" : "neutral"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card
          title="Balances"
          action={
            <nav className="flex gap-1">
              {FILTERS.map((f) => (
                <Link key={f.key} href={`/admin/fees?show=${f.key}${search ? `&q=${encodeURIComponent(search)}` : ""}`} className="chip" data-active={show === f.key}>
                  {f.label}
                </Link>
              ))}
            </nav>
          }
          bodyClass=""
        >
          <form className="border-b px-4 py-2.5" style={{ borderColor: "var(--grid)" }}>
            <input type="hidden" name="show" value={show} />
            <input name="q" defaultValue={query.q ?? ""} placeholder="Search name or admission no." className="input" aria-label="Search students" />
          </form>
          {visible.length === 0 ? (
            <div className="p-4">
              <Empty>No students match.</Empty>
            </div>
          ) : (
            <div className="table-wrap max-h-[620px] overflow-y-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Class</th>
                    <th className="num">Billed</th>
                    <th className="num">Paid</th>
                    <th className="num">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r) => (
                    <tr key={r.studentId}>
                      <td>
                        <Link href={`/admin/students/${r.studentId}`} className="font-semibold underline-offset-2 hover:underline">
                          {r.name}
                        </Link>
                        <div className="muted text-[12px]">{r.admissionNo}</div>
                      </td>
                      <td className="muted">{r.className ?? "-"}</td>
                      <td className="num">{r.billed.toLocaleString("en-KE")}</td>
                      <td className="num">{r.paid.toLocaleString("en-KE")}</td>
                      <td className="num font-semibold">
                        {r.balance > 0 ? <span className={r.balance > 20000 ? "tone-critical" : "tone-warning"}>{r.balance.toLocaleString("en-KE")}</span> : <span className="tone-good">✓ cleared</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <div className="flex flex-col gap-4">
          <PaymentForm students={owing.sort((a, b) => a.name.localeCompare(b.name)).map((r) => ({ id: r.studentId, label: `${r.name} · ${r.admissionNo}`, balance: r.balance }))} />

          <Card title="By channel">
            {byMethod.length === 0 ? (
              <Empty>No payments yet.</Empty>
            ) : (
              byMethod
                .sort((a, b) => (b._sum.amount ?? 0) - (a._sum.amount ?? 0))
                .map((m) => (
                  <Bar
                    key={m.method}
                    label={PAYMENT_LABELS[m.method as PaymentMethod] ?? m.method}
                    value={paid > 0 ? ((m._sum.amount ?? 0) / paid) * 100 : 0}
                    right={<span className="muted font-normal">{formatKsh(m._sum.amount ?? 0)}</span>}
                  />
                ))
            )}
          </Card>

          <Card title="Latest receipts" bodyClass="">
            {recent.length === 0 ? (
              <div className="p-4">
                <Empty>No payments yet.</Empty>
              </div>
            ) : (
              <ul className="m-0 list-none p-0">
                {recent.map((p) => (
                  <li key={p.id} className="flex items-baseline justify-between gap-3 border-b px-4 py-2.5 last:border-b-0" style={{ borderColor: "var(--grid)" }}>
                    <span className="min-w-0">
                      <span className="block truncate">{p.invoice.student.user.name}</span>
                      <span className="muted text-[12px]">
                        {formatDate(p.paidOn)} &middot; {PAYMENT_LABELS[p.method as PaymentMethod] ?? p.method}
                        {p.reference ? <> &middot; <code>{p.reference}</code></> : null}
                      </span>
                    </span>
                    <span className="num shrink-0 font-semibold">{formatKsh(p.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
