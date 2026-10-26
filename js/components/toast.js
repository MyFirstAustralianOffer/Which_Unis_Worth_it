/**
 * Small message at the top of the page that fades away, e.g. after signing in:
 * "Email verified. You're signed in as jane@example.com".
 *
 *   showToast(html)        show one now
 *   setWelcome(kind)       remember a message for the next page ("email" | "google" | "signedout")
 *   showWelcome(user)      shows it (once) if one was set; called by the layout
 */
import { esc } from "../lib/dom.js?v=5a71cd6c";
import { icons } from "./icons.js?v=ecd0f942";

const KEY = "rou_welcome";

export function showToast(html, ms = 6000) {
  const el = document.createElement("div");
  el.className = "toast";
  el.setAttribute("role", "status");
  el.innerHTML = `<span class="toast-icon">${icons.check(16)}</span><p>${html}</p>
    <button type="button" class="toast-close" aria-label="Close">×</button>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add("show"));
  const close = () => { el.classList.remove("show"); setTimeout(() => el.remove(), 400); };
  el.querySelector(".toast-close").addEventListener("click", close);
  setTimeout(close, ms);
}

export function setWelcome(method) {
  try { sessionStorage.setItem(KEY, method); } catch { /* ignore */ }
}

export function showWelcome(user) {
  let method = "";
  try { method = sessionStorage.getItem(KEY) || ""; sessionStorage.removeItem(KEY); } catch { return; }
  if (method === "signedout") return showToast("<b>Signed out.</b> See you next time.");
  if (!method || !user) return;
  showToast(method === "email"
    ? `<b>Email verified.</b> You're signed in as ${esc(user.email)}.`
    : `<b>Signed in with Google</b> as ${esc(user.email)}.`);
}
