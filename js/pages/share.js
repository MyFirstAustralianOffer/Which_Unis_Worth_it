/**
 * Share page: one question at a time, branching after "Which one are you?".
 * Behaviour follows the Share Form Spec ("How the form behaves").
 */
import { renderLayout } from "../components/layout.js";
import { renderQuestion, bindQuestion, validateQuestion, fieldsOf } from "../components/question.js";
import { icons } from "../components/icons.js";
import { questionsFor, PATHS, START, ERRORS } from "../data/form-schema.js";
import { submitResponse } from "../services/api.js";
import { unlock } from "../services/access.js";
import { $, esc } from "../lib/dom.js";

renderLayout();

const card = $("#formCard");
let answers = {};
let step = 0;
let consent = false;
let submitting = false;

const questions = () => questionsFor(answers.path);
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
      <div id="qBody">${renderQuestion(q, answers)}</div>
      ${isLast() ? `
        <label class="consent">
          <input type="checkbox" id="consent"${consent ? " checked" : ""}>
          <span>I agree to the <a href="privacy.html" target="_blank" rel="noopener">Privacy policy</a>. <span class="req" aria-hidden="true">*</span></span>
        </label>` : ""}
      <!-- spam trap: real people never see or fill this -->
      <input type="text" name="website" id="hp" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0">
      <p class="error" id="qError" role="alert"></p>
      <div class="form-actions">
        ${step > 0 ? `<button type="button" class="btn btn-outline" id="backBtn">Back</button>` : ""}
        <button type="submit" class="btn btn-primary" id="nextBtn">${isLast() ? "Unlock the database" : "Next"}</button>
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
    btn.textContent = "Unlock the database";
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
