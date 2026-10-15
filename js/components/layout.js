/**
 * Shared header + footer, injected into every page so they're defined once.
 *
 *   <header data-layout="header" data-active="database"></header>
 *   <header data-layout="header" data-variant="form"></header>   (logo + back link)
 *   <footer data-layout="footer"></footer>
 */
import { CONFIG, isConnected } from "../config.js?v=c8c5fba1";
import { esc } from "../lib/dom.js?v=5a71cd6c";
import { showStorageNotice, resetSiteData } from "./storage-notice.js?v=69534ca8";

const logo = `<a class="logo" href="index.html" aria-label="Return on Uni home">Return on <span class="hl">Uni</span></a>`;

function header(el) {
  const active = el.dataset.active;
  const current = (name) => (active === name ? ' aria-current="page"' : "");

  const right = el.dataset.variant === "form"
    ? `<a class="text-link" href="index.html">← Back to home</a>`
    : `<nav class="nav" aria-label="Main">
         <a href="database.html"${current("database")}>Database</a>
         <a href="index.html#how">How it works</a>
         <a href="index.html#about">About</a>
         <a class="btn btn-primary btn-sm" href="share.html">Join the movement</a>
       </nav>`;

  el.classList.add("site-header");
  el.innerHTML = `<div class="wrap">${logo}${right}</div>`;

  if (!isConnected()) {
    el.insertAdjacentHTML("beforebegin",
      `<div class="demo-note" role="note">Demo mode: the database shows example entries, not real graduates. Connect Google Sheets in <code>js/config.js</code> to go live.</div>`);
  }
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
  // Add ?reset to any page URL to clear everything the site saved on this device.
  if (new URLSearchParams(location.search).has("reset")) {
    history.replaceState(null, "", location.pathname + location.hash);
    resetSiteData();
  }
}
