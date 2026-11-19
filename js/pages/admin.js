/**
 * Admin page (admin.html): only for accounts on the admins list.
 * The database checks this on every call (supabase/admin.sql); the page just
 * shows "Not found" to everyone else.
 *
 * Sections (address bar #hash): overview · review · entries · users · cleanup · deleted · activity
 */
import { renderLayout } from "../components/layout.js?v=609b4672";
import { signInBox, bindSignInBox } from "../components/signin-box.js?v=bc107f7e";
import { showToast } from "../components/toast.js?v=8a66a045";
import { openModal, confirmModal } from "../components/modal.js?v=e11cc47b";
import { initAuth, currentUser, authError } from "../services/auth.js?v=8ebe4f88";
import { myProfile } from "../services/api.js?v=e6bfab92";
import * as api from "../services/admin-api.js?v=5ffc2a10";
import {
  UNIVERSITIES, LEVELS, STUDENT_TYPES, GRAD_YEARS, GRADUATING_YEARS, START_YEARS,
  TIME_TO_JOB, TIME_LOOKING, JOB_IN_FIELD, shortUni,
} from "../data/options.js?v=f7ec7ab0";
import { timeAgo } from "../lib/time.js?v=7bec7af8";
import { $, $$, esc, money, options } from "../lib/dom.js?v=5a71cd6c";

renderLayout();

const root = $("#adminRoot");

const TABS = [
  ["overview", "Overview"], ["review", "Review"], ["entries", "Entries"], ["users", "Users"],
  ["cleanup", "Clean-up"], ["deleted", "Deleted"], ["activity", "Activity"],
];
const FORMS = [["graduates", "Graduates"], ["current_students", "Current students"], ["future_students", "Future students"]];
const FORM_LABEL = Object.fromEntries(FORMS);
const PAGE = 50;

const state = {
  entries: { form: "graduates", filter: "all", search: "", offset: 0, rows: [], total: 0, selected: new Set() },
  users: { search: "", filter: "all", offset: 0 },
  reviewCount: null,
};

/* ---------------- small helpers ---------------- */

const date = (iso) => iso ? new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) : "–";
const when = (iso) => iso ? `<span title="${esc(new Date(iso).toLocaleString("en-AU"))}">${esc(timeAgo(new Date(iso).getTime()))}</span>` : "–";
const uniOf = (r) => {
  if (r.university_choice_1 !== undefined) {
    return [r.university_choice_1, r.university_choice_2, r.university_choice_3].filter(Boolean)
      .map((u) => (u === "Other" ? `Other: ${r.university_other || "?"}` : shortUni(u))).join(", ");
  }
  return r.university === "Other" ? `Other: ${r.university_other || "?"}` : shortUni(r.university || "–");
};
const summaryOf = (form, r) => {
  if (form === "graduates") {
    if (r.time_to_first_job === "Still looking") return `Still looking${r.time_looking ? ` · ${r.time_looking}` : ""}`;
    return `${esc(r.first_role || "–")} → ${esc(r.current_role || "–")}<br><span class="muted">${money(r.starting_salary)} → ${money(r.current_salary)} · ${esc(r.time_to_first_job || "")}</span>`;
  }
  if (form === "current_students") {
    return `${esc(r.current_role || "–")} · hoping: ${esc(r.hoped_role || "–")}<br><span class="muted">expects ${money(r.expected_salary)}</span>`;
  }
  return `Hoping: ${esc(r.hoped_role || "–")}<br><span class="muted">expects ${money(r.expected_salary)} · starts ${esc(r.planned_start_year || "–")}</span>`;
};
const chips = (form, r) => [
  form === "graduates" && r.show_in_database === false ? `<span class="chip chip-grey">Hidden</span>` : "",
  r.review === "pending" ? `<span class="chip chip-amber" title="${esc(r.flags || "")}">Needs review</span>` : "",
  r.time_to_first_job === "Still looking" ? `<span class="chip chip-blue">Still looking</span>` : "",
  r.updated_at ? `<span class="chip">Updated</span>` : "",
].join("");

function errorBox(err) {
  return `<p class="admin-error" role="alert">${esc(err?.message || "Something went wrong. Please try again.")}</p>`;
}
const loading = () => `<p class="entries-status">Loading…</p>`;

async function act(promise, done) {
  try {
    const r = await promise;
    if (done) showToast(typeof done === "function" ? done(r) : done);
    return r;
  } catch (err) {
    showToast(`<b>Couldn't do that.</b> ${esc(err.message)}`);
    throw err;
  }
}

/* ---------------- shell + routing ---------------- */

function renderShell(email) {
  root.innerHTML = `
    <div class="admin-top">
      <div><h1>Admin</h1><p class="muted">Signed in as ${esc(email)}</p></div>
      <a class="btn btn-outline btn-sm" href="https://supabase.com/dashboard/project/rgzostyfhlpvgoguithw/editor" target="_blank" rel="noopener">Open Supabase</a>
    </div>
    <nav class="admin-tabs" aria-label="Admin sections">
      ${TABS.map(([id, label]) => `<a href="#${id}" data-tab="${id}">${label}${id === "review" ? ` <span class="tab-count" id="reviewCount" hidden></span>` : ""}</a>`).join("")}
    </nav>
    <section id="panel" class="admin-panel" aria-live="polite"></section>`;
  window.addEventListener("hashchange", route);
  route();
}

function setReviewCount(n) {
  state.reviewCount = n;
  const el = $("#reviewCount");
  if (el) { el.textContent = n; el.hidden = !n; }
}

function route() {
  const tab = TABS.some(([id]) => id === location.hash.slice(1)) ? location.hash.slice(1) : "overview";
  $$(".admin-tabs a").forEach((a) => a.setAttribute("aria-current", a.dataset.tab === tab ? "page" : "false"));
  const panel = $("#panel");
  panel.innerHTML = loading();
  ({ overview: renderOverview, review: renderReview, entries: renderEntries, users: renderUsers,
     cleanup: renderCleanup, deleted: renderDeleted, activity: renderActivity })[tab](panel);
}

/* ---------------- Overview ---------------- */

function weeklyChart(weeks) {
  const W = 680, H = 190, padL = 28, padB = 26, top = 10;
  const max = Math.max(1, ...weeks.map((w) => Math.max(w.signups, w.graduates + w.students + w.future)));
  const step = (W - padL) / weeks.length;
  const bw = Math.min(16, step / 3);
  const y = (v) => top + (H - padB - top) * (1 - v / max);
  const ticks = [0, Math.round(max / 2), max];
  return `
    <svg class="admin-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Sign-ups and contributions per week, last 12 weeks">
      ${ticks.map((t) => `<line x1="${padL}" x2="${W}" y1="${y(t)}" y2="${y(t)}" class="grid"/><text x="${padL - 6}" y="${y(t) + 4}" text-anchor="end">${t}</text>`).join("")}
      ${weeks.map((w, i) => {
        const x = padL + i * step + step / 2;
        const c = w.graduates + w.students + w.future;
        const label = new Date(w.week).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
        return `
          <rect class="bar-a" x="${x - bw - 1}" y="${y(w.signups)}" width="${bw}" height="${H - padB - y(w.signups)}" rx="3"><title>Week of ${label}: ${w.signups} sign-ups</title></rect>
          <rect class="bar-b" x="${x + 1}" y="${y(c)}" width="${bw}" height="${H - padB - y(c)}" rx="3"><title>Week of ${label}: ${c} contributions (${w.graduates} graduates, ${w.students} students, ${w.future} future)</title></rect>
          ${i % 2 === weeks.length % 2 ? `<text x="${x}" y="${H - 8}" text-anchor="middle">${label}</text>` : ""}`;
      }).join("")}
    </svg>
    <div class="legend"><span><i class="bar-a"></i>Sign-ups</span><span><i class="bar-b"></i>Contributions</span></div>`;
}

async function renderOverview(panel) {
  let o;
  try { o = await api.overview(); } catch (err) { panel.innerHTML = errorBox(err); return; }
  setReviewCount(o.to_review);
  const tile = (label, value, sub = "", href = "") =>
    `<${href ? `a href="${href}"` : "div"} class="tile${href ? " tile-link" : ""}"><span class="tile-label">${label}</span><b>${value}</b>${sub ? `<span class="tile-sub">${sub}</span>` : ""}</${href ? "a" : "div"}>`;
  const maxUni = Math.max(1, ...o.top_unis.map((u) => u.count));
  panel.innerHTML = `
    <div class="tiles">
      ${tile("Registered users", o.users, `+${o.users_7d} this week · ${o.signins_7d} signed in this week`, "#users")}
      ${tile("Contributed", o.contributed, `${o.not_contributed} signed up but haven't shared`)}
      ${tile("Graduate stories", o.graduates, `+${o.graduates_7d} this week · ${o.updated_7d} updated`, "#entries")}
      ${tile("Shown on the site", o.on_site, `${o.hidden} hidden · ${o.still_looking} still looking (kept off)`)}
      ${tile("Need review", o.to_review, o.to_review ? "Flagged and not checked yet" : "All clear", "#review")}
      ${tile("Students", o.current_students + o.future_students, `${o.current_students} studying · ${o.future_students} planning`)}
      ${tile("Sign-in method", `${o.google} / ${o.email_link}`, "Google / email link")}
      ${tile("In the 30-day bin", o.deleted, "Deleted, still restorable", "#deleted")}
    </div>
    <div class="admin-grid">
      <div class="admin-card"><h2>Last 12 weeks</h2>${weeklyChart(o.weeks)}</div>
      <div class="admin-card">
        <h2>Most graduate stories by university</h2>
        <ul class="hbars">${o.top_unis.map((u) => `
          <li><span class="hb-name">${esc(u.name)}</span><span class="hb-bar"><i style="width:${(u.count / maxUni) * 100}%"></i></span><b>${u.count}</b></li>`).join("")}
        </ul>
      </div>
    </div>`;
}

/* ---------------- Review queue ---------------- */

async function renderReview(panel) {
  let data;
  try { data = await api.entries({ form: "graduates", filter: "review", limit: 300 }); } catch (err) { panel.innerHTML = errorBox(err); return; }
  setReviewCount(data.total);
  if (!data.rows.length) {
    panel.innerHTML = `<div class="admin-card empty"><h2>Nothing to review</h2><p class="muted">Every flagged entry has been checked. New ones show up here (and in the Monday email).</p></div>`;
    return;
  }
  panel.innerHTML = `
    <p class="muted panel-lead">${data.total} graduate ${data.total === 1 ? "entry has" : "entries have"} something worth a quick look. <b>Looks fine</b> keeps it on the site; <b>Hide</b> takes it off (it stays saved).</p>
    <div class="review-list">${data.rows.map((r) => `
      <article class="review-card" data-id="${r.id}">
        <div class="rc-main">
          <p class="rc-title">${esc(r.course_name || "–")} <span class="muted">· ${esc(uniOf(r))} (${esc(r.graduation_year || "–")})</span></p>
          <p class="rc-sum">${summaryOf("graduates", r)}</p>
          <p class="rc-flags">${esc(r.flags)}</p>
          <p class="muted rc-meta">#${r.id} · ${esc(r.email || "no email")} · ${r.updated_at ? `updated ${date(r.updated_at)}` : date(r.submitted_at)}</p>
        </div>
        <div class="rc-actions">
          <button class="btn btn-primary btn-sm" data-do="fine">Looks fine</button>
          <button class="btn btn-outline btn-sm" data-do="hide">Hide</button>
          <button class="btn btn-outline btn-sm" data-do="edit">Edit</button>
          <button class="btn btn-outline btn-sm danger-text" data-do="delete">Delete</button>
        </div>
      </article>`).join("")}
    </div>`;
  panel.querySelectorAll(".review-card").forEach((card) => {
    const id = Number(card.dataset.id);
    const gone = () => {
      card.classList.add("leaving");
      setTimeout(() => { card.remove(); setReviewCount(Math.max(0, state.reviewCount - 1)); if (!panel.querySelector(".review-card")) renderReview(panel); }, 250);
    };
    card.addEventListener("click", async (e) => {
      const what = e.target.closest("[data-do]")?.dataset.do;
      if (!what) return;
      if (what === "fine") { await act(api.markReviewed([id]), "Marked as fine."); gone(); }
      if (what === "hide") { await act(api.setVisible([id], false), "Hidden from the site."); gone(); }
      if (what === "edit") openEditor("graduates", id, () => renderReview(panel));
      if (what === "delete" && await confirmDelete(1)) { await act(api.deleteEntries("graduates", [id]), deletedToast); gone(); }
    });
  });
}

const deletedToast = (r) => `<b>Deleted.</b> ${r.deleted === 1 ? "It's" : "They're"} in the 30-day bin if you need ${r.deleted === 1 ? "it" : "them"} back.`;
const confirmDelete = (n) => confirmModal({
  title: n === 1 ? "Delete this entry?" : `Delete ${n} entries?`,
  text: `${n === 1 ? "It" : "They"} will disappear from the site straight away. You can restore ${n === 1 ? "it" : "them"} from <b>Deleted</b> for 30 days, then ${n === 1 ? "it's" : "they're"} gone for good.`,
  confirm: "Delete", danger: true,
});

/* ---------------- Entries ---------------- */

const FILTERS = {
  graduates: [["all", "All"], ["review", "Needs review"], ["hidden", "Hidden"], ["still_looking", "Still looking"], ["other_uni", "University: Other"], ["updated", "Updated by the person"]],
  current_students: [["all", "All"], ["other_uni", "University: Other"], ["updated", "Updated by the person"]],
  future_students: [["all", "All"], ["other_uni", "University: Other"], ["updated", "Updated by the person"]],
};

function renderEntries(panel) {
  const s = state.entries;
  if (!FILTERS[s.form].some(([f]) => f === s.filter)) s.filter = "all";
  panel.innerHTML = `
    <div class="admin-controls">
      <div class="seg" role="tablist" aria-label="Form">${FORMS.map(([f, label]) =>
        `<button type="button" role="tab" aria-selected="${f === s.form}" data-form="${f}">${label}</button>`).join("")}</div>
      <select class="field field-sm" id="eFilter" aria-label="Show">${FILTERS[s.form].map(([f, label]) =>
        `<option value="${f}"${f === s.filter ? " selected" : ""}>${label}</option>`).join("")}</select>
      <input class="field field-sm" id="eSearch" type="search" placeholder="Search email, course, uni, role…" value="${esc(s.search)}">
      <button class="btn btn-outline btn-sm" id="eExport" type="button">Download CSV</button>
    </div>
    <div class="bulk" id="bulk" hidden></div>
    <div id="eTable">${loading()}</div>`;

  panel.querySelectorAll("[data-form]").forEach((b) => b.addEventListener("click", () => {
    s.form = b.dataset.form; s.offset = 0; s.selected.clear(); renderEntries(panel);
  }));
  $("#eFilter").addEventListener("change", (e) => { s.filter = e.target.value; s.offset = 0; s.selected.clear(); loadEntries(); });
  let t;
  $("#eSearch").addEventListener("input", (e) => {
    clearTimeout(t);
    t = setTimeout(() => { s.search = e.target.value.trim(); s.offset = 0; s.selected.clear(); loadEntries(); }, 300);
  });
  $("#eExport").addEventListener("click", () => exportCsv());
  loadEntries();
}

async function loadEntries() {
  const s = state.entries;
  const box = $("#eTable");
  if (!box) return;
  box.innerHTML = loading();
  let data;
  try { data = await api.entries({ form: s.form, filter: s.filter, search: s.search, limit: PAGE, offset: s.offset }); }
  catch (err) { box.innerHTML = errorBox(err); return; }
  s.rows = data.rows; s.total = data.total;
  if (!data.rows.length) { box.innerHTML = `<p class="entries-status">No entries match.</p>`; renderBulk(); return; }
  box.innerHTML = `
    <div class="table-wrap"><table class="admin-table">
      <thead><tr>
        <th class="cb"><input type="checkbox" id="selAll" aria-label="Select all on this page"></th>
        <th>Shared</th><th>Email</th><th>Course</th><th>University</th><th>Answers</th><th>Status</th>
      </tr></thead>
      <tbody>${data.rows.map((r) => `
        <tr data-id="${r.id}">
          <td class="cb"><input type="checkbox" data-sel="${r.id}"${s.selected.has(r.id) ? " checked" : ""} aria-label="Select entry ${r.id}"></td>
          <td data-label="Shared">${date(r.submitted_at)}<br><span class="muted">#${r.id}</span></td>
          <td data-label="Email" class="email">${esc(r.email || "–")}</td>
          <td data-label="Course">${esc(r.course_name || "–")}<br><span class="muted">${esc(r.study_level || "")}</span></td>
          <td data-label="University">${esc(uniOf(r))}</td>
          <td data-label="Answers">${summaryOf(s.form, r)}</td>
          <td data-label="Status">${chips(s.form, r) || `<span class="muted">–</span>`}</td>
        </tr>`).join("")}
      </tbody>
    </table></div>
    <div class="pager">
      <span class="muted">${s.offset + 1}–${s.offset + data.rows.length} of ${data.total}</span>
      <button class="btn btn-outline btn-sm" id="prev"${s.offset ? "" : " disabled"}>Previous</button>
      <button class="btn btn-outline btn-sm" id="next"${s.offset + PAGE < data.total ? "" : " disabled"}>Next</button>
    </div>`;

  box.querySelector("tbody").addEventListener("click", (e) => {
    if (e.target.closest(".cb")) return;
    const tr = e.target.closest("tr[data-id]");
    if (tr) openEditor(s.form, Number(tr.dataset.id), loadEntries);
  });
  box.querySelectorAll("[data-sel]").forEach((cb) => cb.addEventListener("change", () => {
    const id = Number(cb.dataset.sel);
    cb.checked ? s.selected.add(id) : s.selected.delete(id);
    renderBulk();
  }));
  $("#selAll").addEventListener("change", (e) => {
    s.rows.forEach((r) => (e.target.checked ? s.selected.add(r.id) : s.selected.delete(r.id)));
    box.querySelectorAll("[data-sel]").forEach((cb) => { cb.checked = e.target.checked; });
    renderBulk();
  });
  $("#prev").addEventListener("click", () => { s.offset = Math.max(0, s.offset - PAGE); loadEntries(); });
  $("#next").addEventListener("click", () => { s.offset += PAGE; loadEntries(); });
  renderBulk();
}

function renderBulk() {
  const s = state.entries;
  const bar = $("#bulk");
  if (!bar) return;
  const ids = [...s.selected];
  bar.hidden = !ids.length;
  if (!ids.length) return;
  const grads = s.form === "graduates";
  bar.innerHTML = `
    <b>${ids.length} selected</b>
    ${grads ? `<button class="btn btn-outline btn-sm" data-b="fine">Looks fine</button>
               <button class="btn btn-outline btn-sm" data-b="hide">Hide</button>
               <button class="btn btn-outline btn-sm" data-b="show">Show</button>` : ""}
    <button class="btn btn-outline btn-sm" data-b="csv">Download selected</button>
    <button class="btn btn-outline btn-sm danger-text" data-b="delete">Delete</button>
    <button class="text-link" data-b="clear">Clear</button>`;
  bar.onclick = async (e) => {
    const what = e.target.closest("[data-b]")?.dataset.b;
    if (!what) return;
    if (what === "clear") { s.selected.clear(); loadEntries(); return; }
    if (what === "csv") { exportCsv(ids); return; }
    if (what === "fine") await act(api.markReviewed(ids), (r) => `Marked ${r.changed} as fine.`);
    if (what === "hide") await act(api.setVisible(ids, false), (r) => `Hid ${r.changed} from the site.`);
    if (what === "show") await act(api.setVisible(ids, true), (r) => `Showing ${r.changed} on the site.`);
    if (what === "delete") {
      if (!await confirmDelete(ids.length)) return;
      await act(api.deleteEntries(s.form, ids), deletedToast);
    }
    s.selected.clear();
    loadEntries();
  };
}

/* ---------------- CSV export ---------------- */

const CSV_FIRST = ["id", "submitted_at", "updated_at", "email", "study_level", "course_name", "course_from_list",
  "university", "university_other", "university_choice_1", "university_choice_2", "university_choice_3", "student_type"];

async function exportCsv(onlyIds) {
  const s = state.entries;
  let rows;
  try {
    rows = (await api.entries({ form: s.form, filter: s.filter, search: s.search, limit: 5000 })).rows;
  } catch (err) { showToast(`<b>Couldn't download.</b> ${esc(err.message)}`); return; }
  if (onlyIds) rows = rows.filter((r) => onlyIds.includes(r.id));
  const keys = [...new Set([...CSV_FIRST.filter((k) => rows.some((r) => k in r)), ...rows.flatMap(Object.keys)])].filter((k) => k !== "user_id");
  const cell = (v) => {
    const t = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  const csv = [keys.join(","), ...rows.map((r) => keys.map((k) => cell(r[k])).join(","))].join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
  a.download = `return-on-uni-${s.form}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  showToast(`Downloaded ${rows.length} ${rows.length === 1 ? "entry" : "entries"}.`);
}

/* ---------------- Entry editor ---------------- */

const READ_ONLY = ["id", "email", "submitted_at", "updated_at", "reviewed_at", "form_version"];
// Editor shows fields in the form's order; anything else follows.
const FIELD_ORDER = ["study_level", "course_name", "university", "university_choice_1", "university_choice_2", "university_choice_3",
  "university_other", "student_type", "graduation_year", "expected_graduation_year", "planned_start_year",
  "time_to_first_job", "time_looking", "job_in_field", "first_role", "starting_salary", "current_role", "current_salary",
  "hoped_role", "expected_salary"];
const byFormOrder = (a, b) => (FIELD_ORDER.indexOf(a) + 1 || 99) - (FIELD_ORDER.indexOf(b) + 1 || 99);
const HIDDEN = ["user_id", "flags", "review"];
const CHOICES = {
  study_level: LEVELS, student_type: STUDENT_TYPES, graduation_year: GRAD_YEARS,
  expected_graduation_year: GRADUATING_YEARS, planned_start_year: START_YEARS,
  time_to_first_job: TIME_TO_JOB, time_looking: TIME_LOOKING, job_in_field: JOB_IN_FIELD,
  university: UNIVERSITIES, university_choice_1: UNIVERSITIES, university_choice_2: UNIVERSITIES, university_choice_3: UNIVERSITIES,
};
const BOOLS = ["show_in_database", "course_from_list", "current_salary_same", "consent_privacy"];
const NUMBERS = ["starting_salary", "current_salary", "expected_salary", "form_version"];
const LABELS = {
  show_in_database: "Show on the site", course_from_list: "Course picked from the official list",
  current_salary_same: "Salary now same as first", consent_privacy: "Agreed to the Privacy policy",
  time_to_first_job: "Time to first job in field", current_role: "Role now", current_salary: "Salary now",
  first_role: "First role", starting_salary: "Starting salary", university_other: "University (typed, if Other)",
};
const label = (k) => LABELS[k] || k.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

function fieldHtml(k, v) {
  const id = `f_${k}`;
  if (BOOLS.includes(k)) {
    return `<label class="ed-check"><input type="checkbox" id="${id}" data-k="${k}"${v ? " checked" : ""}> ${esc(label(k))}</label>`;
  }
  let input;
  if (CHOICES[k]) {
    const list = CHOICES[k].includes(v) || v === null || v === undefined || v === "" ? CHOICES[k] : [v, ...CHOICES[k]];
    input = `<select class="field" id="${id}" data-k="${k}"><option value="">–</option>${options(list, v ?? "")}</select>`;
  } else if (NUMBERS.includes(k)) {
    input = `<input class="field" id="${id}" data-k="${k}" type="number" min="0" step="1" value="${esc(v ?? "")}">`;
  } else {
    input = `<input class="field" id="${id}" data-k="${k}" type="text" value="${esc(v ?? "")}">`;
  }
  return `<div class="ed-field"><label for="${id}">${esc(label(k))}</label>${input}</div>`;
}

async function openEditor(form, id, onChanged) {
  let data;
  try { data = await api.entry(form, id); } catch (err) { showToast(`<b>Couldn't open it.</b> ${esc(err.message)}`); return; }
  const e = data.entry;
  const keys = Object.keys(e).filter((k) => !HIDDEN.includes(k) && !READ_ONLY.includes(k)).sort(byFormOrder);
  const grads = form === "graduates";
  const { el, close } = openModal({
    title: `${FORM_LABEL[form]} entry #${e.id}`,
    wide: true,
    body: `
      <p class="muted ed-meta">${esc(e.email || "no email")} · shared ${date(e.submitted_at)}${e.updated_at ? ` · updated ${date(e.updated_at)}` : ""}${e.reviewed_at ? ` · checked ${date(e.reviewed_at)}` : ""}</p>
      ${e.flags ? `<p class="rc-flags">${esc(e.flags)}</p>` : ""}
      <div class="ed-grid">${keys.filter((k) => !BOOLS.includes(k)).map((k) => fieldHtml(k, e[k])).join("")}</div>
      <div class="ed-checks">${keys.filter((k) => BOOLS.includes(k)).map((k) => fieldHtml(k, e[k])).join("")}</div>
      <p class="admin-error" id="edErr" role="alert"></p>
      ${data.history.length ? `
        <details class="ed-history"><summary>Earlier versions (${data.history.length})</summary>
          ${data.history.map((h) => `<div class="ed-h"><b>Before ${date(h.changed_at)}</b>: ${esc(
            ["course_name", "university", "first_role", "starting_salary", "current_role", "current_salary", "hoped_role", "expected_salary", "time_to_first_job"]
              .filter((k) => h.previous[k] !== undefined && h.previous[k] !== null && String(h.previous[k]) !== String(e[k]))
              .map((k) => `${label(k)}: ${h.previous[k]}`).join(" · ") || "no differences from now")}</div>`).join("")}
        </details>` : ""}`,
    actions: [
      { label: "Delete", kind: "outline", left: true, onClick: async (close2) => {
        if (!await confirmDelete(1)) return;
        await act(api.deleteEntries(form, [id]), deletedToast);
        close2(); onChanged?.();
      } },
      ...(grads && e.review === "pending" ? [{ label: "Looks fine", kind: "outline", onClick: async (close2) => {
        await act(api.markReviewed([id]), "Marked as fine."); close2(); onChanged?.();
      } }] : []),
      { label: "Cancel", kind: "outline", onClick: (close2) => close2() },
      { label: "Save changes", kind: "primary", onClick: async (close2, btn) => {
        const changes = {};
        el.querySelectorAll("[data-k]").forEach((inp) => {
          const k = inp.dataset.k;
          let v = inp.type === "checkbox" ? inp.checked : inp.value.trim();
          if (v === "" && !BOOLS.includes(k)) v = null;
          if (NUMBERS.includes(k) && v !== null) v = Number(v);
          const before = BOOLS.includes(k) ? Boolean(e[k]) : e[k] === undefined ? null : e[k];
          if (String(v ?? "") !== String(before ?? "")) changes[k] = v;
        });
        if (!Object.keys(changes).length) { close2(); return; }
        btn.disabled = true;
        try {
          await api.updateEntry(form, id, changes);
          showToast(`Saved ${Object.keys(changes).length} change${Object.keys(changes).length === 1 ? "" : "s"}. The old version is kept in history.`);
          close2(); onChanged?.();
        } catch (err) {
          $("#edErr", el).textContent = err.message;
          btn.disabled = false;
        }
      } },
    ],
  });
  el.querySelector(".modal-left")?.classList.add("danger-text");
  void close;
}

/* ---------------- Users ---------------- */

async function renderUsers(panel) {
  const s = state.users;
  panel.innerHTML = `
    <div class="admin-controls">
      <select class="field field-sm" id="uFilter" aria-label="Show">
        <option value="all">Everyone</option><option value="contributed">Shared their story</option><option value="not_contributed">Signed up, not shared yet</option>
      </select>
      <input class="field field-sm" id="uSearch" type="search" placeholder="Search email or name…" value="${esc(s.search)}">
    </div>
    <div id="uTable">${loading()}</div>`;
  $("#uFilter").value = s.filter;
  $("#uFilter").addEventListener("change", (e) => { s.filter = e.target.value; s.offset = 0; loadUsers(); });
  let t;
  $("#uSearch").addEventListener("input", (e) => { clearTimeout(t); t = setTimeout(() => { s.search = e.target.value.trim(); s.offset = 0; loadUsers(); }, 300); });
  loadUsers();
}

async function loadUsers() {
  const s = state.users;
  const box = $("#uTable");
  if (!box) return;
  box.innerHTML = loading();
  let data;
  try { data = await api.users({ search: s.search, filter: s.filter, limit: PAGE, offset: s.offset }); }
  catch (err) { box.innerHTML = errorBox(err); return; }
  if (!data.rows.length) { box.innerHTML = `<p class="entries-status">No accounts match.</p>`; return; }
  const storyLinks = (u) => [
    u.graduate_id && `<button class="text-link" data-open="graduates:${u.graduate_id}">Graduate #${u.graduate_id}</button>`,
    u.student_id && `<button class="text-link" data-open="current_students:${u.student_id}">Student #${u.student_id}</button>`,
    u.future_id && `<button class="text-link" data-open="future_students:${u.future_id}">Future #${u.future_id}</button>`,
  ].filter(Boolean).join("<br>") || `<span class="muted">Not shared yet</span>`;
  box.innerHTML = `
    <div class="table-wrap"><table class="admin-table">
      <thead><tr><th>Email</th><th>Name</th><th>Signs in with</th><th>Joined</th><th>Last sign-in</th><th>Story</th><th></th></tr></thead>
      <tbody>${data.rows.map((u) => `
        <tr>
          <td data-label="Email" class="email">${esc(u.email)}</td>
          <td data-label="Name">${esc(u.name || "–")}</td>
          <td data-label="Signs in with">${u.provider === "google" ? "Google" : "Email link"}</td>
          <td data-label="Joined">${date(u.joined)}</td>
          <td data-label="Last sign-in">${when(u.last_sign_in)}</td>
          <td data-label="Story">${storyLinks(u)}</td>
          <td><button class="btn btn-outline btn-sm danger-text" data-del="${u.id}" data-email="${esc(u.email)}">Delete account</button></td>
        </tr>`).join("")}
      </tbody>
    </table></div>
    <div class="pager">
      <span class="muted">${s.offset + 1}–${s.offset + data.rows.length} of ${data.total}</span>
      <button class="btn btn-outline btn-sm" id="uPrev"${s.offset ? "" : " disabled"}>Previous</button>
      <button class="btn btn-outline btn-sm" id="uNext"${s.offset + PAGE < data.total ? "" : " disabled"}>Next</button>
    </div>`;
  box.querySelectorAll("[data-open]").forEach((b) => b.addEventListener("click", () => {
    const [form, id] = b.dataset.open.split(":");
    openEditor(form, Number(id), loadUsers);
  }));
  box.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", async () => {
    const ok = await confirmModal({
      title: "Delete this account?",
      text: `<b>${esc(b.dataset.email)}</b> will be signed out and can't sign in again with this account. Their answers move to the 30-day bin (restorable, without the account); their account and its history are removed for good.`,
      confirm: "Delete account", danger: true, typeToConfirm: "DELETE",
    });
    if (!ok) return;
    await act(api.deleteUser(b.dataset.del), "Account deleted. Their answers are in the 30-day bin.");
    loadUsers();
  }));
  $("#uPrev").addEventListener("click", () => { s.offset = Math.max(0, s.offset - PAGE); loadUsers(); });
  $("#uNext").addEventListener("click", () => { s.offset += PAGE; loadUsers(); });
}

/* ---------------- Clean-up ---------------- */

async function renderCleanup(panel) {
  let lists;
  try { lists = await api.cleanupLists(); } catch (err) { panel.innerHTML = errorBox(err); return; }
  const list = (items, name) => items.length ? `
    <ul class="clean-list">${items.map((it, i) => `
      <li><label><input type="checkbox" name="${name}" value="${esc(it.value)}" id="${name}${i}"> <span>${esc(it.value)}</span></label><b>${it.count}</b></li>`).join("")}
    </ul>` : `<p class="muted">Nothing here right now.</p>`;
  panel.innerHTML = `
    <div class="admin-grid">
      <div class="admin-card">
        <h2>Universities typed under "Other"</h2>
        <p class="muted">Tick the ones that are really a university in our list (like KOI → King's Own Institute), choose it, and apply. Every matching entry is moved.</p>
        ${list(lists.other_unis, "ou")}
        ${lists.other_unis.length ? `
          <div class="clean-apply">
            <select class="field field-sm" id="ouTarget"><option value="">Move to…</option>${options(UNIVERSITIES.filter((u) => u !== "Other"))}</select>
            <button class="btn btn-primary btn-sm" id="ouApply">Apply</button>
          </div>` : ""}
      </div>
      <div class="admin-card">
        <h2>Course names typed by hand</h2>
        <p class="muted">Courses people typed instead of picking from the official list. Tick the ones that mean the same course, type the name to use, and apply.</p>
        ${list(lists.typed_courses, "tc")}
        ${lists.typed_courses.length ? `
          <div class="clean-apply">
            <input class="field field-sm" id="tcTarget" type="text" placeholder="Course name to use, e.g. Master of Data Science">
            <button class="btn btn-primary btn-sm" id="tcApply">Apply</button>
          </div>` : ""}
      </div>
    </div>`;
  const ticked = (name) => [...panel.querySelectorAll(`input[name="${name}"]:checked`)].map((i) => i.value);
  $("#ouApply")?.addEventListener("click", async () => {
    const vals = ticked("ou");
    const target = $("#ouTarget").value;
    if (!vals.length || !target) { showToast("Tick at least one name and choose a university."); return; }
    await act(api.assignUniversity(vals, target), (r) => `Moved ${r.changed} ${r.changed === 1 ? "entry" : "entries"} to ${esc(target)}.`);
    renderCleanup(panel);
  });
  $("#tcApply")?.addEventListener("click", async () => {
    const vals = ticked("tc");
    const target = $("#tcTarget").value.trim();
    if (!vals.length || !target) { showToast("Tick at least one course and type the name to use."); return; }
    await act(api.renameCourse(vals, target), (r) => `Renamed ${r.changed} ${r.changed === 1 ? "entry" : "entries"}.`);
    renderCleanup(panel);
  });
}

/* ---------------- Deleted (30-day bin) ---------------- */

async function renderDeleted(panel) {
  let rows;
  try { rows = await api.deleted(); } catch (err) { panel.innerHTML = errorBox(err); return; }
  if (!rows.length) {
    panel.innerHTML = `<div class="admin-card empty"><h2>The bin is empty</h2><p class="muted">Deleted entries stay here for 30 days, so mistakes can be undone. After that they're removed for good.</p></div>`;
    return;
  }
  const daysLeft = (iso) => Math.max(0, Math.ceil((new Date(iso) - Date.now()) / 86400000));
  panel.innerHTML = `
    <p class="muted panel-lead">Deleted entries stay here for 30 days, then they're removed for good.</p>
    <div class="table-wrap"><table class="admin-table">
      <thead><tr><th>Deleted</th><th>Entry</th><th>Email</th><th>Why</th><th>Removed for good in</th><th></th></tr></thead>
      <tbody>${rows.map((d) => `
        <tr>
          <td data-label="Deleted">${date(d.deleted_at)}<br><span class="muted">${esc(d.deleted_by || "")}</span></td>
          <td data-label="Entry">${esc(FORM_LABEL[d.form])} #${d.entry_id}<br><span class="muted">${esc(d.course_name || "–")} · ${esc(d.university === "Other" ? `Other: ${d.university_other || "?"}` : shortUni(d.university || "–"))}</span></td>
          <td data-label="Email" class="email">${esc(d.email || "–")}</td>
          <td data-label="Why">${esc(d.reason || "–")}</td>
          <td data-label="Removed in">${daysLeft(d.purge_after)} days</td>
          <td><button class="btn btn-outline btn-sm" data-restore="${d.id}">Restore</button></td>
        </tr>`).join("")}
      </tbody>
    </table></div>`;
  panel.querySelectorAll("[data-restore]").forEach((b) => b.addEventListener("click", async () => {
    await act(api.restore(Number(b.dataset.restore)), "Restored.");
    renderDeleted(panel);
  }));
}

/* ---------------- Activity ---------------- */

function describe(a) {
  const d = a.details || {};
  const ids = d.ids ? `${d.ids.length === 1 ? "entry" : `${d.ids.length} entries`} #${d.ids.join(", #")}` : d.id ? `entry #${d.id}` : "";
  const form = d.form ? `${FORM_LABEL[d.form] || d.form} ` : "";
  switch (a.action) {
    case "edit entry": return `Edited ${form}${ids}: ${Object.entries(d.changes || {}).map(([k, v]) => `${label(k)} → ${v}`).join(", ")}`;
    case "assign university": return `Moved ${d.entries} ${d.entries === 1 ? "entry" : "entries"} (${(d.from || []).join(", ")}) to ${d.to}`;
    case "rename course": return `Renamed ${d.entries} ${d.entries === 1 ? "entry" : "entries"} (${(d.from || []).join(", ")}) to "${d.to}"`;
    case "delete account": return `Deleted the account ${d.email}`;
    default: return `${a.action.replace(/^./, (c) => c.toUpperCase())}: ${form}${ids}`;
  }
}

async function renderActivity(panel) {
  let rows;
  try { rows = await api.activity(); } catch (err) { panel.innerHTML = errorBox(err); return; }
  panel.innerHTML = rows.length ? `
    <ul class="activity">${rows.map((a) => `
      <li><span class="muted act-when" title="${esc(new Date(a.at).toLocaleString("en-AU"))}">${date(a.at)}</span><span>${esc(describe(a))}</span><span class="muted act-who">${esc(a.admin_email || "")}</span></li>`).join("")}
    </ul>` : `<div class="admin-card empty"><h2>No changes yet</h2><p class="muted">Every edit, hide, delete and clean-up made here will be listed, with who did it and when.</p></div>`;
}

/* ---------------- start ---------------- */

async function start() {
  await initAuth();
  const user = currentUser();
  if (!user) {
    root.innerHTML = `<div class="admin-card narrow">${signInBox({ title: "Sign in", error: authError })}</div>`;
    bindSignInBox(root, { next: "admin.html" });
    return;
  }
  const profile = await myProfile();
  if (!profile.is_admin) {
    root.innerHTML = `<div class="not-found"><h1>Not found</h1><p class="muted">There's nothing here.</p><a class="btn btn-primary" href="index.html">Go to the homepage</a></div>`;
    return;
  }
  renderShell(user.email);
}

start();
