/**
 * About page.
 */
export default {
  title: "About",

  render(root) {
    root.innerHTML = `
      <section class="block about">
        <div class="wrap">
          <div class="kicker">About</div>
          <h2>Every student deserves to know what a degree really leads to.</h2>
          <p>Choosing a uni is one of the biggest financial decisions most people make, yet the information available is mostly marketing. Which Uni's Worth It? collects outcomes straight from graduates: how long it took them to find work in their field, roughly what they started on, and what actually got them hired.</p>
          <p>We're independent and not affiliated with any university. Results are shown only in groups, and salaries only as bands, so no one can be identified.</p>
          <p style="margin-top:28px"><span class="sample-badge">⚑ This is an early demo. All figures shown are sample data.</span></p>
        </div>
      </section>`;
  },
};
