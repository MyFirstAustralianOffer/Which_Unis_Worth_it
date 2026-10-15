/**
 * Database filters (Course · University · Graduated · Student type),
 * shared by the homepage preview and the full database page.
 *
 * Markup: a <form> containing <select data-filter="course|uni|years|type">
 * and a submit button.
 *
 *   setupFilters(form, entries, onChange)  fills the dropdowns and calls
 *                                          onChange(values) on Search / change
 *   filterEntries(entries, values)         the matching entries
 */
import { UNIVERSITIES, STUDENT_TYPES } from "../data/options.js?v=e19dd9c8";
import { options } from "../lib/dom.js?v=5a71cd6c";

/** Latest graduation year in the form (see GRAD_YEARS in options.js). */
const LATEST_YEAR = 2026;

const norm = (s) => String(s ?? "").trim().toLowerCase();

export function readFilters(form) {
  const get = (name) => form.querySelector(`[data-filter="${name}"]`)?.value ?? "";
  return { course: get("course"), uni: get("uni"), years: get("years"), type: get("type") };
}

export function filterEntries(entries, v) {
  const years = Number(v.years);
  return entries.filter((e) => {
    const y = Number(e.graduation_year); // "Before 2016" → NaN, so it's excluded from "Last N years"
    return (!v.course || norm(e.course_name) === norm(v.course)) &&
      (!v.uni || e.university === v.uni) &&
      (!v.type || e.student_type === v.type) &&
      (!years || (y && y >= LATEST_YEAR - years));
  });
}

export function setupFilters(form, entries, onChange) {
  const sel = (name) => form.querySelector(`[data-filter="${name}"]`);

  // Course: only courses that have entries, so no option ever leads to nothing.
  const seen = new Map();
  entries.forEach((e) => { const k = norm(e.course_name); if (k && !seen.has(k)) seen.set(k, String(e.course_name).trim()); });
  const courses = [...seen.values()].sort((a, b) => a.localeCompare(b));
  sel("course").innerHTML = `<option value="">All courses</option>${options(courses)}`;
  sel("uni").innerHTML = `<option value="">All universities</option>${options(UNIVERSITIES.filter((u) => u !== "Other"))}`;
  sel("type").innerHTML = `<option value="">All</option>${options(STUDENT_TYPES)}`;

  const fire = () => onChange(readFilters(form));
  form.addEventListener("submit", (e) => { e.preventDefault(); fire(); });
  form.addEventListener("change", fire);
}
