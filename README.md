# Return on Uni

Real outcomes from real Australian graduates: where people who studied your degree started, and what they're earning now.

- **Homepage**: mission, a live database preview (working filters + expandable cards), independence, why we exist, ASK
- **Share your story**: one form, three paths (Graduated · Currently studying · Planning to study), one question at a time
- **Database**: searchable graduate cards, unlocked after finishing the form
- **Google Sheets backend**: answers go into a Google Sheet, and the database reads from it

Plain HTML, CSS and JavaScript modules. No build step, no server, no accounts.

## Status

Runs in **demo mode** until Google Sheets is connected: the database shows labelled *Example* cards and answers stay in your browser.
To go live, follow **[docs/google-sheets-setup.md](docs/google-sheets-setup.md)** (about 10 minutes).

## Project structure

```
index.html            Homepage
share.html            "Share your story" form
database.html         Full database
privacy.html          Privacy policy (draft, review before launch)
terms.html            Terms (draft, review before launch)

css/
  base.css            Colours, fonts, buttons, header, footer
  entries.css         Database cards + filters (homepage preview and database page)
  home.css            Homepage sections
  form.css            The share form
  database.css        Database page + locked state
  legal.css           Privacy + terms pages

js/
  config.js           ← Settings: paste the Google Sheets URL here
  lib/dom.js          Small helpers (escaping, money format, safe storage)
  data/
    options.js        Option lists: levels, universities, years, answers
    form-schema.js    Every form question, per path (field names = sheet columns)
    sample-entries.js Example cards for demo mode
  services/
    api.js            The only code that talks to Google Sheets
    access.js         "Database unlocked" flag
  components/
    layout.js         Shared header + footer
    question.js       Renders and validates each type of question
    entry-card.js     Expandable graduate card
    entry-filters.js  Course / University / Graduated / Student type filters (homepage + database)
    icons.js          SVG icons
  pages/
    home.js  share.js  database.js

apps-script/Code.gs   Google Apps Script backend (paste into your sheet)
docs/google-sheets-setup.md
```

### Common changes

| I want to… | Edit |
|---|---|
| Connect Google Sheets | `js/config.js` → `SHEETS_API_URL` |
| Change a question or its wording | `js/data/form-schema.js` |
| Add a university or option | `js/data/options.js` |
| Change colours or fonts | `css/base.css` (`:root`) |
| Change homepage copy | `index.html` |
| Change who appears publicly / privacy threshold | `apps-script/Code.gs` (`SETTINGS`) |
| Add a contact email to the footer | `js/config.js` → `CONTACT_EMAIL` |

**Keep field names stable** once real data is coming in. They're the column headers in the sheet.

## Privacy rules (from the Share Form Spec)

- **Public:** only Graduated answers, as database cards. Email is never shown or sent to the browser.
- **Private:** Currently studying and Planning to study answers are stored in their own tabs and never shown.
- **Small groups stay hidden:** a graduate card only appears once at least 3 grads share the same course + uni (configurable).

## Run it locally

Browsers won't load JavaScript modules from a `file://` path, so serve the folder:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy (GitHub Pages)

Settings → Pages → Source: **Deploy from a branch** → Branch **main**, folder **/ (root)** → Save.
Live at `https://<username>.github.io/<repo-name>/` within a couple of minutes.
