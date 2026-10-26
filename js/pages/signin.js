/**
 * Sign-in page. Google and email links come back here; once signed in,
 * people go on to the page they came from (?next=share.html etc.).
 */
import { renderLayout } from "../components/layout.js?v=b6b22fdc";
import { signInBox, bindSignInBox } from "../components/signin-box.js?v=a435149c";
import { initAuth, currentUser, authError, safeNext } from "../services/auth.js?v=88211d4e";
import { $ } from "../lib/dom.js?v=5a71cd6c";

renderLayout();

const next = safeNext(new URLSearchParams(location.search).get("next"));
const card = $("#signinCard");

await initAuth();
if (currentUser() && !authError) {
  location.replace(next);
} else {
  card.innerHTML = signInBox({
    title: "Sign in to Return on Uni",
    lead: "Use Google, or get a sign-in link by email. Already shared your story? Use the same email.",
    error: authError,
  });
  bindSignInBox(card, { next });
}
