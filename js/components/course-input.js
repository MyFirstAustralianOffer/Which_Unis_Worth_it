/**
 * Course name box, backed by the database of real Australian course titles:
 *   1. type-ahead: official titles at the chosen level, with where they're offered
 *   2. "Did you mean …?": up to 3 close official titles when what they typed isn't one
 *      ("Masters in Politics" → Master of Political Science / Master of Political Economy …)
 *
 * Both are suggestions: people can always keep what they typed (it goes to the
 * review tab in the Google Sheet).
 */
import { esc } from "../lib/dom.js";
import { searchCourses, closestCourses, findExact, offeredAt } from "../lib/course-search.js";
import { shortUni } from "../data/options.js";
import { loadCourseIndex } from "../services/courses.js";

const MAX_SUGGESTIONS = 8;

/** HTML for the input + list + hint. `id` must be unique on the page. */
export function courseInputHtml({ id, field, value, placeholder }) {
  return `
    <div class="combo" data-course-combo>
      <input class="field" id="${id}" type="text" maxlength="150" autocomplete="off" spellcheck="true"
             role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="${id}-list"
             aria-describedby="${id}-hint" aria-label="Course name"
             placeholder="${esc(placeholder)}" value="${esc(value)}" data-field="${field}">
      <ul class="combo-list" id="${id}-list" role="listbox" hidden></ul>
    </div>
    <p class="course-hint" id="${id}-hint" aria-live="polite" hidden></p>`;
}

/**
 * Wire up the box.
 *   setCourse(title, official)  saves the course text (+ whether it's an official title)
 *   getLevel() / setLevel(l)    the level dropdown
 *   setSuggestion(title)        the closest official title, saved for the review tab
 */
export function bindCourseInput(root, { setCourse, getLevel, setLevel, setSuggestion }) {
  const input = root.querySelector("[data-course-combo] input");
  const list = root.querySelector("[data-course-combo] [role=listbox]");
  const hint = root.querySelector(".course-hint");

  let index = null;
  let matches = [];
  let active = -1;          // highlighted row; matches.length = the "Other" row
  let timer = null;
  let keptAsTyped = "";     // text the person chose to keep via "Other" (no more hints for it)
  const OTHER = -1;

  loadCourseIndex().then((idx) => {
    index = idx;
    if (!index) return;
    report();
    if (document.activeElement === input) update(); else updateHint();
  });

  /** Tell the form whether the current text is an official title. */
  function report() {
    const exact = index && findExact(index, input.value);
    setCourse(exact ? exact.name : input.value, !!exact);
  }

  /* ---------- type-ahead ---------- */
  function renderList() {
    if (!listWanted()) return closeList();
    const other = matches.length;
    list.innerHTML = matches.map((c, i) => `
      <li role="option" id="${input.id}-opt-${i}" data-i="${i}" aria-selected="${i === active}">
        <span class="opt-name">${esc(c.name)}</span>
        <span class="opt-meta">${esc(offeredAt(c, shortUni))}</span>
      </li>`).join("") + `
      <li role="option" class="opt-other" id="${input.id}-opt-${other}" data-i="${OTHER}" aria-selected="${active === other}">
        <span class="opt-name">Other: my course isn't listed</span>
        <span class="opt-meta">keep “${esc(input.value.trim())}”</span>
      </li>`;
    list.hidden = false;
    input.setAttribute("aria-expanded", "true");
    if (active >= 0) input.setAttribute("aria-activedescendant", `${input.id}-opt-${active}`);
    else input.removeAttribute("aria-activedescendant");
  }

  function closeList() {
    list.hidden = true;
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
    active = -1;
  }

  /* ---------- "Did you mean …?" ---------- */
  /** The list shows while they type 2+ characters that aren't already an official title. */
  function listWanted() {
    const q = input.value.trim();
    return q.length >= 2 && !(index && findExact(index, q)) && q !== keptAsTyped;
  }

  function updateHint() {
    if (!index || input.value.trim().length < 2) { setSuggestion(""); return hideHint(); }
    if (input.value.trim() === keptAsTyped) return hideHint();
    const options = closestCourses(index, input.value, getLevel());
    setSuggestion(options.map((c) => c.name).join(" | ")); // all close options go to the review tab
    if (!options.length) return hideHint();
    hint.innerHTML = `<span>Did you mean${options.length > 1 ? " one of these" : ""}?</span>` +
      options.map((c, i) => `<button type="button" class="hint-btn" data-i="${i}">${esc(c.name)}</button>`).join("");
    hint.hidden = false;
    hint.querySelectorAll(".hint-btn").forEach((b) => b.addEventListener("click", () => choose(options[+b.dataset.i])));
  }

  function hideHint() { hint.hidden = true; hint.innerHTML = ""; }

  /** "Other": keep exactly what they typed (it goes to the review tab in the sheet). */
  function keepTyped() {
    keptAsTyped = input.value.trim();
    report();
    const options = index ? closestCourses(index, input.value, getLevel()) : [];
    setSuggestion(options.map((c) => c.name).join(" | ")); // still help the reviewer
    closeList();
    hideHint();
    input.focus();
  }

  /* ---------- picking a title ---------- */
  function choose(course) {
    keptAsTyped = "";
    input.value = course.name;
    // Keep the level consistent with the title they picked.
    const level = getLevel();
    if (!course.levels.includes(level)) setLevel(course.levels[0]);
    setCourse(course.name, true);
    setSuggestion("");
    closeList();
    hideHint();
    input.focus();
  }

  function update() {
    report();
    if (!index) return;
    const q = input.value.trim();
    if (q !== keptAsTyped) keptAsTyped = "";
    matches = listWanted() ? searchCourses(index, q, getLevel(), MAX_SUGGESTIONS) : [];
    active = -1;
    renderList();
    hideHint();
    clearTimeout(timer);
    timer = setTimeout(() => { if (list.hidden) updateHint(); }, 400);
  }

  input.addEventListener("input", update);
  input.addEventListener("focus", () => { if (input.value.trim().length >= 2) update(); });
  input.addEventListener("blur", () => setTimeout(() => { closeList(); updateHint(); }, 150));
  input.addEventListener("keydown", (e) => {
    if (list.hidden) return;
    const rows = matches.length + 1; // + "Other"
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      active = active < 0 && e.key === "ArrowUp" ? rows - 1 : (active + (e.key === "ArrowDown" ? 1 : -1) + rows) % rows;
      renderList();
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault(); // pick the suggestion instead of submitting the question
      if (active === matches.length) keepTyped(); else choose(matches[active]);
    } else if (e.key === "Escape") {
      closeList();
      updateHint();
    }
  });
  list.addEventListener("mousedown", (e) => {
    const li = e.target.closest("[role=option]");
    if (!li) return;
    e.preventDefault();
    if (+li.dataset.i === OTHER) keepTyped(); else choose(matches[+li.dataset.i]);
  });

  // Changing the level changes which titles fit.
  return { levelChanged: () => { if (document.activeElement === input) update(); else updateHint(); } };
}
