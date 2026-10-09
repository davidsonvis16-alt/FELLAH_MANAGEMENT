"use client";

import { useEffect, useState } from "react";

function reducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Ticking East Africa Time clock. Renders a placeholder on the server to avoid a hydration mismatch. */
export function NairobiClock({ seconds = false }: { seconds?: boolean }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const text = now
    ? now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: seconds ? "2-digit" : undefined, timeZone: "Africa/Nairobi" })
    : seconds
      ? "--:--:--"
      : "--:--";
  return (
    <time className="mono" suppressHydrationWarning>
      {text}
    </time>
  );
}

const NUMBER = /^(\D*?)(\d[\d,]*(?:\.\d+)?)(.*)$/s;

/** Counts a headline number up from zero, keeping any prefix/suffix ("KSh 12,000", "92.5%", "3/40"). */
export function CountUp({ value }: { value: string | number }) {
  const text = String(value);
  const [display, setDisplay] = useState(text);

  useEffect(() => {
    const match = text.match(NUMBER);
    if (!match || reducedMotion()) {
      setDisplay(text);
      return;
    }
    const [, prefix, digits, suffix] = match;
    const target = Number(digits.replace(/,/g, ""));
    const decimals = digits.split(".")[1]?.length ?? 0;
    const format = (n: number) =>
      n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals, useGrouping: digits.includes(",") });

    let frame = 0;
    const start = performance.now();
    const duration = 1100;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 4);
      setDisplay(`${prefix}${format(target * eased)}${suffix}`);
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [text]);

  return <>{display}</>;
}
