/**
 * Share page: one question at a time, branching after "Which one are you?".
 * Behaviour follows the Share Form Spec ("How the form behaves").
 *
 * People sign in first (Google or email link): the account gives us a verified
 * email, so the form doesn't ask for one, and their contribution is saved on
 * the account (the database unlocks on any device they sign in on).
 *
 * share.html?edit=graduated (or studying / planning) opens their saved answers
 * to change, e.g. after a new job. Saving keeps the old version in the
 * database's history.
 */
import { renderLayout } from "../components/layout.js?v=e611bad7";
import { renderQuestion, bindQuestion, validateQuestion, fieldsOf, hintHtml } from "../components/question.js?v=1a8d2df3";
import { icons } from "../components/icons.js?v=ecd0f942";
import { questionsFor, PATHS, START, ERRORS } from "../data/form-schema.js?v=27cd5bf1";
import { submitResponse, myProfile, myStory } from "../services/api.js?v=61030f35";
import { initAuth, currentUser, signOut, authError } from "../services/auth.js?v=8ebe4f88";
import { signInBox, bindSignInBox } from "../components/signin-box.js?v=bc107f7e";
import { setWelcome } from "../components/toast.js?v=8a66a045";
import { $, esc } from "../lib/dom.js?v=5a71cd6c";

renderLayout();

const card = $("#formCard");
let answers = {};
let step = 0;
let consent = false;
let submitting = false;
/** The path being updated (share.html?edit=…), or "" for a new story. */
let editing = "";

const questions = () => questionsFor(answers.path, answers);

/**
 * Salary sense-check: a yearly salary outside this range is usually a typo
 * (a weekly or monthly amount, or an extra zero). People are asked to check,
 * and can carry on if it's right. Nothing is blocked.
 */
const SALARY_CHECK = { min: 20000, max: 500000 };
const salaryConfirmed = {}; // field → the value they confirmed

function salaryWarning(q) {
  if (q.type !== "money" || q.sameAs && answers[q.sameAs.flag] === "Yes") return "";
  const v = Number(answers[q.field]);
  if (!v || salaryConfirmed[q.field] === v) return "";
  const amount = `$${v.toLocaleString("en-AU")}`;
  if (v < SALARY_CHECK.min) return `That looks low for a yearly salary. Did you enter a weekly or monthly amount? If ${amount} a year is right, press Next again.`;
  if (v > SALARY_CHECK.max) return `That looks high for a yearly salary. Please check for an extra zero. If ${amount} a year is right, press Next again.`;
  return "";
}
const isLast = () => step === questions().length - 1;

function render() {
  const list = questions();
  const q = list[step];
  const total = list.length;
  const pathLabel = answers.path ? PATHS[answers.path].label : "";

  card.innerHTML = `
    <div class="signed-in-as"><span>Signed in as <b>${esc(currentUser().email)}</b></span><button type="button" id="signOutBtn">Sign out</button></div>
    <div class="progress-meta">
      <span>${editing ? "Updating your story · " : ""}Question ${step + 1} of ${total}</span>
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
          <span>I agree to the <a href="privacy.html" target="_blank" rel="noopener">Privacy policy</a> and <a href="terms.html" target="_blank" rel="noopener">Terms of use</a>. <span class="req" aria-hidden="true">*</span></span>
        </label>` : ""}
      <p class="error" id="qError" role="alert"></p>
      <p class="notice" id="qNotice" role="status"></p>
      <div class="form-actions">
        ${step > (editing ? 1 : 0) ? `<button type="button" class="btn btn-outline" id="backBtn">Back</button>` : ""}
        <button type="submit" class="btn btn-primary" id="nextBtn">${isLast() ? (editing ? "Save changes" : "Submit") : "Next"}</button>
      </div>
    </form>`;

  const form = $("#qForm", card);
  const clearError = () => { $("#qError", card).textContent = ""; $("#qNotice", card).textContent = ""; };
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
  if (step > (editing ? 1 : 0)) { step--; render(); }
}

async function next() {
  if (submitting) return;
  const q = questions()[step];

  const error = validateQuestion(q, answers);
  if (error) return showError(error, q);

  const warning = salaryWarning(q);
  if (warning) {
    salaryConfirmed[q.field] = Number(answers[q.field]); // pressing Next again carries on
    $("#qNotice", card).textContent = warning;
    return;
  }
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
    const result = await submitResponse(path, { ...rest, consent_privacy: true, form_version: 2 });
    renderDone({ updated: result?.updated });
  } catch (err) {
    $("#qError", card).textContent = err.message;
    btn.disabled = false;
    btn.textContent = editing ? "Save changes" : "Submit";
  } finally {
    submitting = false;
  }
}

function renderDone({ updated = false } = {}) {
  card.innerHTML = `
    <div class="done">
      <div class="done-icon">${icons.check()}</div>
      <h2>${updated ? "Your story is updated" : "You're in!"}</h2>
      <p>${updated ? "Thanks for keeping it current. It helps the next student see where degrees really lead." : "Thanks for sharing. The full database is now unlocked whenever you're signed in."}</p>
      <a class="btn btn-primary" href="database.html">Explore the database →</a>
      <a class="text-link" href="account.html">Go to my account</a>
    </div>`;
}

/** Already shared: offer to update it instead of a second story. */
function renderAlreadyShared(path) {
  card.innerHTML = `
    <div class="done">
      <div class="done-icon">${icons.check()}</div>
      <h2>You've already shared your story</h2>
      <p>Thank you! The full database is unlocked whenever you're signed in. Got a new job, or spotted a mistake? You can update your answers any time.</p>
      <a class="btn btn-primary" href="database.html">Explore the database →</a>
      <a class="btn btn-outline" href="share.html?edit=${encodeURIComponent(path)}">Update my story</a>
    </div>`;
}

/** Saved answers (from the database) → the form's answers. */
function toAnswers(path, saved) {
  const a = { path };
  for (const [k, v] of Object.entries(saved)) {
    if (v === null || v === "" || ["submitted_at", "updated_at"].includes(k)) continue;
    a[k] = k === "current_salary_same" ? (v ? "Yes" : undefined) : v;
    if (a[k] === undefined) delete a[k];
  }
  return a;
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
  const wanted = new URLSearchParams(location.search).get("edit");
  if (wanted && PATHS[wanted]) {
    let story = {};
    try { story = await myStory(); } catch { /* falls through to a new story */ }
    if (story[wanted]) {
      editing = wanted;
      answers = toAnswers(wanted, story[wanted]);
      consent = true; // they agreed when they first shared
      step = 1;       // which path they're on doesn't change when updating
      return render();
    }
  }
  const profile = await myProfile();
  if (profile.contributed) return renderAlreadyShared(profile.path || "graduated");
  render();
}

start();
