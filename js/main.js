/**
 * Entry point: wires the services, components and pages together.
 */
import { createRouter } from "./router.js";
import { onAuthChange, getUser } from "./services/auth.js";
import { onResultsChange, clearMyResult } from "./services/results.js";
import { initHeader, renderHeader, setActiveNav } from "./components/header.js";
import { initAuthModal } from "./components/auth-modal.js";

import home from "./pages/home.js";
import database from "./pages/database.js";
import share from "./pages/share.js";
import how from "./pages/how.js";
import about from "./pages/about.js";

const router = createRouter({
  outlet: document.getElementById("app"),
  routes: { home, database, share, how, about },
  onNavigate: setActiveNav,
});

initAuthModal();
initHeader();

onAuthChange(() => {
  if (!getUser()) clearMyResult(); // demo: a logged-out visitor has no "my result"
  renderHeader();
  router.refresh();
});
onResultsChange(() => router.refresh());

router.start();
