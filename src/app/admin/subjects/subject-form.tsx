"use client";

import { useActionState } from "react";
import { createSubject } from "@/lib/actions/academics";
import type { ActionState } from "@/lib/actions/students";
import { Card, FormError } from "@/components/ui";

export function SubjectForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(createSubject, {});
  return (
    <Card title="New subject">
      <form action={action} className="grid gap-3">
        <FormError message={state.error} />
        {state.ok ? (
          <p className="tone-good m-0 text-[12.5px] font-semibold" role="status">
            ✓ Subject added
          </p>
        ) : null}
        <div className="grid grid-cols-[1fr_120px] gap-3">
          <div>
            <label className="label" htmlFor="s-name">
              Name
            </label>
            <input id="s-name" name="name" required className="input" placeholder="Thermodynamics" />
          </div>
          <div>
            <label className="label" htmlFor="s-code">
              Code
            </label>
            <input id="s-code" name="code" required className="input" placeholder="THE109" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="s-desc">
            Description
          </label>
          <textarea id="s-desc" name="description" rows={3} className="textarea" />
        </div>
        <button type="submit" className="btn btn-primary justify-center" disabled={pending}>
          {pending ? "Adding..." : "Add subject"}
        </button>
      </form>
    </Card>
  );
}
