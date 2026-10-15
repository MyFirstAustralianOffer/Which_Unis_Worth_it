/** Small DOM + formatting helpers shared by every module. */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** Escape text before putting it inside an HTML template string. */
export function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

/** <option> tags from a list of strings. */
export const options = (items, selected = "") =>
  items.map((v) => `<option value="${esc(v)}"${String(v) === String(selected) ? " selected" : ""}>${esc(v)}</option>`).join("");

/** 72000 → "$72,000" */
export const money = (n) => (n || n === 0) && !isNaN(n) ? `$${Number(n).toLocaleString("en-AU")}` : "–";

/** Keep only digits: "$72,000" → "72000" */
export const digitsOnly = (s) => String(s ?? "").replace(/\D/g, "");

/** localStorage that never throws (private mode, blocked storage…). */
export const store = {
  get(key, fallback = null) {
    try { const v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v); } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
  },
};
