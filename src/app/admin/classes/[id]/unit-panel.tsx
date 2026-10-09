"use client";

import { useActionState } from "react";
import { addUnitToClass } from "@/lib/actions/academics";
import { assignUnitTeacher } from "@/lib/actions/teachers";
import type { ActionState } from "@/lib/actions/students";
import { Card, Empty, FormError } from "@/components/ui";

type Unit = {
  id: string;
  subject: string;
  code: string;
  teacherId: string | null;
  teacherName: string | null;
  assessments: number;
  sessions: number;
};

export function UnitPanel({
  classId,
  units,
  subjects,
  teachers,
}: {
  classId: string;
  units: Unit[];
  subjects: { id: string; name: string; code: string }[];
  teachers: { id: string; name: string }[];
}) {
  const [addState, addAction, adding] = useActionState<ActionState, FormData>(addUnitToClass, {});
  const [assignState, assignAction, assigning] = useActionState<ActionState, FormData>(assignUnitTeacher, {});

  const taken = new Set(units.map((unit) => unit.code));
  const available = subjects.filter((subject) => !taken.has(subject.code));

  return (
    <Card title="Units and teachers" bodyClass="">
      {units.length === 0 ? (
        <div className="p-4">
          <Empty>No subjects on this class yet.</Empty>
        </div>
      ) : (
        <ul className="m-0 list-none p-0">
          {units.map((unit) => (
            <li key={unit.id} className="border-b px-4 py-3 last:border-b-0" style={{ borderColor: "var(--grid)" }}>
              <div className="flex items-baseline justify-between gap-3">
                <span>
                  <span className="font-semibold">{unit.subject}</span>
                  <span className="muted"> &middot; {unit.code}</span>
                </span>
                <span className="muted shrink-0 text-[12px]">
                  {unit.assessments} assessments &middot; {unit.sessions} registers
                </span>
              </div>
              <form action={assignAction} className="mt-2 flex gap-2">
                <input type="hidden" name="classSubjectId" value={unit.id} />
                <select name="teacherId" className="select" defaultValue={unit.teacherId ?? ""} aria-label={`Teacher for ${unit.subject}`}>
                  <option value="">Unassigned</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </option>
                  ))}
                </select>
                <button type="submit" className="btn btn-sm" disabled={assigning}>
                  Save
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <div className="border-t p-4" style={{ borderColor: "var(--line)" }}>
        <FormError message={addState.error ?? assignState.error} />
        {available.length === 0 ? (
          <p className="muted m-0 text-[12.5px]">Every subject is already on this class.</p>
        ) : (
          <form action={addAction} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="classId" value={classId} />
            <div className="min-w-[160px] flex-1">
              <label className="label" htmlFor="add-subject">
                Add a subject
              </label>
              <select id="add-subject" name="subjectId" className="select" required defaultValue="">
                <option value="" disabled>
                  Choose...
                </option>
                {available.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name} ({subject.code})
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-[140px] flex-1">
              <label className="label" htmlFor="add-teacher">
                Teacher
              </label>
              <select id="add-teacher" name="teacherId" className="select" defaultValue="">
                <option value="">Unassigned</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn btn-primary" disabled={adding}>
              {adding ? "Adding..." : "Add"}
            </button>
          </form>
        )}
      </div>
    </Card>
  );
}
