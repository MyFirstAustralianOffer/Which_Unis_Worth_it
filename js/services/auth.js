/**
 * Auth service: MOCK sign-up / log-in.
 *
 * Nothing is sent anywhere. The "account" lives only in this browser tab
 * (sessionStorage) and disappears when it closes.
 *
 * To go live, replace these functions with Supabase Auth, e.g.
 *   signUp  → supabase.auth.signUp({ email, password, options: { data: { role } } })
 *   verify  → supabase.auth.verifyOtp({ email, token, type: "signup" })
 *   logIn   → supabase.auth.signInWithPassword({ email, password })
 *   logOut  → supabase.auth.signOut()
 * The rest of the app only uses the functions exported here.
 */
import { SESSION_KEY } from "../config.js";
import { isEmail, isPassword } from "../lib/validate.js";

let user = loadSession();
const listeners = new Set();

function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveSession() {
  try {
    if (user) sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* storage blocked (private mode etc.): session just won't survive a refresh */
  }
}

function setUser(next) {
  user = next;
  saveSession();
  listeners.forEach((fn) => fn(user));
}

function check(email, password) {
  const errors = {};
  if (!isEmail(email)) errors.email = true;
  if (!isPassword(password)) errors.password = true;
  return errors;
}

/** Run `fn(user)` whenever the user signs in or out. Returns an unsubscribe function. */
export function onAuthChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getUser() {
  return user;
}

/** Returns { user } on success or { errors } if the input is invalid. */
export function signUp({ email, password, role }) {
  const errors = check(email, password);
  if (Object.keys(errors).length) return { errors };
  setUser({ email: email.trim(), role, hasShared: false });
  return { user };
}

export function logIn({ email, password }) {
  const errors = check(email, password);
  if (Object.keys(errors).length) return { errors };
  // Mock: any valid-looking email + password "works". Keep the role if it's the same person.
  const role = user?.email === email.trim() ? user.role : "graduate";
  setUser({ email: email.trim(), role, hasShared: false });
  return { user };
}

export function logOut() {
  setUser(null);
}

export function markShared() {
  if (user) setUser({ ...user, hasShared: true });
}
