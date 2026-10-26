/**
 * Sign-in box: "Continue with Google" or "Email me a sign-in link".
 * Used on signin.html, the share form and the locked database.
 *
 *   signInBox({ title, lead, next })   HTML
 *   bindSignInBox(root, { next })      makes the buttons work
 */
import { esc, $ } from "../lib/dom.js?v=5a71cd6c";
import { signInWithGoogle, sendEmailLink } from "../services/auth.js?v=6428cedd";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function signInBox({ title = "Sign in", lead = "", error = "" } = {}) {
  return `
    <div class="signin">
      <h2>${esc(title)}</h2>
      ${lead ? `<p class="signin-lead">${esc(lead)}</p>` : ""}
      <p class="error signin-error" role="alert">${esc(error)}</p>
      <button type="button" class="btn btn-outline btn-google" data-google>Continue with Google</button>
      <div class="signin-or"><span>or</span></div>
      <form class="signin-email" novalidate>
        <label class="choice-label" for="signinEmail">Email</label>
        <input class="field" id="signinEmail" type="email" inputmode="email" autocomplete="email" placeholder="you@email.com">
        <button type="submit" class="btn btn-primary">Email me a sign-in link</button>
      </form>
      <p class="signin-note">No passwords. We never share or sell your email.</p>
    </div>`;
}

export function bindSignInBox(root, { next }) {
  const error = $(".signin-error", root);
  $("[data-google]", root).addEventListener("click", () => signInWithGoogle(next));
  $(".signin-email", root).addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = $("#signinEmail", root);
    const email = input.value.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) {
      error.textContent = "Please enter a valid email.";
      input.classList.add("invalid");
      return;
    }
    const btn = $(".signin-email button", root);
    btn.disabled = true;
    btn.textContent = "Sending…";
    try {
      await sendEmailLink(email, next);
      $(".signin", root).innerHTML = `
        <h2>Check your email</h2>
        <p class="signin-lead">We sent a sign-in link to <b>${esc(email)}</b>. Open it to continue. It can take a minute to arrive, and it's worth checking your spam folder.</p>
        <button type="button" class="text-link" data-retry>Use a different email</button>`;
      $("[data-retry]", root).addEventListener("click", () => location.reload());
    } catch (err) {
      error.textContent = err.message;
      btn.disabled = false;
      btn.textContent = "Email me a sign-in link";
    }
  });
  $("#signinEmail", root).addEventListener("input", (e) => { e.target.classList.remove("invalid"); error.textContent = ""; });
}
