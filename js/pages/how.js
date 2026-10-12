/**
 * How it works page.
 */
export default {
  title: "How it works",

  render(root) {
    root.innerHTML = `
      <section class="block">
        <div class="wrap">
          <div class="sec-head">
            <div>
              <div class="kicker">How it works</div>
              <h2>Real numbers, from real grads.</h2>
              <p>No marketing brochures, no cherry-picked case studies. Just what happened after graduation.</p>
            </div>
          </div>
          <div class="steps">
            <div class="step"><h3>Sign up free</h3><p>Tell us if you're a graduate, a current student or still choosing. It takes seconds.</p></div>
            <div class="step"><h3>Grads share their result</h3><p>Course, uni, year, how long it took to land a job in the field, and how they got it.</p></div>
            <div class="step"><h3>Everyone gets clarity</h3><p>Search by course and uni to see typical time to a job and starting salary bands.</p></div>
          </div>
          <div class="cta-band" style="margin-top:40px">
            <div><h2>Ready to look?</h2><p>Browse outcomes by course and university.</p></div>
            <a class="btn btn-light btn-lg" href="#/database">Explore the database →</a>
          </div>
        </div>
      </section>`;
  },
};
