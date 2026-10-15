/**
 * Database card for one graduate (Form A answers).
 *
 * Closed: course, uni (year) · student type, "first role → role now".
 * Open:   time to first job, first role, starting salary, role now, salary now.
 */
import { esc, money } from "../lib/dom.js";
import { shortUni } from "../data/options.js";
import { icons } from "./icons.js";

/** "Bachelor" + "Nursing" → "Bachelor of Nursing"; "Graduate Certificate in Data Science". */
export function degreeTitle(level, course) {
  // Official titles already say the level ("Master of Data Science").
  if (/^(bachelor|master|graduate (certificate|diploma)|(advanced )?diploma|associate degree|doctor|juris|phd)\b/i.test(String(course).trim())) return course;
  if (!level || level === "Other") return course;
  const joiner = /^(Graduate Certificate|Graduate Diploma|PhD)$/.test(level) ? "in" : "of";
  return `${level} ${joiner} ${course}`;
}

export function entryCard(e, { open = false, id = "" } = {}) {
  const detailsId = `entry-${id}`;
  const rows = [
    ["Time to first job in field", e.time_to_first_job],
    ["First role after degree", e.first_role],
    ["Starting salary", money(e.starting_salary)],
    ["Role now", e.current_role],
    ["Salary now", money(e.current_salary)],
  ];
  return `
    <article class="entry${open ? " open" : ""}">
      <div class="entry-head">
        <h3>${esc(degreeTitle(e.study_level, e.course_name))}</h3>
        <button class="entry-toggle" type="button" aria-expanded="${open}" aria-controls="${detailsId}" aria-label="Show full entry">${icons.chevronDown()}</button>
      </div>
      <p class="entry-sub">${esc(shortUni(e.university))} (${esc(e.graduation_year)}) · ${esc(e.student_type)}${e.example ? `<span class="tag-example">Example</span>` : ""}</p>
      <span class="entry-path">${esc(e.first_role)} → ${esc(e.current_role)}</span>
      <button class="entry-more" type="button" aria-controls="${detailsId}">See full entry ${icons.chevronDown(12)}</button>
      <dl class="entry-details" id="${detailsId}">
        ${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("")}
      </dl>
    </article>`;
}

/** Make cards inside `root` open and close (event delegation, bind once). */
export function bindEntryToggles(root) {
  root.addEventListener("click", (e) => {
    const btn = e.target.closest(".entry-toggle, .entry-more");
    if (!btn) return;
    const card = btn.closest(".entry");
    const open = card.classList.toggle("open");
    card.querySelector(".entry-toggle").setAttribute("aria-expanded", String(open));
  });
}
