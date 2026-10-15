/**
 * Database page: filters + expandable graduate cards.
 * Locked (blurred, with a call to action) until the person finishes the form.
 */
import { renderLayout } from "../components/layout.js?v=98893472";
import { entryCard, bindEntryToggles } from "../components/entry-card.js?v=9c7e70b2";
import { setupFilters, filterEntries, readFilters } from "../components/entry-filters.js?v=678b522d";
import { fetchEntries } from "../services/api.js?v=034a0f94";
import { isUnlocked } from "../services/access.js?v=6ff55857";
import { CONFIG } from "../config.js?v=c8c5fba1";
import { $ } from "../lib/dom.js?v=5a71cd6c";

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
