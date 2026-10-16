/**
 * Data service: the ONLY code that talks to Google Sheets.
 *
 * Connected (CONFIG.SHEETS_API_URL set):
 *   submitResponse → POST to the Apps Script web app → new row in the sheet
 *   fetchEntries   → GET from the web app → public graduate cards only
 *                    (no emails; small groups already removed by the script)
 *
 * Demo mode (no URL): example cards, and submissions stay in this browser.
 */
import { CONFIG, isConnected } from "../config.js?v=c8c5fba1";
import { SAMPLE_ENTRIES } from "../data/sample-entries.js?v=9b757df7";
import { store } from "../lib/dom.js?v=5a71cd6c";

const DEMO_KEY = "rou_demo_entries";
const CACHE_KEY = "rou_entries_cache";

/** Public fields of a graduate answer (what a database card shows). */
const PUBLIC_FIELDS = [
  "study_level", "course_name", "university", "graduation_year", "student_type",
  "time_to_first_job", "first_role", "starting_salary", "current_role", "current_salary", "university_other", "time_looking",
];
const toPublic = (row) => Object.fromEntries(PUBLIC_FIELDS.map((k) => [k, row[k] ?? ""]));

/**
 * Send one completed form. Resolves { ok: true } or throws an Error
 * with a message that's safe to show to the person.
 */
export async function submitResponse(payload) {
  if (!isConnected()) {
    if (payload.path === "graduated") {
      store.set(DEMO_KEY, [{ ...toPublic(payload), mine: true }, ...store.get(DEMO_KEY, [])]);
    }
    await new Promise((r) => setTimeout(r, 300));
    return { ok: true, demo: true };
  }

  let res;
  try {
    res = await fetch(CONFIG.SHEETS_API_URL, {
      method: "POST",
      // text/plain avoids a CORS preflight, which Apps Script can't answer.
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error("We couldn't reach the server. Check your connection and try again.");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || "Something went wrong saving your answers. Please try again.");
  }
  try { sessionStorage.removeItem(CACHE_KEY); } catch { /* ignore */ }
  return data;
}

/** Public graduate cards, newest first. */
export async function fetchEntries() {
  if (!isConnected()) {
    return { entries: [...store.get(DEMO_KEY, []), ...SAMPLE_ENTRIES], demo: true };
  }

  try {
    const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || "null");
    if (cached && Date.now() - cached.at < CONFIG.CACHE_MINUTES * 60_000) return { entries: cached.entries, demo: false };
  } catch { /* ignore */ }

  const url = `${CONFIG.SHEETS_API_URL}${CONFIG.SHEETS_API_URL.includes("?") ? "&" : "?"}action=entries`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || "Couldn't load the database.");
  const entries = data.entries.map(toPublic);
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), entries })); } catch { /* ignore */ }
  return { entries, demo: false };
}
