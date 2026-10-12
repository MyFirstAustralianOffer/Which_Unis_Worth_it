/**
 * Database page: filters, summary stats and the results list.
 *
 * Filter state lives in this module, so it survives re-renders
 * (e.g. when the user logs in while on this page).
 */
import { $, esc, options } from "../lib/dom.js";
import { summarise } from "../lib/stats.js";
import { salaryBand, monthsShort, speedColor } from "../lib/format.js";
import { MIN_GROUP_SIZE, PAGE_SIZE, FREE_PREVIEW_COUNT } from "../config.js";
import { UNIVERSITIES, FIELDS, STUDENT_TYPES } from "../data/taxonomy.js";
import { queryResults } from "../services/results.js";
import { getUser } from "../services/auth.js";
import { resultCard } from "../components/result-card.js";
import { openAuthModal } from "../components/auth-modal.js";

const DEFAULT_FILTERS = { text: "", uni: "", field: "", years: "", type: "", verifiedOnly: true };
let filters = { ...DEFAULT_FILTERS };
let sort = "recent";
let shown = PAGE_SIZE;

export default {
  title: "Database",

  render(root, params) {
    // Links like #/database?q=Nursing pre-fill the search box.
    if (params.has("q")) { filters = { ...DEFAULT_FILTERS, text: params.get("q") }; shown = PAGE_SIZE; }

    root.innerHTML = `
      ${filterBar()}
      <section class="wrap db-body">
        <div class="summary" id="dbSummary"></div>
        <div class="list-head">
          <span id="dbCount"></span>
          <label>Sort by
            <select id="dbSort">
              <option value="recent">Most recent</option>
              <option value="fast">Fastest to a job</option>
              <option value="salary">Highest starting salary</option>
            </select>
          </label>
        </div>
        <div class="panel" id="dbResults"></div>
        <p class="note">To protect privacy, salaries are shown as bands and no names or emails are ever displayed. <span class="sample-badge">⚑ Sample data</span></p>
      </section>`;

    $("#dbSort", root).value = sort;
    wireControls(root);
    renderResults(root);
  },
};

/* ---------- markup ---------- */

function filterBar() {
  return `
    <section class="db-hero">
      <div class="wrap">
        <h1>The outcomes database</h1>
        <p>Search real grad results by course, university and year.</p>
        <div class="filters" role="search">
          <div class="field">
            <label for="fText">Course or keyword</label>
            <input id="fText" data-filter="text" type="search" placeholder="e.g. Nursing, Data Science" autocomplete="off" value="${esc(filters.text)}">
          </div>
          <div class="field">
            <label for="fUni">University</label>
            <select id="fUni" data-filter="uni"><option value="">All universities</option>${options([...UNIVERSITIES].sort(), filters.uni)}</select>
          </div>
          <div class="field">
            <label for="fField">Field</label>
            <select id="fField" data-filter="field"><option value="">All fields</option>${options(FIELDS, filters.field)}</select>
          </div>
          <div class="field">
            <label for="fYears">Graduated</label>
            <select id="fYears" data-filter="years">
              <option value="">Any year</option>
              <option value="2"${filters.years === "2" ? " selected" : ""}>Last 2 years</option>
              <option value="5"${filters.years === "5" ? " selected" : ""}>Last 5 years</option>
            </select>
          </div>
          <div class="field">
            <label for="fType">Student type</label>
            <select id="fType" data-filter="type"><option value="">All students</option>${options(STUDENT_TYPES, filters.type)}</select>
          </div>
        </div>
        <div class="filter-row">
          <label class="toggle"><input type="checkbox" data-filter="verifiedOnly"${filters.verifiedOnly ? " checked" : ""}> Verified grads only</label>
          <button class="link-btn" data-action="reset">Reset filters</button>
        </div>
      </div>
    </section>`;
}

function summaryTiles(s) {
  if (s.count < MIN_GROUP_SIZE) {
    return `<div class="stat wide"><b>Not enough results yet</b><span>We only show summaries for groups of ${MIN_GROUP_SIZE}+ grads, to protect privacy. Try widening your filters.</span></div>`;
  }
  return `
    <div class="stat"><b>${s.count}</b><span>matching results</span></div>
    <div class="stat"><b style="color:${speedColor(s.medianMonths)}">${monthsShort(s.medianMonths)}</b><span>median time to first job</span></div>
    <div class="stat"><b>${salaryBand(s.medianSalary)}</b><span>typical starting salary</span></div>
    <div class="stat"><b>${s.pctBeforeGrad}%</b><span>had a job before graduating</span></div>`;
}

function emptyState() {
  return `
    <div class="empty">
      <h3>No results match</h3>
      <p>Try a different course or clear your filters.</p>
      <button class="btn btn-dark" data-action="reset">Reset filters</button>
    </div>`;
}

function signUpWall(list) {
  const free = list.slice(0, FREE_PREVIEW_COUNT).map((r) => resultCard(r)).join("");
  const teaser = list.slice(FREE_PREVIEW_COUNT, FREE_PREVIEW_COUNT + 4);
  if (!teaser.length) return free;
  return `${free}
    <div class="lock-wrap">
      <div class="blurred" aria-hidden="true">${teaser.map((r) => resultCard(r)).join("")}</div>
      <div class="lock">
        <div class="lock-card">
          <span class="eyebrow">🔒 ${list.length - FREE_PREVIEW_COUNT} more results</span>
          <h3>Sign up free to see everything</h3>
          <p>Create a free account to browse every result, filter by uni and see how grads got hired.</p>
          <div class="lock-actions">
            <button class="btn btn-dark" data-auth="signup">Sign up free</button>
            <button class="btn btn-light" data-auth="login">Log in</button>
          </div>
        </div>
      </div>
    </div>`;
}

function fullList(list) {
  const more = list.length > shown
    ? `<div class="more"><button class="btn btn-light" data-action="more">Load more results →</button></div>`
    : "";
  return list.slice(0, shown).map((r) => resultCard(r)).join("") + more;
}

/* ---------- behaviour ---------- */

function renderResults(root) {
  const list = queryResults(filters, sort);
  $("#dbSummary", root).innerHTML = summaryTiles(summarise(list));
  $("#dbCount", root).textContent = `${list.length.toLocaleString()} result${list.length === 1 ? "" : "s"} found`;

  const panel = $("#dbResults", root);
  if (!list.length) panel.innerHTML = emptyState();
  else if (!getUser()) panel.innerHTML = signUpWall(list);
  else panel.innerHTML = fullList(list);
}

function wireControls(root) {
  const update = (e) => {
    const el = e.target.closest("[data-filter]");
    if (!el) return;
    filters[el.dataset.filter] = el.type === "checkbox" ? el.checked : el.value;
    shown = PAGE_SIZE;
    renderResults(root);
  };
  root.addEventListener("input", update);
  root.addEventListener("change", (e) => {
    if (e.target.id === "dbSort") { sort = e.target.value; shown = PAGE_SIZE; renderResults(root); }
    else update(e);
  });

  root.addEventListener("click", (e) => {
    const action = e.target.closest("[data-action]")?.dataset.action;
    const auth = e.target.closest("[data-auth]")?.dataset.auth;
    if (auth) openAuthModal({ mode: auth });
    if (action === "more") { shown += PAGE_SIZE; renderResults(root); }
    if (action === "reset") resetFilters(root);
  });
}

function resetFilters(root) {
  filters = { ...DEFAULT_FILTERS };
  sort = "recent";
  shown = PAGE_SIZE;
  history.replaceState(null, "", "#/database"); // drop any ?q= from the URL

  root.querySelectorAll("[data-filter]").forEach((el) => {
    const value = filters[el.dataset.filter];
    if (el.type === "checkbox") el.checked = value;
    else el.value = value;
  });
  $("#dbSort", root).value = sort;
  renderResults(root);
}
