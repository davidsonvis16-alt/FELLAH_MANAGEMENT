"use client";

import { useActionState } from "react";
import { createStudent, type ActionState } from "@/lib/actions/students";
import { Card, FormError } from "@/components/ui";
import { GENDERS, RELATIONSHIPS } from "@/lib/enums";

function titleCase(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

export function StudentForm({ classes }: { classes: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(createStudent, {});

  return (
    <form action={action} className="grid gap-4 lg:grid-cols-2">
      {state.error ? (
        <div className="lg:col-span-2">
          <FormError message={state.error} />
        </div>
      ) : null}

      <Card title="Student">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="name">
              Full name
            </label>
            <input id="name" name="name" required className="input" placeholder="Davis Patrick" />
          </div>
          <div>
            <label className="label" htmlFor="admissionNo">
              Admission number
            </label>
            <input id="admissionNo" name="admissionNo" className="input" placeholder="auto-generated" />
          </div>
          <div>
            <label className="label" htmlFor="classId">
              Class
            </label>
            <select id="classId" name="classId" className="select" defaultValue="">
              <option value="">Not assigned yet</option>
              {classes.map((klass) => (
                <option key={klass.id} value={klass.id}>
                  {klass.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="gender">
              Gender
            </label>
            <select id="gender" name="gender" className="select" defaultValue="MALE">
              {GENDERS.map((gender) => (
                <option key={gender} value={gender}>
                  {titleCase(gender)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="dateOfBirth">
              Date of birth
            </label>
            <input id="dateOfBirth" name="dateOfBirth" type="date" className="input" />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="address">
              Home area
            </label>
            <input id="address" name="address" className="input" placeholder="Nyeri, Kenya" />
          </div>
        </div>
      </Card>

      <Card title="Sign-in account">
        <div className="grid gap-3">
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input id="email" name="email" type="email" required className="input" placeholder="davis.patrick@fellah.ac.ke" />
          </div>
          <div>
            <label className="label" htmlFor="phone">
              Phone
            </label>
            <input id="phone" name="phone" className="input" placeholder="+254 7.. ... ..." />
          </div>
          <div>
            <label className="label" htmlFor="password">
              Temporary password
            </label>
            <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" className="input" />
            <p className="muted m-0 mt-1 text-[12px]">At least 8 characters. Hand it to the student to change on first sign-in.</p>
          </div>
        </div>
      </Card>

      <Card title="Parent / guardian (optional)">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="guardianName">
              Name
            </label>
            <input id="guardianName" name="guardianName" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="guardianRelationship">
              Relationship
            </label>
            <select id="guardianRelationship" name="guardianRelationship" className="select" defaultValue="GUARDIAN">
              {RELATIONSHIPS.map((relationship) => (
                <option key={relationship} value={relationship}>
                  {titleCase(relationship)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="guardianPhone">
              Phone
            </label>
            <input id="guardianPhone" name="guardianPhone" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="guardianEmail">
              Email
            </label>
            <input id="guardianEmail" name="guardianEmail" type="email" className="input" />
          </div>
        </div>
      </Card>

      <div className="flex items-center gap-3 lg:col-span-2">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Saving..." : "Admit student"}
        </button>
        <span className="muted text-[12.5px]">The student appears in their class register immediately.</span>
      </div>
    </form>
  );
}
