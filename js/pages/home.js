/**
 * Homepage. The "Search real outcomes" preview is a working mini-database:
 * the filters search the real entries (from Google Sheets once connected)
 * and the cards open and close in place.
 */
import { renderLayout } from "../components/layout.js?v=98893472";
import { entryCard, bindEntryToggles } from "../components/entry-card.js?v=9c7e70b2";
import { setupFilters, filterEntries, readFilters } from "../components/entry-filters.js?v=678b522d";
import { fetchEntries } from "../services/api.js?v=034a0f94";
import { isUnlocked } from "../services/access.js?v=6ff55857";
import { $ } from "../lib/dom.js?v=5a71cd6c";

renderLayout();

/** Cards shown in the preview: one full row of 4, plus a faded second row. */
const PREVIEW_COUNT = 6;
/** Cards from this index on are in the faded second row. */
const FADE_FROM = 4;

const grid = $("#previewEntries");
const form = $("#previewFilters");
const status = $("#previewStatus");
let all = [];

bindEntryToggles(grid);
// The bottom row is faded, as in the design. Opening one of those cards
// removes the fade so it can be read in full.
grid.addEventListener("click", () => {
  const openInFadedRow = [...grid.querySelectorAll(".entry")].some((el, i) => i >= FADE_FROM && el.classList.contains("open"));
  grid.classList.toggle("fade", !openInFadedRow && grid.querySelectorAll(".entry").length > FADE_FROM);
});

function render(values) {
  const list = filterEntries(all, values);
  if (!list.length) {
    grid.classList.remove("fade");
    grid.innerHTML = all.length
      ? `<p class="entries-empty">No grads match those filters yet. Try “All universities” or “Any year”.</p>`
      : `<p class="entries-empty">Be one of the first grads to share. Results appear here as people answer.</p>`;
    status.textContent = "";
    return;
  }
  const shown = list.slice(0, PREVIEW_COUNT);
  grid.innerHTML = shown.map((e, i) => entryCard(e, { open: i === 0, id: `p${i}` })).join("");
  grid.classList.toggle("fade", shown.length > FADE_FROM);
  status.textContent = list.length > PREVIEW_COUNT
    ? `Showing ${PREVIEW_COUNT} of ${list.length.toLocaleString()} grads.`
    : `${list.length} ${list.length === 1 ? "grad" : "grads"} found.`;
}

async function load() {
  try {
    ({ entries: all } = await fetchEntries());
    setupFilters(form, all, render);
    render(readFilters(form));
  } catch {
    grid.innerHTML = `<p class="entries-empty">The database is taking a moment to load. Try refreshing the page.</p>`;
  }
}

// "Explore the database" goes to the full database once unlocked, otherwise to the form.
$("#exploreBtn").href = isUnlocked() ? "database.html" : "share.html";

load();
