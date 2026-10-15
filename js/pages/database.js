/**
 * Database page: filters + expandable graduate cards.
 * Locked (blurred, with a call to action) until the person finishes the form.
 */
import { renderLayout } from "../components/layout.js";
import { entryCard, bindEntryToggles } from "../components/entry-card.js";
import { setupFilters, filterEntries, readFilters } from "../components/entry-filters.js";
import { fetchEntries } from "../services/api.js";
import { isUnlocked } from "../services/access.js";
import { CONFIG } from "../config.js";
import { $ } from "../lib/dom.js";

renderLayout();

const grid = $("#entries");
const status = $("#status");
const form = $("#filters");
let all = [];
let shown = CONFIG.PAGE_SIZE;

bindEntryToggles(grid);

function render(values, { resetPaging = true } = {}) {
  if (resetPaging) shown = CONFIG.PAGE_SIZE;
  const list = filterEntries(all, values);

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
  $("#moreBtn")?.addEventListener("click", () => { shown += CONFIG.PAGE_SIZE; render(readFilters(form), { resetPaging: false }); });
}

async function load() {
  status.textContent = "Loading…";
  try {
    ({ entries: all } = await fetchEntries());
    setupFilters(form, all, render);
    render(readFilters(form));
  } catch {
    status.textContent = "";
    grid.innerHTML = `<p class="entries-empty">We couldn't load the database right now. Please refresh the page.</p>`;
  }
}

load();
