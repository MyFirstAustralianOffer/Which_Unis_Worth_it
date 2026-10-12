/**
 * Home page: hero, fastest courses, who it's for, call to action.
 */
import { getVerifiedResults } from "../services/results.js";
import { summariseByCourse } from "../lib/stats.js";
import { resultCard } from "../components/result-card.js";
import { courseCard } from "../components/course-card.js";
import { openAuthModal } from "../components/auth-modal.js";

const TOP_COURSES = 6;

export default {
  title: "",

  render(root) {
    const verified = getVerifiedResults();
    const latest = [...verified].sort((a, b) => a.daysAgo - b.daysAgo).slice(0, 3);
    const fastest = summariseByCourse(verified).slice(0, TOP_COURSES);

    root.innerHTML = `
      ${hero(verified, latest)}
      ${fastestCourses(fastest)}
      ${whoItsFor()}
      ${ctaBand()}`;

    root.querySelectorAll("[data-auth]").forEach((btn) =>
      btn.addEventListener("click", () => openAuthModal({ mode: btn.dataset.auth, role: btn.dataset.role })));
  },
};

function hero(verified, latest) {
  const courses = new Set(verified.map((r) => r.course)).size;
  const unis = new Set(verified.map((r) => r.uni)).size;
  return `
    <section class="hero">
      <div class="wrap hero-grid">
        <div>
          <span class="eyebrow"><span class="dot"></span>Real outcomes from verified grads</span>
          <h1>Find out what your degree <span class="hl">really</span> leads&nbsp;to.</h1>
          <p class="lead">How long grads took to land a job in their field, what they started on, and how they got it. Shared anonymously by people who've been there.</p>
          <div class="hero-ctas">
            <a class="btn btn-dark btn-lg" href="#/database">Explore the database →</a>
            <a class="btn btn-light btn-lg" href="#/share">Share your result</a>
          </div>
          <div class="hero-stats">
            <div><b>${verified.length.toLocaleString()}</b>grad results</div>
            <div><b>${courses}</b>courses</div>
            <div><b>${unis}</b>universities</div>
          </div>
        </div>
        <div class="hero-stack" aria-hidden="true">
          ${latest.map((r) => `<div class="float-card">${resultCard(r, { compact: true })}</div>`).join("")}
        </div>
      </div>
    </section>`;
}

function fastestCourses(summaries) {
  return `
    <section class="block">
      <div class="wrap">
        <div class="sec-head">
          <div>
            <div class="kicker">Time to first job in the field</div>
            <h2>Which courses land jobs fastest?</h2>
            <p>Median months from graduating to a job in the field, across all universities.</p>
          </div>
          <a class="btn btn-light" href="#/database">See all courses →</a>
        </div>
        <div class="course-grid">${summaries.map(courseCard).join("")}</div>
        <p class="note"><span class="sample-badge">⚑ Sample data for this demo</span></p>
      </div>
    </section>`;
}

function whoItsFor() {
  return `
    <section class="block flush-top">
      <div class="wrap">
        <div class="sec-head"><div><div class="kicker">Who it's for</div><h2>Grads share. Students learn.</h2></div></div>
        <div class="who">
          <div class="who-card feat">
            <span class="tag">Graduates</span>
            <h3>Share your result, unlock everything</h3>
            <p>A few quick questions, no name needed. Help the next student choose with real data.</p>
            <a class="btn btn-light" href="#/share">Share your result</a>
          </div>
          <div class="who-card">
            <span class="tag">Current uni students</span>
            <h3>See where your course leads</h3>
            <p>Compare outcomes for your degree across unis, and see how other grads got their first job.</p>
            <button class="btn btn-dark" data-auth="signup" data-role="student">Sign up free</button>
          </div>
          <div class="who-card">
            <span class="tag">Future students</span>
            <h3>Choose with your eyes open</h3>
            <p>Before you pick a uni, see how quickly its grads actually get hired, in plain numbers.</p>
            <button class="btn btn-dark" data-auth="signup" data-role="future">Sign up free</button>
          </div>
        </div>
      </div>
    </section>`;
}

function ctaBand() {
  return `
    <section class="block flush-top">
      <div class="wrap">
        <div class="cta-band">
          <div>
            <h2>Graduated in the last 5 years?</h2>
            <p>Takes 60 seconds. Your result is shown only as part of the group, never with your name or email.</p>
          </div>
          <a class="btn btn-light btn-lg" href="#/share">Share your result →</a>
        </div>
      </div>
    </section>`;
}
