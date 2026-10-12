/**
 * Auth modal: Sign up / Log in pop-up.
 *
 *   openAuthModal({ mode: "signup" | "login", role: "graduate", redirect: "#/share" })
 *
 * The form talks only to services/auth.js, so swapping in real auth
 * later doesn't touch this file.
 */
import { $, $$, esc } from "../lib/dom.js";
import { ROLES } from "../config.js";
import { MIN_PASSWORD_LENGTH } from "../lib/validate.js";
import { signUp, logIn } from "../services/auth.js";
import { showToast } from "./toast.js";

const state = { mode: "signup", role: "graduate", redirect: null, lastFocus: null };

const TEXT = {
  signup: { title: "Create your free account", sub: "Unlock every result in the database.", submit: "Create account" },
  login:  { title: "Welcome back", sub: "Log in to see the full database.", submit: "Log in" },
};

function template() {
  const roles = Object.entries(ROLES).map(([key, r]) => `
    <button type="button" class="role" data-role="${key}" aria-pressed="false">
      <span class="ico" aria-hidden="true">${r.icon}</span>
      <span><b>${esc(r.label)}</b><small>${esc(r.blurb)}</small></span>
    </button>`).join("");

  return `
    <div class="overlay" id="authOverlay" aria-hidden="true">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="authTitle">
        <button class="x" id="authClose" aria-label="Close">×</button>
        <h2 id="authTitle"></h2>
        <p class="sub2" id="authSub"></p>
        <div class="tabs" role="tablist">
          <button role="tab" data-mode="signup">Sign up</button>
          <button role="tab" data-mode="login">Log in</button>
        </div>
        <form id="authForm" novalidate>
          <div class="q" id="roleBlock">
            <span class="ql">I'm a…</span>
            <div class="roles">${roles}</div>
          </div>
          <div class="q field">
            <label for="authEmail">Email</label>
            <input id="authEmail" type="email" placeholder="you@example.com" autocomplete="email">
            <div class="err" id="authEmailErr">Enter a valid email address.</div>
          </div>
          <div class="q field">
            <label for="authPass">Password</label>
            <input id="authPass" type="password" placeholder="At least ${MIN_PASSWORD_LENGTH} characters">
            <div class="err" id="authPassErr">Password needs at least ${MIN_PASSWORD_LENGTH} characters.</div>
          </div>
          <button class="btn btn-dark btn-block btn-lg" type="submit" id="authSubmit"></button>
          <p class="mock-note">Demo sign-up: nothing is stored or sent. Email verification comes later.</p>
        </form>
      </div>
    </div>`;
}

export function initAuthModal() {
  document.body.insertAdjacentHTML("beforeend", template());
  const overlay = $("#authOverlay");

  $("#authClose").addEventListener("click", closeAuthModal);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) closeAuthModal(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && isOpen()) closeAuthModal(); });

  $$(".tabs [data-mode]", overlay).forEach((tab) => tab.addEventListener("click", () => setMode(tab.dataset.mode)));
  $$(".role", overlay).forEach((btn) => btn.addEventListener("click", () => setRole(btn.dataset.role)));
  $("#authForm").addEventListener("submit", onSubmit);
  setRole(state.role);
}

export function openAuthModal({ mode = "signup", role, redirect = null } = {}) {
  state.redirect = redirect;
  state.lastFocus = document.activeElement;
  if (role) setRole(role);
  setMode(mode);
  const overlay = $("#authOverlay");
  overlay.classList.add("open");
  overlay.setAttribute("aria-hidden", "false");
  setTimeout(() => $("#authEmail").focus(), 50);
}

export function closeAuthModal() {
  const overlay = $("#authOverlay");
  overlay.classList.remove("open");
  overlay.setAttribute("aria-hidden", "true");
  state.lastFocus?.focus?.();
}

const isOpen = () => $("#authOverlay").classList.contains("open");

function setMode(mode) {
  state.mode = mode;
  const t = TEXT[mode];
  $$(".tabs [data-mode]").forEach((tab) => tab.setAttribute("aria-selected", String(tab.dataset.mode === mode)));
  $("#roleBlock").hidden = mode !== "signup";
  $("#authTitle").textContent = t.title;
  $("#authSub").textContent = t.sub;
  $("#authSubmit").textContent = t.submit;
  $("#authPass").setAttribute("autocomplete", mode === "signup" ? "new-password" : "current-password");
  showErrors({});
}

function setRole(role) {
  state.role = role;
  $$(".role").forEach((btn) => btn.setAttribute("aria-pressed", String(btn.dataset.role === role)));
}

function showErrors(errors) {
  $("#authEmailErr").classList.toggle("show", !!errors.email);
  $("#authPassErr").classList.toggle("show", !!errors.password);
}

function onSubmit(e) {
  e.preventDefault();
  const email = $("#authEmail").value;
  const password = $("#authPass").value;

  const result = state.mode === "signup"
    ? signUp({ email, password, role: state.role })
    : logIn({ email, password });

  if (result.errors) return showErrors(result.errors);

  $("#authForm").reset();
  closeAuthModal();
  showToast(state.mode === "signup" ? "Account created. Welcome!" : "Logged in");

  // Where to go next: an explicit redirect, or the share form for new grads.
  if (state.redirect) location.hash = state.redirect;
  else if (state.mode === "signup" && result.user.role === "graduate") location.hash = "#/share";
}
