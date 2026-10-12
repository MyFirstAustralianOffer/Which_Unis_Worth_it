/**
 * Small statistics helpers for summarising grad results.
 */

export function median(numbers) {
  if (!numbers.length) return null;
  const s = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

const pct = (part, whole) => (whole ? Math.round((part / whole) * 100) : 0);

/** Headline numbers for any list of results. */
export function summarise(results) {
  return {
    count: results.length,
    medianMonths: median(results.map((r) => r.months)),
    medianSalary: median(results.map((r) => r.salary)),
    pctBeforeGrad: pct(results.filter((r) => r.months === 0).length, results.length),
  };
}

/** One summary per course, fastest first. */
export function summariseByCourse(results) {
  const groups = new Map();
  for (const r of results) {
    if (!groups.has(r.course)) groups.set(r.course, []);
    groups.get(r.course).push(r);
  }
  return [...groups.entries()]
    .map(([course, list]) => ({ course, ...summarise(list) }))
    .sort((a, b) => a.medianMonths - b.medianMonths);
}

/** % of `peers` who took longer than `months` to find a job. */
export function pctSlowerThan(peers, months) {
  return pct(peers.filter((p) => p.months > months).length, peers.length);
}
