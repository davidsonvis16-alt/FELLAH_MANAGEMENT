"use client";

import { useActionState } from "react";
import { createAnnouncement } from "@/lib/actions/office";
import type { ActionState } from "@/lib/actions/students";
import { AUDIENCES, AUDIENCE_LABELS } from "@/lib/enums";
import { Card, FormError } from "@/components/ui";

export function NoticeForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(createAnnouncement, {});
  return (
    <Card title="Post a notice">
      <form action={action} className="grid gap-3">
        <FormError message={state.error} />
        {state.ok ? (
          <p className="tone-good m-0 text-[12.5px] font-semibold" role="status">
            ✓ Notice posted
          </p>
        ) : null}
        <div>
          <label className="label" htmlFor="n-title">
            Title
          </label>
          <input id="n-title" name="title" required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="n-body">
            Message
          </label>
          <textarea id="n-body" name="body" rows={5} required className="textarea" />
        </div>
        <div>
          <label className="label" htmlFor="n-aud">
            Audience
          </label>
          <select id="n-aud" name="audience" className="select" defaultValue="ALL">
            {AUDIENCES.map((a) => (
              <option key={a} value={a}>
                {AUDIENCE_LABELS[a]}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-[13px]">
          <input type="checkbox" name="pinned" /> Pin to the top
        </label>
        <button type="submit" className="btn btn-primary justify-center" disabled={pending}>
          {pending ? "Posting..." : "Post notice"}
        </button>
      </form>
    </Card>
  );
}
