/**
 * Renders, binds and validates one form question (see js/data/form-schema.js).
 *
 *   renderQuestion(q, answers) → HTML for the input area
 *   bindQuestion(root, q, answers, onChange) → keeps `answers` up to date
 *   validateQuestion(q, answers) → "" or the error message to show
 */
import { esc, options, digitsOnly } from "../lib/dom.js";
import { LEVELS } from "../data/options.js";
import { ERRORS } from "../data/form-schema.js";
import { icons } from "./icons.js";
import { courseInputHtml, bindCourseInput } from "./course-input.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const filled = (v) => v !== undefined && v !== null && String(v).trim() !== "";
const fmtThousands = (digits) => (digits ? Number(digits).toLocaleString("en-AU") : "");

/** Field names a question writes to (used to clear old answers when switching paths). */
export const fieldsOf = (q) => q.fields || (q.type === "course" ? [q.levelField, q.courseField] : [q.field]);

export function renderQuestion(q, a) {
  switch (q.type) {
    case "email":
      return `
        <input class="field" id="q-input" type="email" inputmode="email" autocomplete="email"
               placeholder="${esc(q.placeholder)}" value="${esc(a[q.field])}" data-field="${q.field}">
        <p class="helper">${icons.lock()}${esc(q.helper)}</p>`;

    case "choice":
      return `<div class="opts" role="group" aria-label="${esc(q.title)}">${q.options.map((o) => {
        const { value, label } = typeof o === "string" ? { value: o, label: o } : o;
        return `<button type="button" class="opt" data-field="${q.field}" data-value="${esc(value)}" aria-pressed="${a[q.field] === value}">${esc(label)}</button>`;
      }).join("")}</div>`;

    case "course":
      return `
        <div class="stack">
          <select class="field" id="q-input" data-field="${q.levelField}" aria-label="Level of study">
            <option value="">Choose level</option>${options(LEVELS, a[q.levelField])}
          </select>
          ${courseInputHtml({ id: "q-course", field: q.courseField, value: a[q.courseField] || "", placeholder: q.placeholder })}
        </div>`;

    case "select":
      return `
        <select class="field" id="q-input" data-field="${q.field}" aria-label="${esc(q.title)}">
          <option value="">${esc(q.placeholder || "Choose one")}</option>${options(q.options, a[q.field])}
        </select>`;

    case "text":
      return `<input class="field" id="q-input" type="text" maxlength="100" autocomplete="off"
                     placeholder="${esc(q.placeholder)}" value="${esc(a[q.field])}" data-field="${q.field}" aria-label="${esc(q.title)}">`;

    case "money":
      return `
        <div class="money">
          <span aria-hidden="true">$</span>
          <input class="field" id="q-input" type="text" inputmode="numeric" autocomplete="off" maxlength="11"
                 placeholder="${esc(q.placeholder)}" value="${fmtThousands(a[q.field])}" data-field="${q.field}" data-money aria-label="${esc(q.title)} in Australian dollars">
        </div>
        <p class="helper" style="margin-top:8px">${esc(q.helper)}</p>`;

    case "unis3":
      return `<div class="stack">${q.fields.map((f, i) => `
        <div>
          <label class="choice-label" for="${i === 0 ? "q-input" : `q-${f}`}">${["1st", "2nd", "3rd"][i]} choice ${i === 0 ? "" : "<small>(optional)</small>"}</label>
          <select class="field" id="${i === 0 ? "q-input" : `q-${f}`}" data-field="${f}">
            <option value="">${i === 0 ? "Choose your university" : "Optional"}</option>${options(q.options, a[f])}
          </select>
        </div>`).join("")}</div>`;

    default:
      return "";
  }
}

export function bindQuestion(root, q, a, onChange) {
  if (q.type === "course") bindCourse(root, q, a, onChange);
  root.querySelectorAll("[data-field]").forEach((el) => {
    if (el.classList.contains("opt")) {
      el.addEventListener("click", () => {
        a[el.dataset.field] = el.dataset.value;
        root.querySelectorAll(`.opt[data-field="${el.dataset.field}"]`).forEach((b) => b.setAttribute("aria-pressed", String(b === el)));
        onChange();
      });
      return;
    }
    const update = () => {
      if (el.hasAttribute("data-money")) {
        const digits = digitsOnly(el.value).replace(/^0+/, "").slice(0, 9);
        el.value = fmtThousands(digits);
        a[el.dataset.field] = digits ? Number(digits) : "";
      } else {
        a[el.dataset.field] = el.value;
      }
      el.classList.remove("invalid");
      onChange();
    };
    el.addEventListener("input", update);
    el.addEventListener("change", update);
  });
}

export function validateQuestion(q, a) {
  switch (q.type) {
    case "email":
      return EMAIL_RE.test(String(a[q.field] || "").trim()) ? "" : ERRORS.email;
    case "course":
      return filled(a[q.levelField]) && String(a[q.courseField] || "").trim().length >= 2 ? "" : ERRORS.course;
    case "unis3":
      return filled(a[q.fields[0]]) ? "" : ERRORS.generic;
    case "money":
      return Number(a[q.field]) > 0 ? "" : ERRORS.generic;
    default:
      return filled(a[q.field]) ? "" : ERRORS.generic;
  }
}

/** Course question: type-ahead + "Did you mean…?" on top of the normal inputs. */
function bindCourse(root, q, a, onChange) {
  const levelSel = root.querySelector(`[data-field="${q.levelField}"]`);
  const course = bindCourseInput(root, {
    setCourse: (name) => { a[q.courseField] = name; onChange(); },
    getLevel: () => levelSel.value,
    setLevel: (level) => { levelSel.value = level; a[q.levelField] = level; onChange(); },
  });
  levelSel.addEventListener("change", () => course.refreshHint());
}
