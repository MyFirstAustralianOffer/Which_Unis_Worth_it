/**
 * Share page: one question at a time, branching after "Which one are you?".
 * Behaviour follows the Share Form Spec ("How the form behaves").
 *
 * People sign in first (Google or email link): the account gives us a verified
 * email, so the form doesn't ask for one, and their contribution is saved on
 * the account (the database unlocks on any device they sign in on).
 */
import { renderLayout } from "../components/layout.js?v=9475431f";
import { renderQuestion, bindQuestion, validateQuestion, fieldsOf, hintHtml } from "../components/question.js?v=a77ab9c7";
import { icons } from "../components/icons.js?v=ecd0f942";
import { questionsFor, PATHS, START, ERRORS } from "../data/form-schema.js?v=57f3ef3c";
import { submitResponse, myProfile } from "../services/api.js?v=a5f65edc";
import { initAuth, currentUser, signOut, authError } from "../services/auth.js?v=8c753193";
import { signInBox, bindSignInBox } from "../components/signin-box.js?v=9a52838c";
import { setWelcome } from "../components/toast.js?v=8a66a045";
import { $, esc } from "../lib/dom.js?v=5a71cd6c";

renderLayout();

const card = $("#formCard");
let answers = {};
let step = 0;
let consent = false;
let submitting = false;

const questions = () => questionsFor(answers.path, answers);
const isLast = () => step === questions().length - 1;

function render() {
  const list = questions();
  const q = list[step];
  const total = list.length;
  const pathLabel = answers.path ? PATHS[answers.path].label : "";

  card.innerHTML = `
    <div class="signed-in-as"><span>Signed in as <b>${esc(currentUser().email)}</b></span><button type="button" id="signOutBtn">Sign out</button></div>
    <div class="progress-meta">
      <span>Question ${step + 1} of ${total}</span>
      <span class="path">${esc(pathLabel)}</span>
    </div>
    <div class="progress" role="progressbar" aria-valuemin="1" aria-valuemax="${total}" aria-valuenow="${step + 1}" aria-label="Form progress"><i style="width:${((step + 1) / total) * 100}%"></i></div>

    <form id="qForm" novalidate>
      <h2 class="q-title" id="qTitle">${esc(q.title)} <span class="req" aria-hidden="true">*</span></h2>
      ${hintHtml(q)}
      <div id="qBody">${renderQuestion(q, answers)}</div>
      ${isLast() ? `
        <label class="consent">
          <input type="checkbox" id="consent"${consent ? " checked" : ""}>
          <span>I agree to the <a href="privacy.html" target="_blank" rel="noopener">Privacy policy</a>. <span class="req" aria-hidden="true">*</span></span>
        </label>` : ""}
      <p class="error" id="qError" role="alert"></p>
      <div class="form-actions">
        ${step > 0 ? `<button type="button" class="btn btn-outline" id="backBtn">Back</button>` : ""}
        <button type="submit" class="btn btn-primary" id="nextBtn">${isLast() ? "Submit" : "Next"}</button>
      </div>
    </form>`;

  const form = $("#qForm", card);
  const clearError = () => { $("#qError", card).textContent = ""; };
  bindQuestion($("#qBody", card), q, answers, clearError);
  $("#consent", card)?.addEventListener("change", (e) => { consent = e.target.checked; clearError(); });
  $("#backBtn", card)?.addEventListener("click", back);
  $("#signOutBtn", card).addEventListener("click", async () => { await signOut(); setWelcome("signedout"); location.reload(); });
  form.addEventListener("submit", (e) => { e.preventDefault(); next(); });

  // Move focus to the first input (not on first load, to avoid jumping the page).
  if (render.started) ($("#q-input", card) || $(".opt", card))?.focus();
  render.started = true;
}

function showError(message, q) {
  $("#qError", card).textContent = message;
  if (q.type === "email") $("#q-input", card)?.classList.add("invalid");
}

function back() {
  if (step > 0) { step--; render(); }
}

async function next() {
  if (submitting) return;
  const q = questions()[step];

  const error = validateQuestion(q, answers);
  if (error) return showError(error, q);
  if (isLast() && !consent) return showError(ERRORS.consent, q);

  // Changing "Which one are you?" drops answers from the other paths.
  if (q.field === "path") {
    const keep = new Set([...START.flatMap(fieldsOf), ...PATHS[answers.path].questions.flatMap(fieldsOf)]);
    answers = Object.fromEntries(Object.entries(answers).filter(([k]) => keep.has(k)));
  }

  // Drop answers to questions that no longer apply (e.g. they changed to "Still looking").
  const asked = new Set(questions().flatMap(fieldsOf));
  PATHS[answers.path || "graduated"].questions.forEach((x) => {
    if (x.showIf && !asked.has(fieldsOf(x)[0])) fieldsOf(x).forEach((f) => delete answers[f]);
  });

  if (!isLast()) { step++; render(); return; }
  await submit();
}

async function submit() {
  submitting = true;
  const btn = $("#nextBtn", card);
  btn.disabled = true;
  btn.textContent = "Saving…";

  const { path, ...rest } = answers;
  try {
    await submitResponse(path, { ...rest, consent_privacy: true, form_version: 2 });
    renderDone();
  } catch (err) {
    if (/already shared/i.test(err.message)) return renderDone({ already: true });
    $("#qError", card).textContent = err.message;
    btn.disabled = false;
    btn.textContent = "Submit";
  } finally {
    submitting = false;
  }
}

function renderDone({ already = false } = {}) {
  card.innerHTML = `
    <div class="done">
      <div class="done-icon">${icons.check()}</div>
      <h2>${already ? "You've already shared your story" : "You're in!"}</h2>
      <p>${already ? "Thank you! The full database is unlocked whenever you're signed in." : "Thanks for sharing. The full database is now unlocked whenever you're signed in."}</p>
      <a class="btn btn-primary" href="database.html">Explore the database →</a>
    </div>`;
}

async function start() {
  card.innerHTML = `<p class="entries-status">Loading…</p>`;
  await initAuth();
  if (!currentUser()) {
    card.innerHTML = signInBox({
      title: "First, sign in",
      lead: "So your story is saved to you, and the database unlocks on any device. It takes a few seconds.",
      error: authError,
    });
    bindSignInBox(card, { next: "share.html" });
    return;
  }
  const profile = await myProfile();
  if (profile.contributed) return renderDone({ already: true });
  render();
}

start();
