/**
 * Hash router: maps "#/database?q=Law" → the database page with params.
 *
 * Hash URLs work on GitHub Pages with no server config, and every page
 * can be linked to directly.
 *
 * Each page module exports: { title: string, render(rootEl, URLSearchParams) }
 */
import { APP_NAME } from "./config.js";

export function createRouter({ outlet, routes, fallback = "home", onNavigate = () => {} }) {
  let current = null;

  function parse() {
    const [path, query = ""] = location.hash.replace(/^#\/?/, "").split("?");
    const name = routes[path] ? path : fallback;
    return { name, params: new URLSearchParams(query) };
  }

  /** Render the current route. `scroll` = jump to top (true on real navigation). */
  function render({ scroll = false } = {}) {
    const { name, params } = parse();
    const page = routes[name];

    // Fresh element per render so old event listeners never pile up.
    const view = document.createElement("div");
    view.className = `view view-${name}`;
    outlet.replaceChildren(view);
    page.render(view, params);

    document.title = page.title ? `${page.title} · ${APP_NAME}` : APP_NAME;
    current = name;
    onNavigate(name);
    if (scroll) window.scrollTo(0, 0);
  }

  return {
    start() {
      window.addEventListener("hashchange", () => render({ scroll: true }));
      render({ scroll: true });
    },
    /** Re-render in place, e.g. after the user logs in. */
    refresh: () => render(),
    get current() { return current; },
  };
}
