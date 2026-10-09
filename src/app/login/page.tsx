import { redirect } from "next/navigation";
import { getSession, isDemoMode } from "@/lib/auth";
import { ROLE_HOME } from "@/lib/enums";
import { FlagStripe, ShieldMark, methaliOfDay } from "@/components/kenya";
import { NairobiClock } from "@/components/live";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect(ROLE_HOME[session.role] ?? "/");
  const demo = isDemoMode();
  const [sw, en] = methaliOfDay();

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section className="login-hero hidden flex-col p-12 lg:flex">
        <div aria-hidden className="shuka" />
        <div aria-hidden className="login-band" />
        <ShieldMark className="login-shield" spear="#fff" size={190} />

        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldMark size={34} spear="#fff" />
            <span className="leading-tight">
              <span className="display block text-[22px] font-extrabold tracking-[0.06em]">FELLAH</span>
              <span className="block text-[12px] opacity-70">Shule yetu · Our school</span>
            </span>
          </div>
          <span className="welcome-kicker">
            <span className="live-dot" aria-hidden />
            <NairobiClock /> Nairobi
          </span>
        </div>

        <div className="relative mt-auto max-w-[540px]">
          <p className="m-0 mb-3 text-[13px] font-bold uppercase tracking-[0.18em] opacity-80">Karibu · Welcome</p>
          <h1 className="m-0 text-[54px] leading-[0.98]">
            Elimu ni ufunguo
            <br />
            wa maisha.
          </h1>
          <p className="m-0 mt-3 text-[16px] font-medium opacity-80">Education is the key to life.</p>
          <p className="m-0 mt-5 max-w-[460px] text-[15px] opacity-90">
            Every register, every mark, every shilling of fees in one place. When a student starts slipping, you see it this week, not at the end of term.
          </p>
        </div>

        <div className="relative mt-10">
          <dl className="m-0 grid max-w-[540px] grid-cols-3 gap-3">
            {[
              ["Mahudhurio", "Attendance for every lesson"],
              ["Matokeo", "Live, weighted grades"],
              ["M-Pesa", "Fee balances update as payments land"],
            ].map(([a, b]) => (
              <div key={a} className="rounded-xl p-3" style={{ background: "rgba(0,0,0,0.22)", border: "1px solid rgba(255,255,255,0.14)" }}>
                <dt className="display text-[16px] font-bold">{a}</dt>
                <dd className="m-0 text-[12px] opacity-75">{b}</dd>
              </div>
            ))}
          </dl>
          <p className="m-0 mt-5 text-[12.5px] opacity-70">
            “{sw}” <span className="opacity-80">- {en}</span>
          </p>
        </div>
      </section>

      <section className="login-plane flex flex-col">
        <FlagStripe className="lg:hidden" />
        <div className="grid flex-1 place-items-center p-5">
          <div className="w-full max-w-[420px]">
            <div className="mb-6 flex items-center gap-3 lg:hidden">
              <ShieldMark size={30} spear="var(--kenya-black)" />
              <span className="display text-[20px] font-extrabold tracking-[0.06em]">FELLAH</span>
            </div>
            <p className="m-0 text-[13px] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--energy)" }}>
              Karibu tena
            </p>
            <h2 className="m-0 mb-5 mt-1 text-[30px] font-bold tracking-[-0.03em]">Welcome back.</h2>
            <LoginForm demo={demo} />
            <p className="muted m-0 mt-6 text-center text-[12px]">Made in Kenya 🇰🇪</p>
          </div>
        </div>
      </section>
    </div>
  );
}
