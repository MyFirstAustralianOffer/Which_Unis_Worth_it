/**
 * Return on Uni: Google Sheets backend (Google Apps Script web app).
 *
 * Paste this whole file into Extensions → Apps Script in your Google Sheet,
 * then Deploy → New deployment → Web app (Execute as: Me, Who has access: Anyone).
 * Full steps: docs/google-sheets-setup.md
 *
 *   POST  (form submission)  → appends one row to the right tab
 *   GET   ?action=entries    → public graduate cards as JSON
 *                              (no emails, small groups hidden)
 */

var SETTINGS = {
  /** A card only appears once at least this many grads share the same course + uni. */
  MIN_GROUP_SIZE: 3,
  /** Most cards returned to the website at once. */
  MAX_ENTRIES: 1000,
  /** Seconds the public list is cached (keeps the site fast and quota low). */
  CACHE_SECONDS: 300,
};

/** One tab per path. Column order = header order. Keep names stable once live. */
var TABS = {
  graduated: {
    name: 'Graduates',
    columns: ['submitted_at', 'email', 'study_level', 'course_name', 'university', 'student_type', 'graduation_year',
      'time_to_first_job', 'first_role', 'starting_salary', 'current_role', 'current_salary',
      'consent_privacy', 'consent_at', 'form_version', 'show_in_database'],
    required: ['study_level', 'course_name', 'university', 'student_type', 'graduation_year',
      'time_to_first_job', 'first_role', 'starting_salary', 'current_role', 'current_salary'],
  },
  studying: {
    name: 'Current students',
    columns: ['submitted_at', 'email', 'study_level', 'course_name', 'university', 'student_type',
      'expected_graduation_year', 'job_in_field', 'current_role', 'hoped_role', 'expected_salary',
      'consent_privacy', 'consent_at', 'form_version'],
    required: ['study_level', 'course_name', 'university', 'student_type', 'expected_graduation_year',
      'job_in_field', 'current_role', 'hoped_role', 'expected_salary'],
  },
  planning: {
    name: 'Future students',
    columns: ['submitted_at', 'email', 'study_level', 'course_name', 'university_choice_1', 'university_choice_2',
      'university_choice_3', 'student_type', 'planned_start_year', 'hoped_role', 'expected_salary',
      'consent_privacy', 'consent_at', 'form_version'],
    required: ['study_level', 'course_name', 'university_choice_1', 'student_type', 'planned_start_year',
      'hoped_role', 'expected_salary'],
  },
};

/** Fields the public database may show. Email and consent are never included. */
var PUBLIC_FIELDS = ['study_level', 'course_name', 'university', 'graduation_year', 'student_type',
  'time_to_first_job', 'first_role', 'starting_salary', 'current_role', 'current_salary'];

var MONEY_FIELDS = ['starting_salary', 'current_salary', 'expected_salary'];
var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/* ------------------------------------------------------------------ */
/* Web app entry points                                                */
/* ------------------------------------------------------------------ */

function doPost(e) {
  try {
    var data = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    // Spam trap: the hidden "website" field is only ever filled in by bots.
    if (data.website) return json({ ok: true });

    var tab = TABS[data.path];
    if (!tab) return json({ ok: false, error: 'Please choose which one you are.' });
    if (!EMAIL_RE.test(String(data.email || '').trim())) return json({ ok: false, error: 'Please enter a valid email.' });
    if (data.consent_privacy !== true) return json({ ok: false, error: 'Please agree to the Privacy policy.' });

    for (var i = 0; i < tab.required.length; i++) {
      var key = tab.required[i];
      var v = data[key];
      if (v === undefined || v === null || String(v).trim() === '') {
        return json({ ok: false, error: 'Some answers are missing. Please go back and check.' });
      }
      if (MONEY_FIELDS.indexOf(key) !== -1 && !(Number(v) > 0 && Number(v) < 100000000)) {
        return json({ ok: false, error: 'Please enter salaries as a whole number.' });
      }
    }

    var row = tab.columns.map(function (col) {
      if (col === 'submitted_at') return new Date();
      if (col === 'email') return String(data.email).trim().toLowerCase();
      if (col === 'show_in_database') return true; // untick in the sheet to hide a card
      if (MONEY_FIELDS.indexOf(col) !== -1) return data[col] === '' || data[col] === undefined ? '' : Number(data[col]);
      return clean(data[col]);
    });

    var lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      getSheet(tab).appendRow(row);
    } finally {
      lock.releaseLock();
    }
    if (data.path === 'graduated') CacheService.getScriptCache().remove('entries');
    return json({ ok: true });
  } catch (err) {
    console.error(err);
    return json({ ok: false, error: 'Something went wrong saving your answers. Please try again.' });
  }
}

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || '';
  if (action !== 'entries') return json({ ok: true, service: 'Return on Uni', hint: 'Use ?action=entries' });

  var cache = CacheService.getScriptCache();
  var hit = cache.get('entries');
  if (hit) return ContentService.createTextOutput(hit).setMimeType(ContentService.MimeType.JSON);

  var body = JSON.stringify({ ok: true, entries: publicEntries() });
  try { cache.put('entries', body, SETTINGS.CACHE_SECONDS); } catch (err) { /* too big to cache: fine */ }
  return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JSON);
}

/* ------------------------------------------------------------------ */
/* Public database                                                     */
/* ------------------------------------------------------------------ */

function publicEntries() {
  var tab = TABS.graduated;
  var sheet = SpreadsheetApp.getActive().getSheetByName(tab.name);
  if (!sheet || sheet.getLastRow() < 2) return [];

  var values = sheet.getDataRange().getValues();
  var header = values.shift();
  var idx = {};
  header.forEach(function (h, i) { idx[h] = i; });

  var rows = values
    .filter(function (r) { return r[idx.show_in_database] !== false && String(r[idx.show_in_database]).toUpperCase() !== 'FALSE'; })
    .map(function (r) {
      var o = {};
      PUBLIC_FIELDS.forEach(function (f) { o[f] = idx[f] === undefined ? '' : r[idx[f]]; });
      o._at = r[idx.submitted_at] instanceof Date ? r[idx.submitted_at].getTime() : 0;
      return o;
    });

  // Privacy: hide any course + uni group with fewer than MIN_GROUP_SIZE grads.
  var counts = {};
  rows.forEach(function (o) { var k = groupKey(o); counts[k] = (counts[k] || 0) + 1; });
  rows = rows.filter(function (o) { return counts[groupKey(o)] >= SETTINGS.MIN_GROUP_SIZE; });

  rows.sort(function (a, b) { return b._at - a._at; });
  return rows.slice(0, SETTINGS.MAX_ENTRIES).map(function (o) { delete o._at; return o; });
}

function groupKey(o) {
  return String(o.course_name).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() + '|' + o.university;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function getSheet(tab) {
  var ss = SpreadsheetApp.getActive();
  var sheet = ss.getSheetByName(tab.name);
  if (!sheet) {
    sheet = ss.insertSheet(tab.name);
    sheet.appendRow(tab.columns);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, tab.columns.length).setFontWeight('bold');
  }
  return sheet;
}

/** Trim, cap length, and stop text being read as a spreadsheet formula. */
function clean(v) {
  if (v === undefined || v === null) return '';
  if (typeof v === 'boolean' || typeof v === 'number') return v;
  var s = String(v).trim().slice(0, 200);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Optional: run once from the editor to create all three tabs with headers. */
function setup() {
  Object.keys(TABS).forEach(function (k) { getSheet(TABS[k]); });
}
