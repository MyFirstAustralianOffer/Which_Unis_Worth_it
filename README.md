# Which Uni's Worth It?

Real outcomes from real grads: how long it took to land a job in the field, what they started on, and how they got it.

**Status:** front-end MVP. Sign-up is a mock (nothing is stored or sent). The institution list is the real one from the MVP Product Brief, but **every result is made up**; a banner on every page and a "Demo data" label on every card say so. Replace with real submissions before promoting the site.

## Features
- **Home**: hero, fastest-to-a-job courses, who it's for
- **Database**: search and filter by course, uni, field, year and student type; verified-only toggle; summary stats; sorting; "load more". Logged-out visitors see 3 results, then a sign-up prompt.
- **Share your result**: grads answer six quick questions and instantly see how they compare.
- **Mock sign-up / log in**: Graduate, Current student or Future student. Kept only for the browser tab.
- **Privacy rules built in**: salaries shown only as bands; summaries hidden for groups smaller than 3.

## Project structure

```
index.html              Page shell: header, nav, <main id="app">, footer
assets/favicon.svg
css/
  base.css              Design tokens (colours, fonts), reset, buttons
  layout.css            Header, mobile nav, user menu, footer
  components.css        Cards, pills, chips, form fields, stats, modal, toast
  pages.css             Page-specific layouts + responsive rules
js/
  main.js               Entry point: wires everything together
  router.js             Hash router (#/database?q=Law → database page)
  config.js             App settings: privacy threshold, page size, roles
  lib/                  Pure helpers with no side effects
    dom.js              $, esc (HTML escaping), options, delegate
    format.js           Salary bands, "4 months", speed colours, "3 days ago"
    stats.js            median, summarise, summariseByCourse
    validate.js         Email + password rules
  data/
    taxonomy.js         Institutions (with short names like UTS, Macca), courses, answer options
    sample-data.js      Seeded fake results for the demo
  services/             The only code that touches data or accounts
    auth.js             Mock sign-up / log-in / log-out
    results.js          Query + add results
  components/           Reusable UI pieces
    header.js           Log in / Sign up buttons, user menu, active nav
    auth-modal.js       Sign-up / log-in pop-up
    result-card.js      One grad's outcome
    course-card.js      Median outcome for a course
    chips.js            Pick-one pill buttons
    uni-picker.js       Searchable institution dropdown (+ "Other / not listed" text box)
    toast.js            Pop-up confirmation message
  pages/                One file per page; each exports { title, render(root, params) }
    home.js  database.js  share.js  how.js  about.js
```

**How the pieces talk:** pages read data only through `services/`. Services notify listeners when something changes (`onAuthChange`, `onResultsChange`), and `main.js` re-renders the header and current page.

### Common changes
| I want to… | Edit |
|---|---|
| Change colours or fonts | `css/base.css` (`:root` tokens) |
| Add a university, short name or course | `js/data/taxonomy.js` |
| Remove the demo banner (once data is real) | `index.html` (`.demo-banner`) and the `Demo data` pill in `js/components/result-card.js` |
| Change the privacy threshold or page size | `js/config.js` |
| Add a new page | Create `js/pages/new.js`, register it in `js/main.js`, add a nav link in `index.html` |
| Connect a real backend | Replace the function bodies in `js/services/` (see below) |

## Run it locally
The JavaScript uses ES modules, which browsers won't load from a `file://` path, so serve the folder:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Or use the VS Code "Live Server" extension.

## Deploy on GitHub Pages
Settings → Pages → Build and deployment → Source: **Deploy from a branch**, Branch: **main**, folder **/ (root)** → Save.
The site goes live at `https://<username>.github.io/<repo-name>/` within a minute or two. No build step needed.

## Next steps: going live
1. **Supabase project**: create one and run the schema (results table + row-level security + aggregate view).
2. **Real auth**: swap `js/services/auth.js` for Supabase Auth with 6-digit email codes (OTP). The comments in that file show the matching calls.
3. **Real data**: swap `js/services/results.js` to read/write Supabase; delete `js/data/sample-data.js`.
4. **Enforce privacy in the database**: the minimum group size must be applied server-side, not just in the page.
