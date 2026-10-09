"use client";

import { useActionState, useState } from "react";
import { saveAttendance } from "@/lib/actions/teaching";
import type { ActionState } from "@/lib/actions/students";
import { ATTENDANCE_LABELS, ATTENDANCE_STATUSES, ATTENDANCE_TONE, type AttendanceStatus } from "@/lib/enums";
import { Card, FormError } from "@/components/ui";

type Row = { id: string; name: string; admissionNo: string; weekAbsences: number; status: AttendanceStatus };

const KEY: Record<AttendanceStatus, string> = { PRESENT: "P", ABSENT: "A", LATE: "L", EXCUSED: "E" };

export function RegisterForm({ classSubjectId, date, period, students }: { classSubjectId: string; date: string; period: number; students: Row[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveAttendance, {});
  const [marks, setMarks] = useState<Record<string, AttendanceStatus>>(() => Object.fromEntries(students.map((s) => [s.id, s.status])));

  const counts = ATTENDANCE_STATUSES.map((status) => [status, Object.values(marks).filter((m) => m === status).length] as const);
  const setAll = (status: AttendanceStatus) => setMarks(Object.fromEntries(students.map((s) => [s.id, status])));

  return (
    <form action={action}>
      <input type="hidden" name="classSubjectId" value={classSubjectId} />
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="period" value={period} />

      <Card
        title={`${students.length} students`}
        action={
          <span className="flex flex-wrap gap-2">
            {counts.map(([status, n]) => (
              <span key={status} className={`badge tone-${ATTENDANCE_TONE[status]}`}>
                <span className="badge-dot" aria-hidden />
                <span style={{ color: "var(--ink-2)" }}>
                  {ATTENDANCE_LABELS[status]} {n}
                </span>
              </span>
            ))}
          </span>
        }
        bodyClass=""
      >
        <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2.5" style={{ borderColor: "var(--grid)" }}>
          <span className="muted text-[12px]">Set everyone:</span>
          <button type="button" className="btn btn-sm" onClick={() => setAll("PRESENT")}>
            All present
          </button>
          <button type="button" className="btn btn-sm" onClick={() => setAll("ABSENT")}>
            All absent
          </button>
        </div>

        {students.length === 0 ? (
          <p className="muted m-0 p-4">No active students in this class.</p>
        ) : (
          <ul className="m-0 list-none p-0">
            {students.map((student, index) => (
              <li key={student.id} className="register-row">
                <span className="muted num w-6 text-[12px]">{String(index + 1).padStart(2, "0")}</span>
                <span className="min-w-0 flex-1">
                  <span className="font-semibold">{student.name}</span>
                  <span className="muted text-[12px]"> &middot; {student.admissionNo}</span>
                  {student.weekAbsences >= 2 ? (
                    <span className="badge tone-warning ml-2">
                      <span aria-hidden>⚠</span>
                      <span style={{ color: "var(--ink-2)" }}>{student.weekAbsences} absences this week</span>
                    </span>
                  ) : null}
                </span>
                <fieldset className="segmented" aria-label={`Attendance for ${student.name}`}>
                  {ATTENDANCE_STATUSES.map((status) => (
                    <label key={status} className="segment" data-tone={ATTENDANCE_TONE[status]} title={ATTENDANCE_LABELS[status]}>
                      <input
                        type="radio"
                        name={`status-${student.id}`}
                        value={status}
                        checked={marks[student.id] === status}
                        onChange={() => setMarks((prev) => ({ ...prev, [student.id]: status }))}
                      />
                      <span>{KEY[status]}</span>
                    </label>
                  ))}
                </fieldset>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-center gap-3 border-t p-4" style={{ borderColor: "var(--line)" }}>
          <button type="submit" className="btn btn-primary" disabled={pending || students.length === 0}>
            {pending ? "Saving..." : "Save register"}
          </button>
          {state.ok ? (
            <span className="tone-good text-[13px] font-semibold" role="status">
              ✓ Register saved
            </span>
          ) : null}
          <span className="muted ml-auto text-[12px]">P present &middot; A absent &middot; L late &middot; E excused</span>
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
