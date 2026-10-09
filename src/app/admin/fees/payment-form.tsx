"use client";

import { useActionState, useState } from "react";
import { recordPayment } from "@/lib/actions/office";
import type { ActionState } from "@/lib/actions/students";
import { PAYMENT_LABELS, PAYMENT_METHODS, type PaymentMethod } from "@/lib/enums";
import { formatKsh } from "@/lib/grading";
import { Card, FormError } from "@/components/ui";

export function PaymentForm({ students }: { students: { id: string; label: string; balance: number }[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(recordPayment, {});
  const [studentId, setStudentId] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("MPESA");
  const balance = students.find((s) => s.id === studentId)?.balance ?? null;

  return (
    <Card title="Record a payment">
      <form action={action} className="grid gap-3">
        <FormError message={state.error} />
        {state.ok ? (
          <p className="tone-good m-0 text-[12.5px] font-semibold" role="status">
            ✓ Payment recorded
          </p>
        ) : null}
        <div>
          <label className="label" htmlFor="p-student">
            Student
          </label>
          <select id="p-student" name="studentId" required className="select" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
            <option value="" disabled>
              Choose a student with a balance...
            </option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          {balance !== null ? <p className="muted m-0 mt-1 text-[12px]">Balance {formatKsh(balance)}</p> : null}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="p-amount">
              Amount (KSh)
            </label>
            <input id="p-amount" name="amount" type="number" min={1} max={balance ?? undefined} step="1" required className="input num" />
          </div>
          <div>
            <label className="label" htmlFor="p-date">
              Paid on
            </label>
            <input id="p-date" name="paidOn" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className="input" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="p-method">
              Channel
            </label>
            <select id="p-method" name="method" className="select" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {PAYMENT_LABELS[m]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="p-ref">
              Reference
            </label>
            <input id="p-ref" name="reference" className="input" disabled={method === "CASH"} placeholder={method === "MPESA" ? "SJK4XY12AB" : method === "BANK" ? "Slip no." : "-"} />
          </div>
        </div>
        <button type="submit" className="btn btn-primary justify-center" disabled={pending}>
          {pending ? "Recording..." : "Record payment"}
        </button>
      </form>
    </Card>
  );
}
