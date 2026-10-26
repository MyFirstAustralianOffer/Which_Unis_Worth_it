/**
 * Data service: the only code that talks to the database (Supabase).
 * Every call goes through a database function in supabase/schema.sql,
 * which checks who's asking. Tables can't be read directly.
 *
 *   myProfile()                      { signed_in, email, name, contributed, path }
 *   submitResponse(path, answers)    saves one form
 *   fetchEntries(filters, offset)    { total, entries } (contributors only, no emails)
 *   fetchFilterOptions()             [{ level, course }]
 */
import { CONFIG } from "../config.js?v=90dd3cea";
import { accessToken } from "./auth.js?v=690171de";

/** Calls a database function. Errors carry the database's message (written for people). */
async function rpc(name, args = {}) {
  const token = await accessToken();
  let res;
  try {
    res = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/rpc/${name}`, {
      method: "POST",
      headers: {
        apikey: CONFIG.SUPABASE_KEY,
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(args),
    });
  } catch {
    throw new Error("We couldn't reach the server. Check your connection and try again.");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = new Error(data?.message && !/^(locked|permission denied|JWT)/i.test(data.message)
      ? data.message : "Something went wrong. Please try again.");
    err.locked = data?.message === "locked";
    throw err;
  }
  return data;
}

let profilePromise = null;
/** Who's signed in and whether they've contributed. Cached for the page. */
export function myProfile({ fresh = false } = {}) {
  if (fresh || !profilePromise) profilePromise = rpc("my_profile").catch(() => ({ signed_in: false }));
  return profilePromise;
}

export async function submitResponse(path, answers) {
  const result = await rpc("submit_response", { p_path: path, p_answers: answers });
  profilePromise = null;
  return result;
}

/** filters: { level, course, uni, minYear, type } (empty = any) */
export function fetchEntries(filters = {}, offset = 0) {
  return rpc("public_entries", {
    p_level: filters.level || null,
    p_course: filters.course || null,
    p_uni: filters.uni || null,
    p_min_year: filters.minYear || null,
    p_type: filters.type || null,
    p_limit: CONFIG.PAGE_SIZE,
    p_offset: offset,
  });
}

export const fetchFilterOptions = () => rpc("filter_options");
