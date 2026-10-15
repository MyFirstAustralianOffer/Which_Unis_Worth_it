/**
 * The Australian course database (data/courses.json, built from the CRICOS
 * register). Loaded once, only on pages that need it, then searched in the browser.
 */
import { buildIndex } from "../lib/course-search.js";

let pending = null;

/** Resolves to the search index, or null if the file couldn't be loaded (the form still works). */
export function loadCourseIndex() {
  if (!pending) {
    pending = fetch("data/courses.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.status))))
      .then(buildIndex)
      .catch(() => null);
  }
  return pending;
}
