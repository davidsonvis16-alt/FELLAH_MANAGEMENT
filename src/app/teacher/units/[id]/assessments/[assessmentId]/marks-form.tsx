"use client";

import { useActionState, useState } from "react";
import { saveMarks } from "@/lib/actions/teaching";
import type { ActionState } from "@/lib/actions/students";
import { gradeFor } from "@/lib/grading";
import { Card, FormError } from "@/components/ui";

type Row = { id: string; name: string; admissionNo: string; score: number | null };

export function MarksForm({ assessmentId, maxScore, students }: { assessmentId: string; maxScore: number; students: Row[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveMarks, {});
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(students.map((s) => [s.id, s.score === null ? "" : String(s.score)])),
  );

  return (
    <form action={action}>
      <input type="hidden" name="assessmentId" value={assessmentId} />
      <Card title="Marks" action={<span className="muted text-[12px]">Blank = not handed in. Enter 0 for a zero.</span>} bodyClass="">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Student</th>
                <th className="num">Score / {maxScore}</th>
                <th className="num">%</th>
                <th className="num">Grade</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student, index) => {
                const raw = values[student.id] ?? "";
                const n = raw === "" ? null : Number(raw);
                const invalid = n !== null && (!Number.isFinite(n) || n < 0 || n > maxScore);
                const pct = n !== null && !invalid ? (n / maxScore) * 100 : null;
                return (
                  <tr key={student.id}>
                    <td className="muted num text-[12px]">{String(index + 1).padStart(2, "0")}</td>
                    <td>
                      <span className="font-semibold">{student.name}</span>
                      <div className="muted text-[12px]">{student.admissionNo}</div>
                    </td>
                    <td className="num">
                      <input
                        name={`score-${student.id}`}
                        inputMode="decimal"
                        aria-label={`Score for ${student.name}`}
                        aria-invalid={invalid}
                        className="input num w-[88px]"
                        style={invalid ? { borderColor: "var(--critical)" } : undefined}
                        value={raw}
                        onChange={(e) => setValues((prev) => ({ ...prev, [student.id]: e.target.value }))}
                      />
                    </td>
                    <td className="num ink-2">{pct === null ? <span className="muted">-</span> : `${Math.round(pct)}%`}</td>
                    <td className="num font-semibold">{pct === null ? <span className="muted">-</span> : gradeFor(pct)?.grade}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center gap-3 border-t p-4" style={{ borderColor: "var(--line)" }}>
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? "Saving..." : "Save marks"}
          </button>
          {state.ok ? (
            <span className="tone-good text-[13px] font-semibold" role="status">
              ✓ Marks saved
            </span>
          ) : null}
        </div>
        {state.error ? (
          <div className="px-4 pb-4">
            <FormError message={state.error} />
          </div>
        ) : null}
      </Card>
    </form>
  );
}
