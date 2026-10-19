/**
 * Share page: one question at a time, branching after "Which one are you?".
 * Behaviour follows the Share Form Spec ("How the form behaves").
 */
import { renderLayout } from "../components/layout.js?v=fa899a6c";
import { renderQuestion, bindQuestion, validateQuestion, fieldsOf, hintHtml } from "../components/question.js?v=23121b94";
import { icons } from "../components/icons.js?v=ecd0f942";
import { questionsFor, PATHS, START, ERRORS } from "../data/form-schema.js?v=fe2118e7";
import { submitResponse } from "../services/api.js?v=49fde917";
import { unlock } from "../services/access.js?v=6ff55857";
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
      <!-- Spam trap: hidden from people, only bots fill it. Its name is deliberately
           meaningless so browser autofill never fills it in for real visitors. -->
      <div aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden">
        <input type="text" name="rou_trap_7f3" id="hp" tabindex="-1" autocomplete="off" data-lpignore="true" data-1p-ignore>
      </div>
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

  const now = new Date().toISOString();
  const payload = {
    ...answers,
    email: String(answers.email).trim().toLowerCase(),
    consent_privacy: true,
    consent_at: now,
    submitted_at: now,
    form_version: 1,
    website: $("#hp", card).value, // spam trap
  };

  try {
    await submitResponse(payload);
    unlock();
    renderDone();
  } catch (err) {
    $("#qError", card).textContent = err.message;
    btn.disabled = false;
    btn.textContent = "Submit";
  } finally {
    submitting = false;
  }
}

function renderDone() {
  card.innerHTML = `
    <div class="done">
      <div class="done-icon">${icons.check()}</div>
      <h2>You're in!</h2>
      <p>Thanks for sharing. The full database is now unlocked for you.</p>
      <a class="btn btn-primary" href="database.html">Explore the database →</a>
      <button class="text-link" type="button" id="againBtn">Start again</button>
    </div>`;
  $("#againBtn", card).addEventListener("click", () => {
    answers = {}; step = 0; consent = false; render();
  });
}

render();
