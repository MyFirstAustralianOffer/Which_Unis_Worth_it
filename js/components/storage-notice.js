/**
 * Storage notice + reset.
 *
 * The site uses no cookies and no tracking. It keeps a few small things in the
 * browser's local storage (all keys start with "rou_"):
 *   rou_session           keeps them signed in (sign-in tokens, never a password)
 *   rou_notice_ok         they've seen this notice
 *
 * showStorageNotice()  shows a small notice once per browser
 * resetSiteData()      clears all of the above (signs out on this device) and reloads
 *                      (visit any page with ?reset)
 */
const PREFIX = "rou_";
const SEEN_KEY = "rou_notice_ok";

function keys(storage) {
  try {
    return Object.keys(storage).filter((k) => k.startsWith(PREFIX));
  } catch {
    return [];
  }
}

export function resetSiteData() {
  for (const s of [localStorage, sessionStorage]) {
    try { keys(s).forEach((k) => s.removeItem(k)); } catch { /* storage blocked */ }
  }
  location.reload();
}

export function showStorageNotice() {
  try { if (localStorage.getItem(SEEN_KEY)) return; } catch { return; } // storage blocked: nothing is saved anyway

  const box = document.createElement("div");
  box.className = "storage-notice";
  box.setAttribute("role", "region");
  box.setAttribute("aria-label", "How this site uses your device");
  box.innerHTML = `
    <p><b>No cookies, no tracking.</b> We only save what keeps you signed in on this device. <a href="privacy.html#device">More</a></p>
    <button type="button" class="btn btn-primary btn-sm">OK</button>`;
  box.querySelector("button").addEventListener("click", () => {
    try { localStorage.setItem(SEEN_KEY, "1"); } catch { /* ignore */ }
    box.remove();
  });
  document.body.appendChild(box);
}
