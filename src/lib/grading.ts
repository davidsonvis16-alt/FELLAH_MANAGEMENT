/**
 * Grade calculation.
 *
 * A unit total is the weighted sum of its assessments. Because a term is usually
 * part-marked, the percentage is normalised over the weight actually graded -
 * so a student sitting one CAT out of three is not shown as failing.
 */

export type GradeBand = { grade: string; floor: number; remark: string };

export const GRADE_BANDS: GradeBand[] = [
  { grade: "A", floor: 80, remark: "Excellent" },
  { grade: "A-", floor: 75, remark: "Very good" },
  { grade: "B+", floor: 70, remark: "Very good" },
  { grade: "B", floor: 65, remark: "Good" },
  { grade: "B-", floor: 60, remark: "Good" },
  { grade: "C+", floor: 55, remark: "Satisfactory" },
  { grade: "C", floor: 50, remark: "Satisfactory" },
  { grade: "C-", floor: 45, remark: "Fair" },
  { grade: "D+", floor: 40, remark: "Weak" },
  { grade: "D", floor: 35, remark: "Weak" },
  { grade: "E", floor: 0, remark: "Fail" },
];

export const PASS_MARK = 40;

export function gradeFor(percent: number | null): GradeBand | null {
  if (percent === null || Number.isNaN(percent)) return null;
  return GRADE_BANDS.find((band) => percent >= band.floor) ?? GRADE_BANDS[GRADE_BANDS.length - 1];
}

export type ScoredMark = {
  score: number | null;
  assessment: { id: string; maxScore: number; weight: number; dueOn: Date | null };
};

export type UnitResult = {
  /** Weighted percentage over the graded portion, or null when nothing is marked. */
  percent: number | null;
  grade: string | null;
  /** Percentage of the unit's weight that has been marked so far. */
  gradedWeight: number;
  totalWeight: number;
  missingCount: number;
};

export function computeUnit(marks: ScoredMark[], allAssessments: { weight: number }[]): UnitResult {
  const totalWeight = allAssessments.reduce((sum, a) => sum + a.weight, 0);
  let gradedWeight = 0;
  let earned = 0;
  let missingCount = 0;
  const now = Date.now();

  for (const mark of marks) {
    const { score, assessment } = mark;
    if (score === null || score === undefined) {
      if (assessment.dueOn && assessment.dueOn.getTime() < now) missingCount += 1;
      continue;
    }
    if (assessment.maxScore <= 0) continue;
    gradedWeight += assessment.weight;
    earned += (score / assessment.maxScore) * assessment.weight;
  }

  const percent = gradedWeight > 0 ? round1((earned / gradedWeight) * 100) : null;
  return {
    percent,
    grade: gradeFor(percent)?.grade ?? null,
    gradedWeight: round1(gradedWeight),
    totalWeight: round1(totalWeight),
    missingCount,
  };
}

/** Mean of the units that have any mark. Units with nothing marked are ignored. */
export function overallAverage(units: { percent: number | null }[]): number | null {
  const scored = units.map((u) => u.percent).filter((p): p is number => p !== null);
  if (scored.length === 0) return null;
  return round1(scored.reduce((a, b) => a + b, 0) / scored.length);
}

/** Dense ranking: equal averages share a position. */
export function positionOf(average: number | null, allAverages: (number | null)[]): { position: number; outOf: number } | null {
  if (average === null) return null;
  const scored = allAverages.filter((a): a is number => a !== null);
  if (scored.length === 0) return null;
  const better = scored.filter((a) => a > average).length;
  return { position: better + 1, outOf: scored.length };
}

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function formatPercent(value: number | null, fallback = "-"): string {
  return value === null ? fallback : `${round1(value)}%`;
}

export function formatKsh(amount: number): string {
  return `KSh ${amount.toLocaleString("en-KE")}`;
}
