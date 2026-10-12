/**
 * Share page: grads submit their result and see how they compare.
 *
 * Four possible states:
 *   1. logged out          → prompt to sign up as a graduate
 *   2. not a graduate      → explain the form is for grads
 *   3. grad, not shared    → the form
 *   4. grad, already shared → "how you compare" card
 */
import { $, esc, options } from "../lib/dom.js";
import { monthsLabel, monthsShort } from "../lib/format.js";
import { median, pctSlowerThan } from "../lib/stats.js";
import { LATEST_GRAD_YEAR, ROLES } from "../config.js";
import {
  UNIVERSITIES, COURSE_NAMES, JOB_ROUTES, LEVELS, STUDENT_TYPES,
  MONTH_OPTIONS, SALARY_OPTIONS, IN_FIELD_OPTIONS,
} from "../data/taxonomy.js";
import { getUser, markShared } from "../services/auth.js";
import { getMyResult, getVerifiedResults, addMyResult } from "../services/results.js";
import { chipGroup, bindChips } from "../components/chips.js";
import { openAuthModal } from "../components/auth-modal.js";
import { showToast } from "../components/toast.js";

/** Fields that must be answered, with the error element they control. */
const REQUIRED = ["course", "uni", "year", "months", "salary", "route"];
const DEFAULT_ANSWERS = { level: "Undergrad", type: "Domestic", inField: "Yes" };

export default {
  title: "Share your result",

  render(root) {
    root.innerHTML = `
      <section class="block">
        <div class="wrap share-grid">
          ${intro()}
          <div id="shareSlot"></div>
        </div>
      </section>`;
    renderSlot($("#shareSlot", root));
  },
};

function intro() {
  return `
    <div class="share-intro">
      <div class="kicker">For grads</div>
      <h1>Share your result in 60 seconds.</h1>
      <p>A few quick questions. As soon as you submit, you'll see how your result compares with others from the same course.</p>
      <ul class="checks">
        <li><span class="tick">✓</span>Never shown with your name or email</li>
        <li><span class="tick">✓</span>See how you compare, instantly</li>
        <li><span class="tick">✓</span>Help the next student choose with real data</li>
      </ul>
    </div>`;
}

function renderSlot(slot) {
  const user = getUser();
  if (!user) return renderSignUpPrompt(slot);
  if (user.role !== "graduate") return renderNotGraduate(slot, user);
  const mine = getMyResult();
  if (mine) return renderComparison(slot, mine);
  renderForm(slot);
}

/* ---------- state 1: logged out ---------- */
function renderSignUpPrompt(slot) {
  slot.innerHTML = `
    <div class="form-card center">
      <span class="eyebrow">Step 1 of 2</span>
      <h2>Create a free account first</h2>
      <p>One result per account keeps the data honest. Your email is never shown.</p>
      <button class="btn btn-dark btn-lg" data-auth="signup">Sign up as a graduate</button>
      <p style="margin:14px 0 0;font-size:14px">Already have an account? <button class="link-btn" data-auth="login">Log in</button></p>
    </div>`;
  slot.querySelectorAll("[data-auth]").forEach((btn) =>
    btn.addEventListener("click", () =>
      openAuthModal({ mode: btn.dataset.auth, role: "graduate", redirect: "#/share" })));
}

/* ---------- state 2: student / future student ---------- */
function renderNotGraduate(slot, user) {
  slot.innerHTML = `
    <div class="form-card">
      <h2 style="margin-top:0">This form is for graduates</h2>
      <p>You're signed up as a ${esc(ROLES[user.role].label.toLowerCase())}, so you already have full access to the database. Come back once you've graduated and found your first job!</p>
      <a class="btn btn-dark" href="#/database">Browse the database →</a>
    </div>`;
}

/* ---------- state 3: the form ---------- */
function renderForm(slot) {
  const answers = { ...DEFAULT_ANSWERS };
  const years = Array.from({ length: 6 }, (_, i) => LATEST_GRAD_YEAR - i);

  slot.innerHTML = `
    <form class="form-card" id="shareForm" novalidate>
      ${selectQuestion("course", "1. What did you study?", "Choose your course", COURSE_NAMES)}
      ${selectQuestion("uni", "2. Where did you study?", "Choose your university", [...UNIVERSITIES].sort())}
      <div class="two">
        ${selectQuestion("year", "3. When did you graduate?", "Choose year", years)}
        ${chipQuestion("level", "Level", LEVELS, answers.level)}
      </div>
      ${chipQuestion("months", "4. How long until your first job in that field?", MONTH_OPTIONS)}
      ${chipQuestion("salary", `5. Starting salary <span class="hint">(shown only as a band)</span>`, SALARY_OPTIONS)}
      ${chipQuestion("route", "6. How did you get it?", JOB_ROUTES)}
      <div class="two">
        ${chipQuestion("type", "Student type", STUDENT_TYPES, answers.type)}
        ${chipQuestion("inField", "Job in your field?", IN_FIELD_OPTIONS, answers.inField)}
      </div>
      <button class="btn btn-dark btn-lg btn-block" type="submit">Submit and see how I compare →</button>
      <p class="mock-note">Demo: your answer is added to this page only and disappears on refresh.</p>
    </form>`;

  const form = $("#shareForm", slot);
  bindChips(form, (name, value) => { answers[name] = value; showError(form, name, false); });
  form.addEventListener("change", (e) => {
    if (e.target.dataset.q) {
      answers[e.target.dataset.q] = e.target.value;
      showError(form, e.target.dataset.q, false);
    }
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const missing = REQUIRED.filter((k) => answers[k] === undefined || answers[k] === "");
    REQUIRED.forEach((k) => showError(form, k, missing.includes(k)));
    if (missing.length) {
      form.querySelector(".err.show")?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }
    addMyResult({ ...answers, year: Number(answers.year) });
    markShared();
    showToast("Thanks! Your result has been added.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

function selectQuestion(name, label, placeholder, items) {
  return `
    <div class="q field">
      <label for="q-${name}">${label}</label>
      <select id="q-${name}" data-q="${name}"><option value="">${esc(placeholder)}</option>${options(items)}</select>
      <div class="err" data-err="${name}">Please choose one.</div>
    </div>`;
}

function chipQuestion(name, label, opts, selected) {
  return `
    <div class="q">
      <span class="ql">${label}</span>
      ${chipGroup(name, opts, selected)}
      <div class="err" data-err="${name}">Pick one.</div>
    </div>`;
}

function showError(form, name, show) {
  form.querySelector(`[data-err="${name}"]`)?.classList.toggle("show", show);
}

/* ---------- state 4: comparison ---------- */
function renderComparison(slot, mine) {
  const peers = getVerifiedResults().filter((r) => r.course === mine.course && !r.isMine);
  const peerMedian = median(peers.map((r) => r.months));
  const headline = mine.months === 0 ? "before graduating" : `in ${monthsLabel(mine.months).toLowerCase()}`;

  slot.innerHTML = `
    <div class="result-card">
      <span class="eyebrow">✓ Result added</span>
      <h2>You found work ${headline}.</h2>
      <p>Here's how you compare with ${peers.length} other ${esc(mine.course)} grads.</p>
      <div class="compare">
        <div><b>${monthsShort(peerMedian)}</b><span>median for ${esc(mine.course)}</span></div>
        <div><b>${pctSlowerThan(peers, mine.months)}%</b><span>of grads took longer than you</span></div>
      </div>
      <a class="btn btn-light" href="#/database?q=${encodeURIComponent(mine.course)}">See all ${esc(mine.course)} results →</a>
    </div>`;
}
