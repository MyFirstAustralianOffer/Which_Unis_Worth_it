/**
 * Course name box with:
 *   1. type-ahead: a short list of matching courses while typing
 *   2. "Did you mean …?": a one-tap fix for typos, short forms, and
 *      degree words typed into the course box ("Masters of Data Science")
 *
 * Both are suggestions only: people can always keep what they typed.
 * The same cleaning rules run again in the Google script when saving.
 */
import { esc } from "../lib/dom.js";
import { cleanCourse, tidyCourseText } from "../lib/course-clean.js";
import { loadCourseData } from "../services/courses.js";

const MAX_SUGGESTIONS = 6;

/** HTML for the input + list + hint. `id` must be unique on the page. */
export function courseInputHtml({ id, field, value, placeholder }) {
  return `
    <div class="combo" data-course-combo>
      <input class="field" id="${id}" type="text" maxlength="100" autocomplete="off" spellcheck="true"
             role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="${id}-list"
             aria-describedby="${id}-hint" aria-label="Course name"
             placeholder="${esc(placeholder)}" value="${esc(value)}" data-field="${field}">
      <ul class="combo-list" id="${id}-list" role="listbox" hidden></ul>
    </div>
    <p class="course-hint" id="${id}-hint" aria-live="polite" hidden></p>`;
}

/**
 * Wire up the box.
 *   setCourse(name)  saves the course text
 *   getLevel()       the level dropdown's current value
 *   setLevel(level)  picks a level (used when "Masters of…" was typed and no level chosen)
 */
export function bindCourseInput(root, { setCourse, getLevel, setLevel }) {
  const combo = root.querySelector("[data-course-combo]");
  const input = combo.querySelector("input");
  const list = combo.querySelector("[role=listbox]");
  const hint = root.querySelector(".course-hint");

  let data = null;
  let matches = [];
  let active = -1;
  let timer = null;

  loadCourseData().then((d) => { data = d; if (document.activeElement === input) update(); else updateHint(); });

  /* ---------- type-ahead ---------- */
  function rank(q) {
    const all = [...new Set([...data.courses, ...data.seen])];
    const lower = q.toLowerCase();
    const scored = [];
    for (const name of all) {
      const n = name.toLowerCase();
      if (n === lower) continue;
      let score = null;
      if (n.startsWith(lower)) score = 0;
      else if (n.split(/[\s(]+/).some((w) => w.startsWith(lower))) score = 1;
      else if (lower.length >= 3 && n.includes(lower)) score = 2;
      if (score !== null) scored.push([score, name.length, name]);
    }
    // Short forms: "comp sci" → Computer Science
    const alias = data.aliases[lower];
    if (alias) scored.unshift([-1, 0, Array.isArray(alias) ? alias[0] : alias]);
    scored.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2].localeCompare(b[2]));
    return [...new Set(scored.map((s) => s[2]))].slice(0, MAX_SUGGESTIONS);
  }

  function renderList() {
    if (!matches.length) return closeList();
    list.innerHTML = matches.map((m, i) =>
      `<li role="option" id="${input.id}-opt-${i}" data-i="${i}" aria-selected="${i === active}">${esc(m)}</li>`).join("");
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
  function updateHint() {
    const typed = tidyCourseText(input.value);
    if (!data || typed.length < 2) return hideHint();
    const r = cleanCourse(typed, { courses: [...data.courses, ...data.seen], aliases: data.aliases });
    const sameName = r.name.toLowerCase() === typed.toLowerCase();
    const useful = r.how !== "new" && r.how !== "empty" && (!sameName || r.level);
    if (!useful) return hideHint();

    const level = getLevel();
    const showLevel = r.level && !level;
    // Only the degree words were extra ("Master of Data Science" with "Master" chosen) → just tidy the box.
    const label = showLevel ? `${r.level} of ${r.name}` : r.name;
    hint.innerHTML = `Did you mean <button type="button" class="hint-btn">${esc(label)}</button>?`;
    hint.hidden = false;
    hint.querySelector(".hint-btn").addEventListener("click", () => {
      if (showLevel) setLevel(r.level);
      choose(r.name);
    });
  }

  function hideHint() { hint.hidden = true; hint.innerHTML = ""; }

  /* ---------- shared ---------- */
  function choose(name) {
    input.value = name;
    setCourse(name);
    closeList();
    hideHint();
    input.focus();
  }

  function update() {
    if (!data) return;
    const q = input.value.trim();
    matches = q.length >= 2 ? rank(q) : [];
    active = -1;
    renderList();
    clearTimeout(timer);
    timer = setTimeout(updateHint, 250);
  }

  input.addEventListener("input", update);
  input.addEventListener("focus", () => { if (input.value.trim().length >= 2) update(); });
  input.addEventListener("blur", () => setTimeout(() => { closeList(); updateHint(); }, 150));
  input.addEventListener("keydown", (e) => {
    if (list.hidden || !matches.length) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      active = (active + (e.key === "ArrowDown" ? 1 : -1) + matches.length) % matches.length;
      renderList();
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault(); // pick the suggestion instead of submitting the question
      choose(matches[active]);
    } else if (e.key === "Escape") {
      closeList();
    }
  });
  // mousedown fires before the box loses focus
  list.addEventListener("mousedown", (e) => {
    const li = e.target.closest("[role=option]");
    if (li) { e.preventDefault(); choose(matches[+li.dataset.i]); }
  });

  // Picking a level can change the hint ("Masters of…" no longer needs the level part).
  return { refreshHint: () => updateHint() };
}
