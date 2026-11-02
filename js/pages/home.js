/**
 * Homepage. "Search real outcomes" shows a few top cards from the database
 * (featured_entries: strong, recent, varied stories, never job seekers), open
 * to everyone. The filters above them are only a picture: the full, searchable
 * database is for people who have shared their story.
 * Placeholder cards shimmer until the cards arrive; if they can't load, the
 * saved picture of the database (assets/preview.png) is shown instead.
 */
import { renderLayout } from "../components/layout.js?v=22ec4f9f";
import { entryCard, bindEntryToggles } from "../components/entry-card.js?v=f47178d6";
import { fetchFeatured } from "../services/api.js?v=2cb01d59";
import { keepTimesFresh } from "../lib/time.js?v=7bec7af8";
import { $ } from "../lib/dom.js?v=5a71cd6c";

renderLayout();

/** Cards shown: one full row of 4, plus a faded second row. */
const PREVIEW_COUNT = 6;
/** Cards from this index on are in the faded second row. */
const FADE_FROM = 4;

const grid = $("#previewEntries");
bindEntryToggles(grid);
keepTimesFresh(grid);

// Opening a card in the faded row removes the fade so it can be read in full.
grid.addEventListener("click", () => {
  const openInFadedRow = [...grid.querySelectorAll(".entry")].some((el, i) => i >= FADE_FROM && el.classList.contains("open"));
  grid.classList.toggle("fade", !openInFadedRow && grid.querySelectorAll(".entry").length > FADE_FROM);
});

function showPicture() {
  $("#preview .browser-body").innerHTML = `
    <img class="preview-img" src="assets/preview.png" width="1020" height="442" alt="Preview of the Return on Uni database: filters above graduate cards showing each person's first role, starting salary, current role and current salary.">`;
}

async function load() {
  try {
    const cards = (await fetchFeatured(PREVIEW_COUNT)).slice(0, PREVIEW_COUNT);
    if (!cards.length) return showPicture();
    grid.innerHTML = cards.map((e, i) => entryCard(e, { open: i === 0, id: `p${i}`, showAge: true })).join("");
    grid.classList.toggle("fade", cards.length > FADE_FROM);
    grid.classList.add("appear");
  } catch {
    showPicture();
  }
}

load();
