/**
 * Shared header + footer, injected into every page so they're defined once.
 *
 *   <header data-layout="header"></header>
 *   <header data-layout="header" data-variant="form"></header>   (logo + back link)
 *   <footer data-layout="footer"></footer>
 *
 * The header shows "Sign in", or the signed-in person's initial with a
 * menu (their email + Sign out).
 */
import { CONFIG } from "../config.js?v=b884ae18";
import { esc } from "../lib/dom.js?v=5a71cd6c";
import { initAuth, currentUser, signOut } from "../services/auth.js?v=6428cedd";
import { showWelcome } from "./toast.js?v=c367aba3";
import { showStorageNotice, resetSiteData } from "./storage-notice.js?v=8bce1efe";

const logo = `<a class="logo" href="index.html" aria-label="Return on Uni home">Return on <span class="hl">Uni</span></a>`;

function header(el) {
  const right = el.dataset.variant === "form"
    ? `<a class="text-link" href="index.html">← Back to home</a>`
    : `<nav class="nav" aria-label="Main">
         <a href="index.html#about">About</a>
         <a href="index.html#how">How it works</a>
         <span class="account-slot" data-account></span>
         <a class="btn btn-primary btn-sm" href="share.html">Join the movement</a>
       </nav>`;

  el.classList.add("site-header");
  el.innerHTML = `<div class="wrap">${logo}${right}</div>`;

}

/** "Sign in" link, or the person's initial with a small menu. */
function renderAccount() {
  document.querySelectorAll("[data-account]").forEach((slot) => {
    const user = currentUser();
    if (!user) {
      const page = location.pathname.split("/").pop() || "index.html";
      slot.innerHTML = page === "signin.html" ? "" : `<a href="signin.html?next=${encodeURIComponent(page)}">Sign in</a>`;
      return;
    }
    const label = user.name || user.email;
    slot.innerHTML = `
      <div class="account">
        <button type="button" class="account-btn" aria-haspopup="true" aria-expanded="false" title="${esc(label)}">
          ${esc(label.trim()[0]?.toUpperCase() || "?")}
          <span class="sr-only">Account menu</span>
        </button>
        <div class="account-menu" hidden>
          <p>Signed in as<br><b>${esc(user.email)}</b></p>
          <button type="button" class="text-link" data-signout>Sign out</button>
        </div>
      </div>`;
    const btn = slot.querySelector(".account-btn");
    const menu = slot.querySelector(".account-menu");
    const toggle = (open) => { menu.hidden = !open; btn.setAttribute("aria-expanded", String(open)); };
    btn.addEventListener("click", (e) => { e.stopPropagation(); toggle(menu.hidden); });
    document.addEventListener("click", (e) => { if (!slot.contains(e.target)) toggle(false); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") toggle(false); });
    slot.querySelector("[data-signout]").addEventListener("click", async () => {
      await signOut();
      location.href = "index.html";
    });
  });
}

function footer(el) {
  const contact = CONFIG.CONTACT_EMAIL ? `<a href="mailto:${esc(CONFIG.CONTACT_EMAIL)}">Contact</a>` : "";
  el.classList.add("site-footer");
  el.innerHTML = `
    <div class="wrap">
      ${logo}
      <div class="footer-links">
        <a href="privacy.html">Privacy policy</a>
        <a href="terms.html">Terms</a>
        ${contact}
      </div>
      <span>© ${new Date().getFullYear()} Return on Uni</span>
    </div>`;
}

export function renderLayout() {
  document.querySelectorAll('[data-layout="header"]').forEach(header);
  document.querySelectorAll('[data-layout="footer"]').forEach(footer);
  showStorageNotice();
  renderAccount();
  initAuth().then(() => { renderAccount(); showWelcome(currentUser()); });
  // Add ?reset to any page URL to clear everything the site saved on this device.
  if (new URLSearchParams(location.search).has("reset")) {
    history.replaceState(null, "", location.pathname + location.hash);
    resetSiteData();
  }
}
