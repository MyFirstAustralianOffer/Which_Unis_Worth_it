/**
 * Course names for the form's type-ahead and "Did you mean…?" hints.
 *
 * Connected: fetched from the Google script (official list + its short forms
 * + courses people have already entered). Demo mode: the built-in list.
 */
import { CONFIG, isConnected } from "../config.js";
import { COURSES, COURSE_ALIASES } from "../lib/course-clean.js";

const CACHE_KEY = "rou_courses_cache";
const FALLBACK = { courses: COURSES, aliases: COURSE_ALIASES, seen: [] };

let pending = null;

/** Resolves to { courses, aliases, seen }. Never rejects: falls back to the built-in list. */
export function loadCourseData() {
  if (pending) return pending;
  pending = (async () => {
    if (!isConnected()) return FALLBACK;
    try {
      const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || "null");
      if (cached && Date.now() - cached.at < CONFIG.CACHE_MINUTES * 60_000) return cached.data;
    } catch { /* ignore */ }
    try {
      const sep = CONFIG.SHEETS_API_URL.includes("?") ? "&" : "?";
      const res = await fetch(`${CONFIG.SHEETS_API_URL}${sep}action=courses`);
      const json = await res.json();
      if (!json.ok) return FALLBACK;
      const data = { courses: json.courses || COURSES, aliases: json.aliases || COURSE_ALIASES, seen: json.seen || [] };
      try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data })); } catch { /* ignore */ }
      return data;
    } catch {
      return FALLBACK;
    }
  })();
  return pending;
}
