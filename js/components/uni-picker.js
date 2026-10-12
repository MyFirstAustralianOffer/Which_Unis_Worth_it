/**
 * Uni picker: a searchable dropdown of institutions (brief, question 2).
 *
 *   uniPicker("uni")                    → HTML string
 *   bindUniPicker(rootEl, "uni", (value, otherText) => …)
 *
 * Typing filters by full name or short name (UTS, USYD, Macca…).
 * Picking "Other / not listed" reveals a free-text box (university_other).
 */
import { esc } from "../lib/dom.js";
import { UNIVERSITY_LIST, PRIVATE_PROVIDERS, OTHER_INSTITUTION, matchesInstitution } from "../data/taxonomy.js";

export function uniPicker(name, { label = "Where did you study?", placeholder = "Start typing, e.g. UTS, Flinders, Macca" } = {}) {
  return `
    <div class="q field uni-picker" data-picker="${esc(name)}">
      <label for="${esc(name)}-input">${label}</label>
      <div class="combo">
        <input id="${esc(name)}-input" type="text" role="combobox" autocomplete="off"
               aria-expanded="false" aria-controls="${esc(name)}-list" aria-autocomplete="list"
               placeholder="${esc(placeholder)}">
        <ul class="combo-list" id="${esc(name)}-list" role="listbox" hidden></ul>
      </div>
      <div class="combo-other" hidden>
        <label for="${esc(name)}-other">Which institution? <span class="hint">(optional)</span></label>
        <input id="${esc(name)}-other" type="text" maxlength="100" placeholder="Type the name">
      </div>
      <div class="err" data-err="${esc(name)}">Pick your university from the list.</div>
    </div>`;
}

export function bindUniPicker(root, name, onChange) {
  const box = root.querySelector(`[data-picker="${name}"]`);
  const input = box.querySelector("[role=combobox]");
  const list = box.querySelector("[role=listbox]");
  const otherWrap = box.querySelector(".combo-other");
  const otherInput = otherWrap.querySelector("input");

  let matches = [];
  let active = -1;
  let selected = "";

  function build() {
    const q = input.value;
    const unis = UNIVERSITY_LIST.filter((u) => matchesInstitution(u, q));
    const priv = PRIVATE_PROVIDERS.filter((u) => matchesInstitution(u, q));
    matches = [...unis.map((u) => u.name), ...priv.map((u) => u.name), OTHER_INSTITUTION];
    active = matches.length > 1 ? 0 : matches.length - 1;

    const item = (n, i) => `<li role="option" id="${name}-opt-${i}" data-i="${i}" aria-selected="${i === active}">${esc(n)}</li>`;
    let i = 0;
    let html = unis.map((u) => item(u.name, i++)).join("");
    if (priv.length) html += `<li class="combo-group" aria-hidden="true">Private providers</li>` + priv.map((u) => item(u.name, i++)).join("");
    html += `<li class="combo-group" aria-hidden="true"></li>` + item(OTHER_INSTITUTION, i);
    list.innerHTML = html;
    open();
  }

  function open() { list.hidden = false; input.setAttribute("aria-expanded", "true"); highlight(); }
  function close() { list.hidden = true; input.setAttribute("aria-expanded", "false"); }

  function highlight() {
    list.querySelectorAll("[role=option]").forEach((li) => li.setAttribute("aria-selected", String(+li.dataset.i === active)));
    const el = list.querySelector(`[data-i="${active}"]`);
    if (el) { input.setAttribute("aria-activedescendant", el.id); el.scrollIntoView({ block: "nearest" }); }
  }

  function choose(value) {
    selected = value;
    input.value = value;
    otherWrap.hidden = value !== OTHER_INSTITUTION;
    close();
    onChange(value, otherInput.value.trim());
    if (value === OTHER_INSTITUTION) otherInput.focus();
  }

  input.addEventListener("focus", build);
  input.addEventListener("input", () => {
    if (selected) { selected = ""; otherWrap.hidden = true; onChange("", ""); } // editing clears the choice
    build();
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (list.hidden) return build();
      active = (active + (e.key === "ArrowDown" ? 1 : -1) + matches.length) % matches.length;
      highlight();
    } else if (e.key === "Enter" && !list.hidden && matches[active]) {
      e.preventDefault();
      choose(matches[active]);
    } else if (e.key === "Escape") {
      close();
    }
  });
  // mousedown (not click) so it fires before the input loses focus
  list.addEventListener("mousedown", (e) => {
    const li = e.target.closest("[role=option]");
    if (li) { e.preventDefault(); choose(matches[+li.dataset.i]); }
  });
  input.addEventListener("blur", () => setTimeout(() => {
    close();
    if (!selected) input.value = ""; // only accept values picked from the list
  }, 120));
  otherInput.addEventListener("input", () => onChange(selected, otherInput.value.trim()));
}
