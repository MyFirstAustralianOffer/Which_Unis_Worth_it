/**
 * Homepage: header/footer, and the database preview cards.
 * The whole preview links to the form (or the database once unlocked).
 */
import { renderLayout } from "../components/layout.js";
import { entryCard } from "../components/entry-card.js";
import { fetchEntries } from "../services/api.js";
import { isUnlocked } from "../services/access.js";
import { $ } from "../lib/dom.js";

renderLayout();

const PREVIEW_COUNT = 6;
const target = () => (isUnlocked() ? "database.html" : "share.html");

async function renderPreview() {
  const grid = $("#previewEntries");
  try {
    const { entries } = await fetchEntries();
    if (!entries.length) {
      grid.innerHTML = `<p class="entries-empty">Be one of the first grads to share. Results appear here as people answer.</p>`;
      grid.classList.remove("fade");
      return;
    }
    grid.innerHTML = entries.slice(0, PREVIEW_COUNT).map((e, i) => entryCard(e, { open: i === 0, id: `p${i}` })).join("");
  } catch {
    grid.innerHTML = `<p class="entries-empty">The database is taking a moment to load. Try refreshing the page.</p>`;
  }
}

// Clicking anywhere on the preview goes to the form (or the database once unlocked).
const preview = $("#preview");
preview.addEventListener("click", () => { location.href = target(); });
preview.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); location.href = target(); }
});
$("#exploreBtn").href = target();

renderPreview();
