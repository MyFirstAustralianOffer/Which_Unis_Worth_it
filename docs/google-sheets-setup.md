# Connect the website to Google Sheets

Takes about 10 minutes. You need a Google account. No coding beyond copy and paste.

When it's done:

- every form answer becomes a new row in your sheet, in one of three tabs: **Graduates**, **Current students** or **Future students**
- the database page reads graduate cards back from the sheet, **without emails**, and only for course + uni groups with at least 3 graduates

## 1. Create the sheet

1. Go to [sheets.new](https://sheets.new) and name it something like **Return on Uni – Responses**.
2. You don't need to add any columns or tabs. The script creates them.

## 2. Add the script

1. In the sheet, open **Extensions → Apps Script**.
2. Delete everything in the `Code.gs` editor.
3. Open [`apps-script/Code.gs`](../apps-script/Code.gs) from this repository, copy **all** of it, and paste it in.
4. Click **Save** (the disk icon).
5. Optional: in the function dropdown at the top choose **setup**, then click **Run**. This creates the three tabs with headers straight away. Google will ask you to authorise the script the first time (see the note below).

## 3. Deploy it as a web app

1. Click **Deploy → New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Fill in:
   - **Description:** Return on Uni API
   - **Execute as:** Me
   - **Who has access:** Anyone
4. Click **Deploy**, then **Authorise access** and pick your Google account.
   - You'll see "Google hasn't verified this app". That's normal for your own scripts. Click **Advanced → Go to (project name) (unsafe)** and **Allow**.
5. Copy the **Web app URL**. It looks like `https://script.google.com/macros/s/AKfy…/exec`.

> "Anyone" means the website can send answers and read the **public** list. It does **not** give anyone access to your sheet: emails and private answers never leave Google.

## 4. Point the website at it

1. Open [`js/config.js`](../js/config.js).
2. Paste the URL between the quotes:
   ```js
   SHEETS_API_URL: "https://script.google.com/macros/s/AKfy…/exec",
   ```
3. Commit and push. GitHub Pages updates within a minute or two.

The yellow "Demo mode" bar disappears and the example cards are replaced by real entries.

## 5. Test it

1. Open the live site, fill in the form as a graduate, and finish.
2. Check the **Graduates** tab: your row should be there.
3. The database page will still look empty until **3 graduates share the same course and uni**. That's the "small groups stay hidden" rule. To test with fewer, temporarily set `MIN_GROUP_SIZE: 1` in the script (step 6).

## 6. Changing the script later

After editing `Code.gs`, click **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**. The URL stays the same, so no website change is needed.

Settings at the top of the script:

| Setting | What it does | Default |
|---|---|---|
| `MIN_GROUP_SIZE` | Grads needed with the same course + uni before their cards appear | 3 |
| `MAX_ENTRIES` | Most cards sent to the website | 1000 |
| `CACHE_SECONDS` | How long the public list is cached | 300 (5 min) |

## Managing the data

- **Hide one card:** in the Graduates tab, change its `show_in_database` cell to `FALSE`.
- **Delete someone's answers** (for example if they ask): delete the row.
- **Don't rename** the tabs or the header row. The script matches on them.
- Cards update within 5 minutes (the cache), or straight away after a new graduate submits.

## Good to know

- Google Apps Script is free, with daily limits far above what an MVP needs.
- The sheet stores emails, so share it only with people who need it, and keep sharing set to "Restricted".
- Basic spam protection is built in: a hidden trap field, email and answer checks, and protection against spreadsheet formulas in answers. If spam becomes a problem, add Google reCAPTCHA later.
