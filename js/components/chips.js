/**
 * Chip group: a row of pill buttons where you pick one answer.
 *
 *   chipGroup("months", [[0, "Before graduating"], [2, "Under 3 months"]], current)
 *   bindChips(formEl, (name, value) => answers[name] = value)
 *
 * Options can be [value, label] pairs or plain strings.
 */
import { esc, delegate } from "../lib/dom.js";

export function chipGroup(name, opts, selected) {
  const chips = opts.map((o) => {
    const [value, label] = Array.isArray(o) ? o : [o, o];
    const pressed = String(value) === String(selected);
    return `<button type="button" class="chip" data-val="${esc(value)}" aria-pressed="${pressed}">${esc(label)}</button>`;
  });
  return `<div class="chips" data-name="${esc(name)}" role="group">${chips.join("")}</div>`;
}

export function bindChips(root, onChange) {
  delegate(root, "click", ".chip", (e, chip) => {
    const group = chip.closest(".chips");
    group.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
    const raw = chip.dataset.val;
    const value = raw !== "" && !isNaN(raw) ? Number(raw) : raw;
    onChange(group.dataset.name, value);
  });
}
