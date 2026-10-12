/**
 * Header: the Log in / Sign up buttons, or the signed-in user chip + menu.
 * Also highlights the current page in both navs.
 */
import { $, $$, esc } from "../lib/dom.js";
import { ROLES } from "../config.js";
import { getUser, logOut } from "../services/auth.js";
import { openAuthModal } from "./auth-modal.js";
import { showToast } from "./toast.js";

export function initHeader() {
  const slot = $("#authSlot");
  const menu = $("#userMenu");

  slot.addEventListener("click", (e) => {
    const authBtn = e.target.closest("[data-auth]");
    if (authBtn) return openAuthModal({ mode: authBtn.dataset.auth });

    const chip = e.target.closest("#userChip");
    if (chip) {
      e.stopPropagation();
      const open = menu.classList.toggle("open");
      chip.setAttribute("aria-expanded", String(open));
    }
  });

  menu.addEventListener("click", (e) => {
    const go = e.target.closest("[data-go]");
    if (go) location.hash = go.dataset.go;
    if (e.target.closest("#logoutBtn")) {
      logOut();
      showToast("Logged out");
    }
    closeMenu();
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest("#userMenu")) closeMenu();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });

  renderHeader();
}

function closeMenu() {
  $("#userMenu").classList.remove("open");
  $("#userChip")?.setAttribute("aria-expanded", "false");
}

export function renderHeader() {
  const user = getUser();
  const slot = $("#authSlot");
  const menu = $("#userMenu");
  closeMenu();

  if (!user) {
    slot.innerHTML = `
      <button class="btn btn-ghost" data-auth="login">Log in</button>
      <button class="btn btn-dark" data-auth="signup">Sign up</button>`;
    menu.innerHTML = "";
    return;
  }

  const isGrad = user.role === "graduate";
  slot.innerHTML = `
    ${isGrad ? `<a class="btn btn-dark" href="#/share">${user.hasShared ? "My result" : "Share result"}</a>` : ""}
    <button class="user-chip" id="userChip" aria-haspopup="menu" aria-expanded="false" aria-label="Account menu">
      <span class="avatar">${esc(user.email[0].toUpperCase())}</span>
      <span class="chip-label">${esc(ROLES[user.role]?.label ?? "Member")}</span>
    </button>`;
  menu.innerHTML = `
    <div class="meta">Signed in as<b>${esc(user.email)}</b></div>
    ${isGrad ? `<button data-go="#/share">${user.hasShared ? "View my result" : "Share my result"}</button>` : ""}
    <button data-go="#/database">Browse the database</button>
    <button id="logoutBtn">Log out</button>`;
}

/** Underline / fill the nav link for the current page. */
export function setActiveNav(page) {
  $$("[data-nav]").forEach((a) => a.classList.toggle("active", a.dataset.nav === page));
}
