/**
 * Database page: filters + expandable graduate cards.
 * Locked (blurred, with a call to action) until the person finishes the form.
 */
import { renderLayout } from "../components/layout.js";
import { entryCard, bindEntryToggles } from "../components/entry-card.js";
import { fetchEntries } from "../services/api.js";
import { isUnlocked } from "../services/access.js";
import { UNIVERSITIES, STUDENT_TYPES } from "../data/options.js";
import { CONFIG } from "../config.js";
import { $, esc, options } from "../lib/dom.js";

renderLayout();

const LATEST_YEAR = 2026;
const grid = $("#entries");
const status = $("#status");
let all = [];
let shown = CONFIG.PAGE_SIZE;

bindEntryToggles(grid);

/* ---------- filters ---------- */
const f = {
  course: $("#fCourse"),
  uni: $("#fUni"),
  years: $("#fYears"),
  type: $("#fType"),
};
f.uni.insertAdjacentHTML("beforeend", options(UNIVERSITIES.filter((u) => u !== "Other")));
f.type.insertAdjacentHTML("beforeend", options(STUDENT_TYPES));

const norm = (s) => String(s || "").trim().toLowerCase();

function filtered() {
  const course = norm(f.course.value);
  const years = Number(f.years.value);
  return all.filter((e) => {
    const y = Number(e.graduation_year); // "Before 2016" → NaN
    return (!course || norm(`${e.study_level} ${e.course_name}`).includes(course)) &&
      (!f.uni.value || e.university === f.uni.value) &&
      (!f.type.value || e.student_type === f.type.value) &&
      (!years || (y && y >= LATEST_YEAR - years));
  });
}

/* ---------- rendering ---------- */
function render() {
  const list = filtered();

  if (!isUnlocked()) {
    $("#dbArea").classList.add("locked");
    grid.innerHTML = list.slice(0, 8).map((e, i) => entryCard(e, { id: `l${i}` })).join("");
    $("#more").innerHTML = "";
    status.textContent = "";
    return;
  }

  status.textContent = `${list.length.toLocaleString()} ${list.length === 1 ? "graduate" : "graduates"} found`;
  grid.innerHTML = list.length
    ? list.slice(0, shown).map((e, i) => entryCard(e, { id: `d${i}` })).join("")
    : `<p class="entries-empty">No graduates match yet. Try a broader search, or <a class="text-link" href="share.html">share your own story</a>.</p>`;
  $("#more").innerHTML = list.length > shown
    ? `<button class="btn btn-outline" type="button" id="moreBtn">Show more</button>` : "";
  $("#moreBtn")?.addEventListener("click", () => { shown += CONFIG.PAGE_SIZE; render(); });
}

$("#filters").addEventListener("submit", (e) => { e.preventDefault(); shown = CONFIG.PAGE_SIZE; render(); });
$("#filters").addEventListener("change", () => { shown = CONFIG.PAGE_SIZE; render(); });

/* ---------- load ---------- */
async function load() {
  status.textContent = "Loading…";
  try {
    const { entries } = await fetchEntries();
    all = entries;
    // Course filter: courses that actually have entries, alphabetical.
    const courses = [...new Set(all.map((e) => e.course_name).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    f.course.insertAdjacentHTML("beforeend", courses.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join(""));
    render();
  } catch {
    status.textContent = "";
    grid.innerHTML = `<p class="entries-empty">We couldn't load the database right now. Please refresh the page.</p>`;
  }
}

load();
