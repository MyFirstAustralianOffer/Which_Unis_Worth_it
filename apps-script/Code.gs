/**
 * Return on Uni: Google Sheets backend (Google Apps Script web app).
 *
 * Paste this whole file into Extensions → Apps Script in your Google Sheet,
 * then Deploy → New deployment → Web app (Execute as: Me, Who has access: Anyone).
 * Full steps: docs/google-sheets-setup.md
 *
 *   POST  (form submission)  → appends one row to the right tab
 *   GET   ?action=entries    → public graduate cards as JSON (no emails, small groups hidden)
 *
 * Course names: the form suggests official titles from the course database
 * (data/courses.json on the website). Anything that isn't an official title is
 * listed on the "Course names" tab, with the closest official title, for review.
 */

var SETTINGS = {
  /**
   * A card only appears once at least this many grads share the same course + uni.
   * 1 = show every graduate. Raise it (e.g. to 3) to hide small groups once responses grow.
   */
  MIN_GROUP_SIZE: 1,
  /** Most cards returned to the website at once. */
  MAX_ENTRIES: 1000,
  /** Seconds the public lists are cached (keeps the site fast and quota low). */
  CACHE_SECONDS: 300,
};

/** One tab per path. Columns are matched by header name, so new columns can be added safely. */
var TABS = {
  graduated: {
    name: 'Graduates',
    columns: ['submitted_at', 'email', 'study_level', 'course_name', 'university', 'student_type', 'graduation_year',
      'time_to_first_job', 'first_role', 'starting_salary', 'current_role', 'current_salary',
      'consent_privacy', 'consent_at', 'form_version', 'show_in_database', 'course_from_list'],
    required: ['study_level', 'course_name', 'university', 'student_type', 'graduation_year',
      'time_to_first_job', 'first_role', 'starting_salary', 'current_role', 'current_salary'],
  },
  studying: {
    name: 'Current students',
    columns: ['submitted_at', 'email', 'study_level', 'course_name', 'university', 'student_type',
      'expected_graduation_year', 'job_in_field', 'current_role', 'hoped_role', 'expected_salary',
      'consent_privacy', 'consent_at', 'form_version', 'course_from_list'],
    required: ['study_level', 'course_name', 'university', 'student_type', 'expected_graduation_year',
      'job_in_field', 'current_role', 'hoped_role', 'expected_salary'],
  },
  planning: {
    name: 'Future students',
    columns: ['submitted_at', 'email', 'study_level', 'course_name', 'university_choice_1', 'university_choice_2',
      'university_choice_3', 'student_type', 'planned_start_year', 'hoped_role', 'expected_salary',
      'consent_privacy', 'consent_at', 'form_version', 'course_from_list'],
    required: ['study_level', 'course_name', 'university_choice_1', 'student_type', 'planned_start_year',
      'hoped_role', 'expected_salary'],
  },
};

/**
 * Review tab for course names that aren't official titles.
 * Copy the "Closest official course" (or type the right title) into "Use this name instead"
 * and every matching entry, past and future, is grouped under it.
 */
var COURSE_TAB = {
  name: 'Course names',
  columns: ['Name as saved', 'Use this name instead', 'Times seen', 'First seen', 'Closest official course'],
};

/** Fields the public database may show. Email and consent are never included. */
var PUBLIC_FIELDS = ['study_level', 'course_name', 'university', 'graduation_year', 'student_type',
  'time_to_first_job', 'first_role', 'starting_salary', 'current_role', 'current_salary'];

var MONEY_FIELDS = ['starting_salary', 'current_salary', 'expected_salary'];
var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Spacing only: "Master of  Data Science " → "Master of Data Science". The form already suggests official titles. */
function tidyCourse(v) {
  return String(v == null ? '' : v).replace(/\s*\/\s*/g, ' / ').replace(/\s+/g, ' ').trim();
}

/* ------------------------------------------------------------------ */
/* Web app entry points                                                */
/* ------------------------------------------------------------------ */

function doPost(e) {
  try {
    var data = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    // Spam trap: a hidden field that only bots fill in.
    if (data.website) return json({ ok: true });

    var tab = TABS[data.path];
    if (!tab) return json({ ok: false, error: 'Please choose which one you are.' });
    if (!EMAIL_RE.test(String(data.email || '').trim())) return json({ ok: false, error: 'Please enter a valid email.' });
    if (data.consent_privacy !== true) return json({ ok: false, error: 'Please agree to the Privacy policy.' });

    // Grads still looking for a job in their field skip first role + starting salary.
    var stillLooking = data.path === 'graduated' && data.time_to_first_job === 'Still looking';
    var optional = stillLooking ? ['first_role', 'starting_salary'] : [];
    for (var i = 0; i < tab.required.length; i++) {
      var key = tab.required[i];
      if (optional.indexOf(key) !== -1) continue;
      var v = data[key];
      if (v === undefined || v === null || String(v).trim() === '') {
        return json({ ok: false, error: 'Some answers are missing. Please go back and check.' });
      }
      if (MONEY_FIELDS.indexOf(key) !== -1 && !(Number(v) > 0 && Number(v) < 100000000)) {
        return json({ ok: false, error: 'Please enter salaries as a whole number.' });
      }
    }

    var lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      // Course name: saved as given (spacing tidied). Review-tab fixes are applied straight away.
      var map = readCourseMap();
      var typed = tidyCourse(data.course_name);
      var fromList = data.course_from_list === true;
      var courseName = applyCourseMap(typed, map.targets);
      var record = {};
      tab.columns.forEach(function (col) {
        if (col === 'submitted_at') record[col] = new Date();
        else if (col === 'email') record[col] = String(data.email).trim().toLowerCase();
        else if (col === 'show_in_database') record[col] = true; // set to FALSE in the sheet to hide a card
        else if (col === 'course_name') record[col] = clean(courseName);
        else if (col === 'course_from_list') record[col] = fromList;
        else if (MONEY_FIELDS.indexOf(col) !== -1) record[col] = data[col] === '' || data[col] === undefined ? '' : Number(data[col]);
        else record[col] = clean(data[col]);
      });
      appendRecord(tab, record);
      if (!fromList && courseName === typed) noteCourseName(typed, data.course_suggestion, map);
    } finally {
      lock.releaseLock();
    }
    var cache = CacheService.getScriptCache();
    cache.remove('entries');
    return json({ ok: true });
  } catch (err) {
    console.error(err);
    return json({ ok: false, error: 'Something went wrong saving your answers. Please try again.' });
  }
}

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || '';
  if (action === 'entries') return cachedJson('entries', function () { return { ok: true, entries: publicEntries() }; });
  return json({ ok: true, service: 'Return on Uni', hint: 'Use ?action=entries' });
}

/* ------------------------------------------------------------------ */
/* Public database                                                     */
/* ------------------------------------------------------------------ */

function publicEntries() {
  var rows = readTab(TABS.graduated);
  var targets = readCourseMap().targets;

  rows = rows
    .filter(function (r) { return r.show_in_database !== false && String(r.show_in_database).toUpperCase() !== 'FALSE'; })
    .map(function (r) {
      var o = {};
      PUBLIC_FIELDS.forEach(function (f) { o[f] = r[f] === undefined ? '' : r[f]; });
      o.course_name = applyCourseMap(o.course_name, targets); // review-tab fixes apply to past entries too
      o._at = r.submitted_at instanceof Date ? r.submitted_at.getTime() : 0;
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
/* Course names: review tab                                            */
/* ------------------------------------------------------------------ */

/** Reads the "Course names" tab → { targets: {lowercase name: use instead}, rows: {lowercase name: {row, seen}} }. */
function readCourseMap() {
  var sheet = getSheet(COURSE_TAB);
  var header = ensureColumns(sheet, COURSE_TAB.columns);
  var out = { sheet: sheet, header: header, targets: {}, rows: {} };
  if (sheet.getLastRow() < 2) return out;
  var c = function (name) { return header.indexOf(name); };
  var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, header.length).getValues();
  values.forEach(function (v, i) {
    var name = String(v[c('Name as saved')] || '').trim().toLowerCase();
    if (!name) return;
    out.rows[name] = { row: i + 2, seen: Number(v[c('Times seen')]) || 0 };
    var use = String(v[c('Use this name instead')] || '').trim();
    if (use) out.targets[name] = use;
  });
  return out;
}

function applyCourseMap(name, targets) {
  var t = targets[String(name).trim().toLowerCase()];
  return t || name;
}

/** A name that isn't an official title goes on the review tab (or bumps its "Times seen"). */
function noteCourseName(name, suggestion, map) {
  var key = String(name).toLowerCase();
  if (!key) return;
  var existing = map.rows[key];
  if (existing) {
    existing.seen += 1;
    map.sheet.getRange(existing.row, map.header.indexOf('Times seen') + 1).setValue(existing.seen);
    return;
  }
  var row = map.header.map(function (h) {
    if (h === 'Name as saved') return clean(name);
    if (h === 'Times seen') return 1;
    if (h === 'First seen') return new Date();
    if (h === 'Closest official course') return clean(suggestion || '');
    return '';
  });
  map.sheet.appendRow(row);
  map.rows[key] = { row: map.sheet.getLastRow(), seen: 1 };
}

/**
 * Only needed if you ran the earlier "cleanExistingCourses" version of this script:
 * puts back the course names exactly as people typed them (from course_name_as_typed).
 * Choose restoreTypedCourseNames → Run. Safe to run more than once.
 */
function restoreTypedCourseNames() {
  var restored = 0;
  Object.keys(TABS).forEach(function (p) {
    var sheet = SpreadsheetApp.getActive().getSheetByName(TABS[p].name);
    if (!sheet || sheet.getLastRow() < 2) return;
    var header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
    var nameCol = header.indexOf('course_name'), typedCol = header.indexOf('course_name_as_typed');
    if (typedCol === -1) return;
    var range = sheet.getRange(2, 1, sheet.getLastRow() - 1, header.length);
    var values = range.getValues();
    values.forEach(function (row) {
      if (row[typedCol] && row[typedCol] !== row[nameCol]) { row[nameCol] = row[typedCol]; restored++; }
    });
    range.setValues(values);
  });
  CacheService.getScriptCache().remove('entries');
  console.log('Restored ' + restored + ' course name(s).');
}

/* ------------------------------------------------------------------ */
/* Sheet helpers                                                       */
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

/** Adds any missing header columns at the end; returns the full header row. */
function ensureColumns(sheet, columns) {
  var width = Math.max(sheet.getLastColumn(), 1);
  var header = sheet.getRange(1, 1, 1, width).getValues()[0].map(String);
  var missing = columns.filter(function (c) { return header.indexOf(c) === -1; });
  if (missing.length) {
    if (header.length === 1 && header[0] === '') header = [];
    sheet.getRange(1, header.length + 1, 1, missing.length).setValues([missing]).setFontWeight('bold');
    header = header.concat(missing);
  }
  return header;
}

/** Appends one row, putting each value under its header (column order in the sheet doesn't matter). */
function appendRecord(tab, record) {
  var sheet = getSheet(tab);
  var header = ensureColumns(sheet, tab.columns);
  sheet.appendRow(header.map(function (h) { return record[h] === undefined ? '' : record[h]; }));
}

/** All rows of a tab as objects keyed by header. */
function readTab(tab) {
  var sheet = SpreadsheetApp.getActive().getSheetByName(tab.name);
  if (!sheet || sheet.getLastRow() < 2) return [];
  var values = sheet.getDataRange().getValues();
  var header = values.shift().map(String);
  return values.map(function (r) {
    var o = {};
    header.forEach(function (h, i) { o[h] = r[i]; });
    return o;
  });
}

function pushUnique(list, value) {
  var v = String(value).trim();
  if (!v) return;
  var low = v.toLowerCase();
  for (var i = 0; i < list.length; i++) { if (list[i].toLowerCase() === low) return; }
  list.push(v);
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

function cachedJson(key, build) {
  var cache = CacheService.getScriptCache();
  var hit = cache.get(key);
  if (hit) return ContentService.createTextOutput(hit).setMimeType(ContentService.MimeType.JSON);
  var body = JSON.stringify(build());
  try { cache.put(key, body, SETTINGS.CACHE_SECONDS); } catch (err) { /* too big to cache: fine */ }
  return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JSON);
}

/** Optional: run once from the editor to create all tabs with headers. */
function setup() {
  Object.keys(TABS).forEach(function (k) { ensureColumns(getSheet(TABS[k]), TABS[k].columns); });
  getSheet(COURSE_TAB);
}
