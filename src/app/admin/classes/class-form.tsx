"use client";

import { useActionState } from "react";
import { createClass } from "@/lib/actions/academics";
import type { ActionState } from "@/lib/actions/students";
import { Card, FormError } from "@/components/ui";

export function ClassForm({ teachers }: { teachers: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(createClass, {});

  return (
    <Card title="New class">
      <form action={action} className="grid gap-3">
        <FormError message={state.error} />
        {state.ok ? <p className="tone-good m-0 text-[12.5px] font-semibold">Class created.</p> : null}
        <div>
          <label className="label" htmlFor="class-name">
            Name
          </label>
          <input id="class-name" name="name" required className="input" placeholder="Mechatronics - Year 3" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="class-code">
              Code
            </label>
            <input id="class-code" name="code" required className="input" placeholder="MECH-Y3" />
          </div>
          <div>
            <label className="label" htmlFor="class-level">
              Level
            </label>
            <input id="class-level" name="level" type="number" min={1} max={8} defaultValue={1} required className="input" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="class-capacity">
              Capacity
            </label>
            <input id="class-capacity" name="capacity" type="number" min={1} defaultValue={60} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="class-teacher">
              Class teacher
            </label>
            <select id="class-teacher" name="classTeacherId" className="select" defaultValue="">
              <option value="">Unassigned</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Creating..." : "Create class"}
        </button>
      </form>
    </Card>
  );
}
