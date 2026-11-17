/**
 * My account: who you are, how you sign in, and the story you shared,
 * with "Update my story" (opens the form filled in with your answers).
 */
import { renderLayout } from "../components/layout.js?v=e611bad7";
import { signInBox, bindSignInBox } from "../components/signin-box.js?v=bc107f7e";
import { setWelcome } from "../components/toast.js?v=8a66a045";
import { initAuth, currentUser, authError, signOut } from "../services/auth.js?v=8ebe4f88";
import { myProfile, myStory, updateMyName } from "../services/api.js?v=61030f35";
import { PATHS } from "../data/form-schema.js?v=27cd5bf1";
import { shortUni } from "../data/options.js?v=f7ec7ab0";
import { $, esc, money } from "../lib/dom.js?v=5a71cd6c";

renderLayout();

const area = $("#accountArea");

/** What each path's summary shows: [label, (answers) => text]. */
const uni = (a) => a.university === "Other" && a.university_other ? a.university_other : shortUni(a.university || "–");
const SUMMARY = {
  graduated: [
    ["Course", (a) => a.course_name],
    ["University", uni],
    ["Graduated", (a) => a.graduation_year],
    ["Student type", (a) => a.student_type],
    ["Time to first job in your field", (a) => a.time_to_first_job],
    ["Looking for", (a) => a.time_looking],
    ["First role", (a) => a.first_role],
    ["Starting salary", (a) => a.starting_salary && money(a.starting_salary)],
    ["Role now", (a) => a.current_role],
    ["Salary now", (a) => a.current_salary && money(a.current_salary)],
  ],
  studying: [
    ["Course", (a) => a.course_name],
    ["University", uni],
    ["Expected to graduate", (a) => a.expected_graduation_year],
    ["Student type", (a) => a.student_type],
    ["Working in your field?", (a) => a.job_in_field],
    ["Role now", (a) => a.current_role],
    ["Hoping to become", (a) => a.hoped_role],
    ["Expected salary", (a) => a.expected_salary && money(a.expected_salary)],
  ],
  planning: [
    ["Course", (a) => a.course_name],
    ["Universities", (a) => [a.university_choice_1, a.university_choice_2, a.university_choice_3]
      .filter(Boolean).map((u) => (u === "Other" && a.university_other ? a.university_other : shortUni(u))).join(", ")],
    ["Planning to start", (a) => a.planned_start_year],
    ["Student type", (a) => a.student_type],
    ["Hoping to become", (a) => a.hoped_role],
    ["Expected salary", (a) => a.expected_salary && money(a.expected_salary)],
  ],
};

const date = (iso) => iso ? new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" }) : "";
const rows = (pairs) => `<dl class="acct-rows">${pairs.filter(([, v]) => v).map(([k, v]) =>
  `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>`;

function storyCard(path, a) {
  const title = { graduated: "Your story", studying: "Your story (studying)", planning: "Your story (planning to study)" }[path];
  const when = a.updated_at ? `Updated ${date(a.updated_at)}` : `Shared ${date(a.submitted_at)}`;
  return `
    <section class="acct-card">
      <div class="acct-story-head"><h2>${title}</h2><span class="acct-meta">${esc(PATHS[path].label)} · ${when}</span></div>
      ${rows(SUMMARY[path].map(([label, get]) => [label, get(a)]))}
      <div class="acct-actions">
        <a class="btn btn-primary" href="share.html?edit=${path}">Update my story</a>
      </div>
      <p class="acct-meta" style="margin-top:12px">New job or pay rise? Spotted a mistake? Update it any time. Your card stays anonymous.</p>
    </section>`;
}

async function start() {
  await initAuth();
  const user = currentUser();
  if (!user) {
    area.innerHTML = `<section class="acct-card">${signInBox({ title: "Sign in to see your account", error: authError })}</section>`;
    bindSignInBox(area, { next: "account.html" });
    return;
  }

  const [profile, story] = await Promise.all([myProfile(), myStory().catch(() => ({}))]);
  const name = profile.name || user.name || "";
  const method = user.providers.includes("google") ? "Google" : "Email sign-in link";
  const initial = (name || user.email).trim()[0]?.toUpperCase() || "?";
  const paths = ["graduated", "studying", "planning"].filter((p) => story[p]);

  area.innerHTML = `
    <section class="acct-card">
      <div class="acct-head">
        <div class="acct-avatar">${user.avatar ? `<img src="${esc(user.avatar)}" alt="" referrerpolicy="no-referrer">` : esc(initial)}</div>
        <div><p class="acct-name">${esc(name || "Your account")}</p><p class="acct-email">${esc(user.email)}</p></div>
      </div>
      <dl class="acct-rows">
        <div><dt>Name</dt><dd>
          <form class="acct-name-form" id="nameForm">
            <input class="field" id="nameInput" type="text" maxlength="80" autocomplete="name" value="${esc(name)}" placeholder="Your name" aria-label="Your name">
            <button class="btn btn-outline" type="submit">Save</button>
          </form>
          <p class="acct-msg" id="nameMsg" role="status"></p>
        </dd></div>
        <div><dt>Email</dt><dd>${esc(user.email)}</dd></div>
        <div><dt>Signed in with</dt><dd>${method}</dd></div>
        ${profile.joined ? `<div><dt>Member since</dt><dd>${date(profile.joined)}</dd></div>` : ""}
      </dl>
      <p class="acct-meta" style="margin-top:14px">Your name and email are never shown on the site. Database cards are anonymous.</p>
    </section>
    ${paths.length ? paths.map((p) => storyCard(p, story[p])).join("") : `
      <section class="acct-card">
        <h2>Your story</h2>
        <p>You haven't shared your story yet. It takes about two minutes, and it unlocks the full database.</p>
        <div class="acct-actions"><a class="btn btn-primary" href="share.html">Share your story</a></div>
      </section>`}
    <div class="acct-actions">
      ${paths.length ? `<a class="btn btn-outline" href="database.html">Explore the database</a>` : ""}
      <button class="btn btn-outline" type="button" id="signOutBtn">Sign out</button>
    </div>`;

  $("#nameForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = $("#nameMsg");
    msg.className = "acct-msg";
    try {
      await updateMyName($("#nameInput").value);
      msg.textContent = "Saved.";
    } catch (err) {
      msg.className = "acct-msg error";
      msg.textContent = err.message;
    }
  });
  $("#signOutBtn").addEventListener("click", async () => {
    await signOut();
    setWelcome("signedout");
    location.href = "index.html";
  });
}

start();
