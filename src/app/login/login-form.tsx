"use client";

import { useActionState } from "react";
import { demoLogin, login, type LoginState } from "@/lib/actions/auth";
import { FormError } from "@/components/ui";

const DEMO = [
  { role: "ADMIN", label: "Msimamizi", en: "Administrator", who: "Aisha Njeri", what: "Dashboard, students, fees, notices", tone: "black", initials: "AN" },
  { role: "TEACHER", label: "Mwalimu", en: "Teacher", who: "Joseph Mwangi", what: "Take registers, set assessments, enter marks", tone: "red", initials: "JM" },
  { role: "STUDENT", label: "Mwanafunzi", en: "Student", who: "Davis Patrick", what: "Report card, attendance, timetable, fees", tone: "green", initials: "DP" },
];

export function LoginForm({ demo }: { demo: boolean }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  const [demoState, demoAction, demoPending] = useActionState<LoginState, FormData>(demoLogin, {});

  return (
    <div className="flex flex-col gap-3">
      {demo ? (
        <div className="card p-5">
          <h2 className="card-title m-0 mb-1">Ingia kama · Sign in as</h2>
          <p className="ink-2 m-0 mb-4 text-[13px]">Choose who you are to continue.</p>
          <FormError message={demoState.error} />
          <form action={demoAction} className="flex flex-col gap-2">
            {DEMO.map((account) => (
              <button key={account.role} type="submit" name="role" value={account.role} disabled={demoPending} className="demo-option">
                <span aria-hidden className="demo-index" data-tone={account.tone}>
                  {account.initials}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">
                    {account.label} <span className="muted font-normal">&middot; {account.en}</span>
                  </span>
                  <span className="muted block text-[12px]">
                    {account.who} &middot; {account.what}
                  </span>
                </span>
                <span aria-hidden className="demo-arrow">
                  &rarr;
                </span>
              </button>
            ))}
          </form>
        </div>
      ) : null}

      <details className="card p-5" open={!demo}>
        <summary className="cursor-pointer text-[14px] font-semibold">{demo ? "Sign in with email" : "Sign in"}</summary>
        <form action={action} className="mt-4 flex flex-col gap-3">
          <FormError message={state.error} />
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input id="email" name="email" type="email" autoComplete="username" required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="password">
              Password
            </label>
            <input id="password" name="password" type="password" autoComplete="current-password" required className="input" />
          </div>
          <button type="submit" className="btn btn-primary mt-1 justify-center" disabled={pending}>
            {pending ? "Tunaingia..." : "Ingia · Sign in"}
          </button>
        </form>
      </details>
    </div>
  );
}
