# Return on Uni

Real outcomes from real Australian graduates: where people who studied your degree started, and what they're earning now.

- **Homepage**: mission, a picture of the database, independence, why we exist, ASK
- **Sign in**: Google or an email link. No passwords.
- **Share your story**: one form, three paths (Graduated · Currently studying · Planning to study), one question at a time, with suggestions from a database of 7,959 real Australian university course titles
- **Database**: searchable graduate cards, for signed-in people who have shared their story
- **Backend**: Supabase (accounts + database). Setup: **[docs/supabase-setup.md](docs/supabase-setup.md)**

Plain HTML, CSS and JavaScript modules. No build step, no server to run.

## Project structure

```
index.html            Homepage
share.html            "Share your story" form
signin.html           Sign in (Google or email link); sign-ins come back here
database.html         Full database
privacy.html          Privacy policy
terms.html            Terms

css/
  base.css            Colours, fonts, buttons, header, footer
  entries.css         Database cards + filters (homepage preview and database page)
  home.css            Homepage sections
  form.css            The share form + sign-in box
  database.css        Database page + locked state
  legal.css           Privacy + terms pages

js/
  config.js           ← Settings: Supabase address + publishable key
  lib/dom.js          Small helpers (escaping, money format, safe storage)
  lib/time.js         "Submitted 5 minutes ago"
  lib/course-search.js Searching the course database (type-ahead + "Did you mean…?")
  data/
    options.js        Option lists: levels, universities, years, answers
    form-schema.js    Every form question, per path (field names = database columns)
  services/
    auth.js           Sign-in: Google, email links, sign out, keeping the session fresh
    api.js            The only code that reads/writes data (database functions)
    courses.js        Loads data/courses.json
  components/
    layout.js         Shared header (with Sign in / account menu) + footer
    signin-box.js     "Continue with Google" / "Email me a sign-in link"
    question.js       Renders and validates each type of question
    entry-card.js     Expandable graduate card
    entry-filters.js  Degree type / Course / University / Graduated / Student type filters
    course-input.js   Course box: real course titles as type-ahead + "Did you mean…?"
    icons.js          SVG icons
    storage-notice.js "No cookies, no tracking" notice + ?reset
  pages/
    home.js  share.js  database.js  signin.js

supabase/schema.sql   Database: tables, security rules, functions (paste into Supabase SQL Editor)
apps-script/Code.gs   Old Google Sheets backend (retired; kept for reference)
data/courses.json     7,959 Australian university course titles (from the CRICOS register)
tools/build-courses.mjs  Rebuilds data/courses.json from a CRICOS export
tools/preview-shot.py Re-takes the homepage picture of the database (assets/preview.png)
tools/release.mjs     Version-stamps CSS/JS/data URLs so browsers load changes immediately
docs/supabase-setup.md
```

### Common changes

| I want to… | Edit |
|---|---|
| Change a question or its wording | `js/data/form-schema.js` |
| Add a university or option | `js/data/options.js` |
| Change colours or fonts | `css/base.css` (`:root`) |
| Change homepage copy | `index.html` |
| Hide a card from the database | Supabase → Table editor → `graduates` → untick `show_in_database` |
| Group a misspelled course with the right official title | Supabase → Table editor → `course_names` → fill in `use_instead` |
| Refresh the course database | `node tools/build-courses.mjs <CRICOS export>` (see the file for the format) |
| Add a contact email to the footer | `js/config.js` → `CONTACT_EMAIL` |

**Keep field names stable** once real data is coming in. They're the database columns.

## Privacy rules (from the Share Form Spec)

- **Public (to contributors):** only Graduated answers, as database cards. Email is never shown or sent to the browser.
- **Private:** Currently studying and Planning to study answers are stored in their own tables and never shown.
- **Enforced by the database:** the website can't read any table directly. It can only call the functions in `supabase/schema.sql`, and `public_entries()` refuses anyone who isn't signed in and hasn't contributed.

## Run it locally

Browsers won't load JavaScript modules from a `file://` path, so serve the folder:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Before every commit

```bash
node tools/release.mjs
```

This adds a content fingerprint (`?v=…`) to every CSS, JS and data URL, so visitors' browsers fetch changed files straight away instead of using a cached copy for up to 10 minutes. A normal page reload then always shows the latest version.

**Testing tip:** add `?reset` to any page URL to clear everything the site saved on your device: the unlock, cached data and the notice.

## Deploy (GitHub Pages)

Settings → Pages → Source: **Deploy from a branch** → Branch **main**, folder **/ (root)** → Save.
Live at `https://<username>.github.io/<repo-name>/` within a couple of minutes.
