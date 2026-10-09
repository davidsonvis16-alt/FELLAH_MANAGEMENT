import { currentStudent } from "@/lib/student";
import { feeStatement } from "@/lib/queries";
import { Card, Empty, PageHeader, StatTile } from "@/components/ui";
import { formatDate } from "@/lib/dates";
import { formatKsh } from "@/lib/grading";
import { PAYMENT_LABELS, type PaymentMethod } from "@/lib/enums";

export const dynamic = "force-dynamic";

export default async function StudentFees() {
  const { studentId } = await currentStudent();
  const fees = await feeStatement(studentId);
  const pct = fees.billed > 0 ? Math.min(100, (fees.paid / fees.billed) * 100) : 0;

  return (
    <>
      <PageHeader title="Fees" subtitle="Fee statement" />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatTile label="Billed" value={formatKsh(fees.billed)} />
        <StatTile label="Paid" value={formatKsh(fees.paid)} tone="good" />
        <StatTile label="Balance" value={fees.balance > 0 ? formatKsh(fees.balance) : "Cleared"} tone={fees.balance > 0 ? "warning" : "good"} />
      </div>
      <div className="card mb-4 p-4">
        <div className="mb-1.5 flex justify-between text-[12.5px]">
          <span className="ink-2">Paid {Math.round(pct)}%</span>
          <span className="muted">{formatKsh(fees.billed)}</span>
        </div>
        <div className="bar-track" style={{ height: 10 }}>
          <div className="bar-fill" style={{ width: `${pct}%`, background: "var(--series-3)" }} />
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Invoices" bodyClass="">
          {fees.invoices.length === 0 ? (
            <div className="p-4">
              <Empty>No invoices.</Empty>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Due</th>
                    <th className="num">Amount</th>
                    <th className="num">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {fees.invoices.map((i) => (
                    <tr key={i.id}>
                      <td>
                        {i.description}
                        <div className="muted text-[12px]">{i.term}</div>
                      </td>
                      <td className="muted whitespace-nowrap">{formatDate(i.dueOn)}</td>
                      <td className="num">{i.amount.toLocaleString("en-KE")}</td>
                      <td className="num font-semibold">{i.amount - i.paid > 0 ? <span className="tone-warning">{(i.amount - i.paid).toLocaleString("en-KE")}</span> : <span className="tone-good">✓ paid</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        <Card title="Payments" bodyClass="">
          {fees.payments.length === 0 ? (
            <div className="p-4">
              <Empty>No payments yet.</Empty>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Channel</th>
                    <th>Reference</th>
                    <th className="num">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {fees.payments.map((p) => (
                    <tr key={p.id}>
                      <td className="whitespace-nowrap">{formatDate(p.paidOn)}</td>
                      <td>{PAYMENT_LABELS[p.method as PaymentMethod] ?? p.method}</td>
                      <td>{p.reference ? <code>{p.reference}</code> : <span className="muted">-</span>}</td>
                      <td className="num font-semibold">{p.amount.toLocaleString("en-KE")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
      <p className="muted mt-4 text-[12px]">Pay via M-Pesa Paybill 400200, account = your admission number. Payments show here once the bursar records them.</p>
    </>
  );
}
