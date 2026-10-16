/**
 * Database filters, shared by the homepage preview and the full database page:
 *
 *   Degree type → Course → University → Graduated → Student type
 *
 * "Course" only lists courses at the chosen degree type (e.g. Bachelor →
 * every Bachelor course in the database).
 *
 * Markup: a <form> containing <select data-filter="level|course|uni|years|type">
 * and a submit button.
 *
 *   setupFilters(form, entries, onChange)  fills the dropdowns and calls
 *                                          onChange(values) on Search / change
 *   filterEntries(entries, values)         the matching entries
 */
import { UNIVERSITIES, STUDENT_TYPES, LEVELS } from "../data/options.js?v=8ca2f27d";
import { options, esc } from "../lib/dom.js?v=5a71cd6c";

/** Latest graduation year in the form (see GRAD_YEARS in options.js). */
const LATEST_YEAR = 2026;

const norm = (s) => String(s ?? "").trim().toLowerCase();

export function readFilters(form) {
  const get = (name) => form.querySelector(`[data-filter="${name}"]`)?.value ?? "";
  return { level: get("level"), course: get("course"), uni: get("uni"), years: get("years"), type: get("type") };
}

export function filterEntries(entries, v) {
  const years = Number(v.years);
  return entries.filter((e) => {
    const y = Number(e.graduation_year); // "Before 2016" → NaN, so it's excluded from "Last N years"
    return (!v.level || e.study_level === v.level) &&
      (!v.course || norm(e.course_name) === norm(v.course)) &&
      (!v.uni || e.university === v.uni) &&
      (!v.type || e.student_type === v.type) &&
      (!years || (y && y >= LATEST_YEAR - years));
  });
}

/** Distinct course names (as entered) for one degree type, or for all of them. */
function coursesFor(entries, level) {
  const seen = new Map();
  entries.forEach((e) => {
    if (level && e.study_level !== level) return;
    const k = norm(e.course_name);
    if (k && !seen.has(k)) seen.set(k, String(e.course_name).trim());
  });
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}

export function setupFilters(form, entries, onChange) {
  const sel = (name) => form.querySelector(`[data-filter="${name}"]`);

  // Degree types that actually have entries, in the form's order.
  const levels = LEVELS.filter((l) => entries.some((e) => e.study_level === l));
  sel("level").innerHTML = `<option value="">All degree types</option>${options(levels)}`;

  // Course list follows the degree type; a course that no longer fits is cleared.
  const fillCourses = () => {
    const level = sel("level").value;
    const current = sel("course").value;
    const list = coursesFor(entries, level);
    const all = level ? `All ${esc(level)} courses` : "All courses";
    sel("course").innerHTML = `<option value="">${all}</option>${options(list, list.includes(current) ? current : "")}`;
  };
  fillCourses();

  sel("uni").innerHTML = `<option value="">All universities</option>${options(UNIVERSITIES.filter((u) => u !== "Other"))}<option value="Other">Other / not listed</option>`;
  sel("type").innerHTML = `<option value="">All</option>${options(STUDENT_TYPES)}`;

  const fire = () => onChange(readFilters(form));
  form.addEventListener("submit", (e) => { e.preventDefault(); fire(); });
  form.addEventListener("change", (e) => {
    if (e.target === sel("level")) fillCourses();
    fire();
  });
}
