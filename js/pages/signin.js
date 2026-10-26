/**
 * Sign-in page. Google and email links come back here; once signed in,
 * people go on to the page they came from (?next=share.html etc.).
 */
import { renderLayout } from "../components/layout.js?v=9475431f";
import { signInBox, bindSignInBox } from "../components/signin-box.js?v=9a52838c";
import { initAuth, currentUser, authError, justSignedIn, safeNext } from "../services/auth.js?v=8c753193";
import { setWelcome } from "../components/toast.js?v=8a66a045";
import { $ } from "../lib/dom.js?v=5a71cd6c";

renderLayout();

const next = safeNext(new URLSearchParams(location.search).get("next"));
const card = $("#signinCard");

await initAuth();
if (currentUser() && !authError) {
  if (justSignedIn) setWelcome(justSignedIn); // shown as a message on the next page
  location.replace(next);
} else {
  card.innerHTML = signInBox({
    title: "Sign in to Return on Uni",
    lead: "Use Google, or get a sign-in link by email. Already shared your story? Use the same email.",
    error: authError,
  });
  bindSignInBox(card, { next });
}
