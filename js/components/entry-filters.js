/**
 * Database filters: Degree type → Course → University → Graduated → Student type.
 * Filtering happens in the database; this file only fills and reads the dropdowns.
 *
 * Markup: a <form> containing <select data-filter="level|course|uni|years|type">
 * and a submit button.
 *
 *   setupFilters(form, pairs, onChange)   pairs: [{ level, course }] from the database.
 *                                         Calls onChange(values) on Search / change.
 *   readFilters(form)                      { level, course, uni, minYear, type }
 */
import { UNIVERSITIES, STUDENT_TYPES, LEVELS } from "../data/options.js?v=8ca2f27d";
import { options, esc } from "../lib/dom.js?v=5a71cd6c";

/** Latest graduation year in the form (see GRAD_YEARS in options.js). */
const LATEST_YEAR = 2026;

export function readFilters(form) {
  const get = (name) => form.querySelector(`[data-filter="${name}"]`)?.value ?? "";
  const years = Number(get("years"));
  return { level: get("level"), course: get("course"), uni: get("uni"), minYear: years ? LATEST_YEAR - years : null, type: get("type") };
}

export function setupFilters(form, pairs, onChange) {
  const sel = (name) => form.querySelector(`[data-filter="${name}"]`);

  // Degree types that actually have entries, in the form's order.
  const levels = LEVELS.filter((l) => pairs.some((p) => p.level === l));
  sel("level").innerHTML = `<option value="">All degree types</option>${options(levels)}`;

  // Course list follows the degree type; a course that no longer fits is cleared.
  const fillCourses = () => {
    const level = sel("level").value;
    const current = sel("course").value;
    const list = [...new Set(pairs.filter((p) => !level || p.level === level).map((p) => p.course))]
      .sort((a, b) => a.localeCompare(b));
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
