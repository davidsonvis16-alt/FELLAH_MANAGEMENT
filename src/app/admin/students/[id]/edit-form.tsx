"use client";

import { useActionState } from "react";
import { updateStudent, type ActionState } from "@/lib/actions/students";
import { FormError } from "@/components/ui";
import { STUDENT_STATUSES } from "@/lib/enums";

export function StudentEditForm({
  student,
  classes,
}: {
  student: { id: string; classId: string | null; status: string; phone: string | null; address: string | null; notes: string | null };
  classes: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateStudent, {});

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="studentId" value={student.id} />
      <FormError message={state.error} />
      {state.ok ? <p className="tone-good m-0 text-[12.5px] font-semibold">Saved.</p> : null}

      <div>
        <label className="label" htmlFor="edit-classId">
          Class
        </label>
        <select id="edit-classId" name="classId" className="select" defaultValue={student.classId ?? ""}>
          <option value="">Not assigned</option>
          {classes.map((klass) => (
            <option key={klass.id} value={klass.id}>
              {klass.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="edit-status">
          Status
        </label>
        <select id="edit-status" name="status" className="select" defaultValue={student.status}>
          {STUDENT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status.charAt(0) + status.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="edit-phone">
          Phone
        </label>
        <input id="edit-phone" name="phone" className="input" defaultValue={student.phone ?? ""} />
      </div>
      <div>
        <label className="label" htmlFor="edit-address">
          Home area
        </label>
        <input id="edit-address" name="address" className="input" defaultValue={student.address ?? ""} />
      </div>
      <div>
        <label className="label" htmlFor="edit-notes">
          Notes
        </label>
        <textarea id="edit-notes" name="notes" rows={3} className="textarea" defaultValue={student.notes ?? ""} />
      </div>
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Saving..." : "Save changes"}
      </button>
    </form>
  );
}
