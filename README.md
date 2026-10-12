# Which Uni's Worth It?

Real outcomes from real grads: how long it took to land a job in the field, what they started on, and how they got it.

**Status:** front-end MVP. Sign-up is a mock (nothing is stored or sent) and all figures are sample data for fictional universities.

## What's in it
- **Home**: hero, fastest-to-a-job courses, who it's for
- **Database**: search and filter by course, uni, field, year and student type; verified-only toggle; summary stats; sort. Logged-out visitors see 3 results, then a sign-up prompt.
- **Share your result**: grads answer six quick questions and instantly see how they compare.
- **Mock sign-up / log in**: choose Graduate, Current student or Future student. Kept only for the browser tab.

Everything lives in one file, `index.html`. No build step.

## Run it locally
Open `index.html` in a browser.

## Host on GitHub Pages
1. Create a new public repository on GitHub, e.g. `which-uni`.
2. Upload `index.html` and `README.md` (Add file → Upload files → Commit).
3. Go to **Settings → Pages**. Under "Build and deployment", set Source to **Deploy from a branch**, branch **main**, folder **/ (root)**, then Save.
4. After a minute your site is live at `https://<your-username>.github.io/which-uni/`.

## Next steps
- Real accounts + 6-digit email codes with Supabase Auth
- Store results in Supabase (Postgres) with row-level security
- Enforce the minimum group size in the database, not just the page
