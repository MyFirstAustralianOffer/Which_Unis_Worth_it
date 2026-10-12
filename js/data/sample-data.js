/**
 * Generates FAKE sample results for the demo. The numbers are random and
 * say nothing about any real university. Seeded, so everyone sees the same
 * numbers on every load.
 *
 * Delete this file once real results come from the database.
 */
import { UNIVERSITIES, COURSES, JOB_ROUTES } from "./taxonomy.js";
import { LATEST_GRAD_YEAR } from "../config.js";

/** Small deterministic random number generator (mulberry32). */
function seededRandom(seed) {
  return function next() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateSampleResults({ count = 900, seed = 20261012 } = {}) {
  const rand = seededRandom(seed);
  const pick = (list) => list[Math.floor(rand() * list.length)];
  const results = [];

  // Random (fake) per-institution offset of up to ±1.5 months. Not based on anything real.
  const uniBias = Object.fromEntries(UNIVERSITIES.map((u) => [u, (rand() - 0.5) * 3]));

  for (let i = 0; i < count; i++) {
    const course = pick(COURSES);
    const uni = pick(UNIVERSITIES);
    const international = rand() < 0.32;

    let months = course.months + uniBias[uni] +(international ? 3 : 0) + (rand() - 0.45) * course.months * 1.3;
    if (rand() < 0.12) months = 0; // had a job before graduating
    months = Math.max(0, Math.round(months));

    const level = rand() < 0.72 ? "Undergrad" : "Postgrad";
    let salary = course.salary * (international ? 0.95 : 1) * (0.85 + rand() * 0.32);
    if (months === 0) salary += 3;
    if (level === "Postgrad") salary += 6;

    results.push({
      id: i + 1,
      course: course.name,
      field: course.field,
      uni,
      year: LATEST_GRAD_YEAR - Math.floor(rand() * 6),
      level,
      type: international ? "International" : "Domestic",
      months,
      salary: Math.round(salary),
      inField: rand() < 0.78 ? "Yes" : rand() < 0.6 ? "Partly" : "No",
      route: months === 0 ? pick(["Grad program", "Internship conversion", "Placement employer"]) : pick(JOB_ROUTES),
      verified: rand() < 0.86,
      daysAgo: Math.floor(rand() * 240),
      isMine: false,
    });
  }
  return results;
}
