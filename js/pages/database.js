/**
 * Database page: filters + expandable graduate cards, loaded from the
 * database 24 at a time. Only people who are signed in and have shared their
 * story can see it; the database itself enforces this (see public_entries in
 * supabase/schema.sql), the page just explains what to do.
 */
import { renderLayout } from "../components/layout.js?v=019eb342";
import { entryCard, bindEntryToggles } from "../components/entry-card.js?v=f47178d6";
import { setupFilters, readFilters } from "../components/entry-filters.js?v=5d23b99f";
import { signInBox, bindSignInBox } from "../components/signin-box.js?v=9f5d0c46";
import { fetchEntries, fetchFilterOptions, myProfile } from "../services/api.js?v=38036227";
import { initAuth, currentUser, authError } from "../services/auth.js?v=6428cedd";
import { keepTimesFresh } from "../lib/time.js?v=7bec7af8";
import { CONFIG } from "../config.js?v=b884ae18";
import { $ } from "../lib/dom.js?v=5a71cd6c";

renderLayout();

const grid = $("#entries");
const status = $("#status");
const form = $("#filters");
const more = $("#more");
let filters = {};
let loaded = 0;
let total = 0;

bindEntryToggles(grid);
keepTimesFresh(grid);

/** Blurred placeholder cards behind the lock (no real data is loaded). */
function lock(html) {
  $("#dbArea").classList.add("locked");
  form.querySelectorAll("select, button").forEach((el) => { el.disabled = true; });
  grid.innerHTML = Array.from({ length: 8 }, () => `<article class="entry entry-ghost" aria-hidden="true"><i></i><i></i><i></i></article>`).join("");
  $("#lockBox").innerHTML = html;
  status.textContent = "";
}

async function loadPage({ append = false } = {}) {
  const btn = $("#moreBtn");
  if (btn) { btn.disabled = true; btn.textContent = "Loading…"; }
  if (!append) { status.textContent = "Loading…"; loaded = 0; }
  try {
    const page = await fetchEntries(filters, loaded);
    total = page.total;
    const html = page.entries.map((e, i) => entryCard(e, { id: `d${loaded + i}`, showAge: true })).join("");
    if (append) grid.insertAdjacentHTML("beforeend", html);
    else grid.innerHTML = html || `<p class="entries-empty">No graduates match yet. Try a broader search, or <a class="text-link" href="share.html">share your own story</a>.</p>`;
    loaded += page.entries.length;
    status.textContent = `${total.toLocaleString()} ${total === 1 ? "graduate" : "graduates"} found`;
    more.innerHTML = loaded < total ? `<button class="btn btn-outline" type="button" id="moreBtn">Show more</button>` : "";
    $("#moreBtn")?.addEventListener("click", () => loadPage({ append: true }));
  } catch (err) {
    status.textContent = "";
    if (!append) grid.innerHTML = `<p class="entries-empty">${err.message}</p>`;
    if (btn) { btn.disabled = false; btn.textContent = "Show more"; }
  }
}

async function start() {
  status.textContent = "Loading…";
  await initAuth();
  if (!currentUser()) {
    lock(signInBox({
      title: "Sign in to explore the database",
      lead: "Already shared your story? Sign in with the same email to see every entry.",
      error: authError,
    }));
    bindSignInBox($("#lockBox"), { next: "database.html" });
    return;
  }
  const profile = await myProfile();
  if (!profile.contributed) {
    lock(`
      <h2>Share your story to unlock the database</h2>
      <p>It takes about two minutes. Every answer makes the picture clearer for the next student.</p>
      <a class="btn btn-primary" href="share.html">Join the movement</a>`);
    return;
  }
  try {
    setupFilters(form, await fetchFilterOptions(), (values) => { filters = values; loadPage(); });
  } catch { /* filters stay at "All"; the cards can still load */ }
  filters = readFilters(form);
  await loadPage();
}

start();
