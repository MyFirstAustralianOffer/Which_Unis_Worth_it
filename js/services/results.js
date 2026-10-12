/**
 * Results service: the ONLY place that reads or writes grad results.
 *
 * Today it holds sample data in memory. To go live, swap the bodies of
 * these functions for Supabase calls; the pages won't need to change.
 */
import { generateSampleResults } from "../data/sample-data.js";
import { fieldOf } from "../data/taxonomy.js";
import { LATEST_GRAD_YEAR } from "../config.js";

let results = generateSampleResults();
const listeners = new Set();
const notify = () => listeners.forEach((fn) => fn());

/** Run `fn` whenever results change. Returns an unsubscribe function. */
export function onResultsChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getAllResults() {
  return results;
}

export function getVerifiedResults() {
  return results.filter((r) => r.verified);
}

export function getMyResult() {
  return results.find((r) => r.isMine) ?? null;
}

/**
 * Filter + sort results.
 * filters: { text, uni, field, years, type, verifiedOnly }
 * sort: "recent" | "fast" | "salary"
 */
export function queryResults(filters = {}, sort = "recent") {
  const text = (filters.text || "").trim().toLowerCase();
  const minYear = filters.years ? LATEST_GRAD_YEAR - (Number(filters.years) - 1) : null;

  const list = results.filter((r) =>
    (!text || `${r.course} ${r.uni} ${r.field} ${r.route}`.toLowerCase().includes(text)) &&
    (!filters.uni || r.uni === filters.uni) &&
    (!filters.field || r.field === filters.field) &&
    (!filters.type || r.type === filters.type) &&
    (!minYear || r.year >= minYear) &&
    (!filters.verifiedOnly || r.verified || r.isMine)
  );

  const sorters = {
    fast: (a, b) => a.months - b.months,
    salary: (a, b) => b.salary - a.salary,
    recent: (a, b) => (b.isMine - a.isMine) || (a.daysAgo - b.daysAgo),
  };
  return list.sort(sorters[sort] || sorters.recent);
}

/** Add the signed-in grad's result. One per account. */
export function addMyResult(answers) {
  if (getMyResult()) throw new Error("You've already shared a result.");
  const entry = {
    id: Date.now(),
    field: fieldOf(answers.course),
    ...answers,
    verified: true,
    daysAgo: 0,
    isMine: true,
  };
  results = [entry, ...results];
  notify();
  return entry;
}

/** Remove the user's own result (used on log-out in the demo). */
export function clearMyResult() {
  const before = results.length;
  results = results.filter((r) => !r.isMine);
  if (results.length !== before) notify();
}
