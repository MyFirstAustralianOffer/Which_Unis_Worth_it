/**
 * Database card for one graduate (Form A answers).
 *
 * Closed: course, uni (year) · student type, "first role → role now".
 * Open:   time to first job, first role, starting salary, role now, salary now.
 */
import { timeAgo } from "../lib/time.js?v=7bec7af8";
import { esc, money } from "../lib/dom.js?v=5a71cd6c";
import { shortUni } from "../data/options.js?v=8ca2f27d";
import { icons } from "./icons.js?v=ecd0f942";

/** "Bachelor" + "Nursing" → "Bachelor of Nursing"; "Graduate Certificate in Data Science". */
export function degreeTitle(level, course) {
  // Official titles already say the level ("Master of Data Science").
  if (/^(bachelor|master|graduate (certificate|diploma)|(advanced )?diploma|associate degree|doctor|juris|phd)\b/i.test(String(course).trim())) return course;
  if (!level || level === "Other") return course;
  const joiner = /^(Graduate Certificate|Graduate Diploma|PhD)$/.test(level) ? "in" : "of";
  return `${level} ${joiner} ${course}`;
}

export function entryCard(e, { open = false, id = "", showAge = false } = {}) {
  const ago = showAge ? timeAgo(e.submitted) : "";
  const detailsId = `entry-${id}`;
  const looking = !e.first_role && e.time_to_first_job === "Still looking";
  const rows = looking ? [
    ["Time to first job in field", "Still looking"],
    ["Looking for", e.time_looking || "–"],
  ] : [
    ["Time to first job in field", e.time_to_first_job],
    ["First role after degree", e.first_role || "–"],
    ["Starting salary", e.starting_salary ? money(e.starting_salary) : "–"],
    ["Role now", e.current_role],
    ["Salary now", money(e.current_salary)],
  ];
  return `
    <article class="entry${open ? " open" : ""}">
      ${ago ? `<p class="entry-age" data-submitted="${esc(e.submitted)}">Submitted ${ago}</p>` : ""}
      <div class="entry-head">
        <h3>${esc(degreeTitle(e.study_level, e.course_name))}</h3>
        <button class="entry-toggle" type="button" aria-expanded="${open}" aria-controls="${detailsId}" aria-label="Show full entry">${icons.chevronDown()}</button>
      </div>
      <p class="entry-sub">${esc(e.university === "Other" && e.university_other ? e.university_other : shortUni(e.university))} (${esc(e.graduation_year)}) · ${esc(e.student_type)}${e.example ? `<span class="tag-example">Example</span>` : ""}</p>
      <span class="entry-path">${e.first_role ? `${esc(e.first_role)} → ${esc(e.current_role)}` : `Still looking${e.time_looking ? ` · ${esc(e.time_looking)}` : ""}`}</span>
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
