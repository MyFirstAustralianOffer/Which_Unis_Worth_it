/**
 * Sign-in (Supabase Auth), without any third-party library.
 *
 *   initAuth()            call once per page: finishes a sign-in that just
 *                         came back from Google or an email link, and returns
 *                         the session (or null)
 *   currentUser()         { id, email, name } or null
 *   signInWithGoogle(next)   goes to Google; comes back to signin.html, then `next`
 *   sendEmailLink(email, next)   emails a sign-in link
 *   signOut()
 *   accessToken()         a valid token for database calls (refreshed when needed)
 *
 * No passwords: Google and email links only. The session (tokens, not a
 * password) is kept in this browser's local storage under "rou_session".
 */
import { CONFIG } from "../config.js?v=b884ae18";

const SESSION_KEY = "rou_session";
const AUTH = `${CONFIG.SUPABASE_URL}/auth/v1`;
const baseHeaders = { apikey: CONFIG.SUPABASE_KEY, "Content-Type": "application/json" };

/** Pages a sign-in may send people back to (no outside links). */
const safeNext = (next) => (/^[a-z][a-z-]*\.html(#[\w-]+)?$/.test(next || "") ? next : "index.html");

/** Where Google / the email link send people back to. */
export const returnUrl = (next) => new URL(`signin.html?next=${encodeURIComponent(safeNext(next))}`, location.href).href;

function readSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch { return null; }
}
function saveSession(s) {
  try { s ? localStorage.setItem(SESSION_KEY, JSON.stringify(s)) : localStorage.removeItem(SESSION_KEY); } catch { /* storage blocked */ }
}

const toUser = (u) => u && ({
  id: u.id,
  email: u.email,
  name: u.user_metadata?.full_name || u.user_metadata?.name || "",
});

async function fetchUser(token) {
  const res = await fetch(`${AUTH}/user`, { headers: { ...baseHeaders, Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error("Sign-in didn't work. Please try again.");
  return toUser(await res.json());
}

let refreshing = null;
async function refresh(s) {
  // Another tab may already have refreshed it.
  const latest = readSession();
  if (latest && latest.expires_at > s.expires_at) return latest;
  const res = await fetch(`${AUTH}/token?grant_type=refresh_token`, {
    method: "POST", headers: baseHeaders, body: JSON.stringify({ refresh_token: s.refresh_token }),
  });
  if (!res.ok) { saveSession(null); return null; }
  const t = await res.json();
  const next = { access_token: t.access_token, refresh_token: t.refresh_token,
                 expires_at: t.expires_at || Math.floor(Date.now() / 1000) + (t.expires_in || 3600),
                 user: toUser(t.user) || s.user };
  saveSession(next);
  return next;
}

/** A token that's valid for at least another minute, or null when signed out. */
export async function accessToken() {
  let s = readSession();
  if (!s) return null;
  if (s.expires_at - 60 < Date.now() / 1000) {
    refreshing ||= refresh(s).finally(() => { refreshing = null; });
    s = await refreshing;
  }
  return s?.access_token || null;
}

export const currentUser = () => readSession()?.user || null;

/** Error text from a sign-in that came back with a problem (e.g. an expired link). */
export let authError = "";
/** "email" or "google" when this page load just finished a sign-in. */
export let justSignedIn = "";

let initPromise = null;
export function initAuth() {
  initPromise ||= (async () => {
    const hash = new URLSearchParams(location.hash.slice(1));
    if (hash.get("access_token") || hash.get("error")) {
      history.replaceState(null, "", location.pathname + location.search); // tokens out of the address bar
      if (hash.get("error")) {
        authError = /expired|invalid/i.test(hash.get("error_description") || "")
          ? "That sign-in link has expired or was already used. Please ask for a new one."
          : "Sign-in didn't work. Please try again.";
      } else {
        const token = hash.get("access_token");
        try {
          // Email links come back with a type (magiclink / signup); Google doesn't.
          justSignedIn = hash.get("type") ? "email" : "google";
          saveSession({
            access_token: token,
            refresh_token: hash.get("refresh_token"),
            expires_at: Number(hash.get("expires_at")) || Math.floor(Date.now() / 1000) + Number(hash.get("expires_in") || 3600),
            user: await fetchUser(token),
          });
        } catch (e) { authError = e.message; }
      }
    }
    if (readSession()) await accessToken(); // refresh an old session (or drop it if it can't be)
    return readSession();
  })();
  return initPromise;
}

export function signInWithGoogle(next) {
  location.href = `${AUTH}/authorize?provider=google&redirect_to=${encodeURIComponent(returnUrl(next))}`;
}

export async function sendEmailLink(email, next) {
  const res = await fetch(`${AUTH}/otp?redirect_to=${encodeURIComponent(returnUrl(next))}`, {
    method: "POST", headers: baseHeaders, body: JSON.stringify({ email, create_user: true }),
  }).catch(() => null);
  if (res?.ok) return;
  if (res?.status === 429) throw new Error("Too many sign-in emails just now. Please wait a minute and try again.");
  throw new Error("We couldn't send the email. Check the address and try again.");
}

export async function signOut() {
  const token = readSession()?.access_token;
  saveSession(null);
  if (token) {
    await fetch(`${AUTH}/logout`, { method: "POST", headers: { ...baseHeaders, Authorization: `Bearer ${token}` } }).catch(() => {});
  }
}

export { safeNext };
