"use client";

import { useActionState } from "react";
import { createAssessment } from "@/lib/actions/teaching";
import type { ActionState } from "@/lib/actions/students";
import { ASSESSMENT_KINDS } from "@/lib/enums";
import { Card, FormError } from "@/components/ui";

export function AssessmentForm({ classSubjectId, remaining }: { classSubjectId: string; remaining: number }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(createAssessment, {});

  return (
    <Card title="New assessment">
      <form action={action} className="grid gap-3">
        <input type="hidden" name="classSubjectId" value={classSubjectId} />
        <FormError message={state.error} />
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <div>
            <label className="label" htmlFor="a-name">
              Name
            </label>
            <input id="a-name" name="name" required className="input" placeholder="CAT 3" />
          </div>
          <div>
            <label className="label" htmlFor="a-kind">
              Kind
            </label>
            <select id="a-kind" name="kind" className="select" defaultValue="CAT">
              {ASSESSMENT_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {kind.charAt(0) + kind.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label" htmlFor="a-max">
              Out of
            </label>
            <input id="a-max" name="maxScore" type="number" min={1} step="0.5" defaultValue={30} required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="a-weight">
              Weight %
            </label>
            <input id="a-weight" name="weight" type="number" min={0} max={remaining} defaultValue={Math.min(25, remaining)} required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="a-due">
              Due
            </label>
            <input id="a-due" name="dueOn" type="date" className="input" />
          </div>
        </div>
        <p className="muted m-0 text-[12px]">{remaining}% of the unit weight is still unallocated.</p>
        <button type="submit" className="btn btn-primary justify-center" disabled={pending}>
          {pending ? "Creating..." : "Create and enter marks"}
        </button>
      </form>
    </Card>
  );
}
