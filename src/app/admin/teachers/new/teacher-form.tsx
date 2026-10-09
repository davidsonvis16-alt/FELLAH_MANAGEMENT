"use client";

import { useActionState } from "react";
import { createTeacher } from "@/lib/actions/teachers";
import type { ActionState } from "@/lib/actions/students";
import { Card, FormError } from "@/components/ui";

export function TeacherForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(createTeacher, {});

  return (
    <form action={action}>
      <Card title="Teacher">
        <div className="grid gap-3">
          <FormError message={state.error} />
          <div>
            <label className="label" htmlFor="name">
              Full name
            </label>
            <input id="name" name="name" required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="staffNo">
              Staff number
            </label>
            <input id="staffNo" name="staffNo" required className="input" placeholder="TSC/2106" />
          </div>
          <div>
            <label className="label" htmlFor="qualification">
              Qualification
            </label>
            <input id="qualification" name="qualification" className="input" placeholder="BEng Electrical Engineering" />
          </div>
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input id="email" name="email" type="email" required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="phone">
              Phone
            </label>
            <input id="phone" name="phone" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="password">
              Temporary password
            </label>
            <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" className="input" />
          </div>
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? "Saving..." : "Add teacher"}
          </button>
        </div>
      </Card>
    </form>
  );
}
