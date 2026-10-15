/**
 * Return on Uni: Google Sheets backend (Google Apps Script web app).
 *
 * Paste this whole file into Extensions → Apps Script in your Google Sheet,
 * then Deploy → New deployment → Web app (Execute as: Me, Who has access: Anyone).
 * Full steps: docs/google-sheets-setup.md
 *
 *   POST  (form submission)  → cleans the course name, appends one row to the right tab
 *   GET   ?action=entries    → public graduate cards as JSON (no emails, small groups hidden)
 *   GET   ?action=courses    → course names for the form's suggestions
 */

var SETTINGS = {
  /** A card only appears once at least this many grads share the same course + uni. */
  MIN_GROUP_SIZE: 3,
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
      'consent_privacy', 'consent_at', 'form_version', 'show_in_database', 'course_name_as_typed'],
    required: ['study_level', 'course_name', 'university', 'student_type', 'graduation_year',
      'time_to_first_job', 'first_role', 'starting_salary', 'current_role', 'current_salary'],
  },
  studying: {
    name: 'Current students',
    columns: ['submitted_at', 'email', 'study_level', 'course_name', 'university', 'student_type',
      'expected_graduation_year', 'job_in_field', 'current_role', 'hoped_role', 'expected_salary',
      'consent_privacy', 'consent_at', 'form_version', 'course_name_as_typed'],
    required: ['study_level', 'course_name', 'university', 'student_type', 'expected_graduation_year',
      'job_in_field', 'current_role', 'hoped_role', 'expected_salary'],
  },
  planning: {
    name: 'Future students',
    columns: ['submitted_at', 'email', 'study_level', 'course_name', 'university_choice_1', 'university_choice_2',
      'university_choice_3', 'student_type', 'planned_start_year', 'hoped_role', 'expected_salary',
      'consent_privacy', 'consent_at', 'form_version', 'course_name_as_typed'],
    required: ['study_level', 'course_name', 'university_choice_1', 'student_type', 'planned_start_year',
      'hoped_role', 'expected_salary'],
  },
};

/**
 * Review tab for course names the script didn't recognise.
 * Fill in "Use this name instead" and every matching entry (past and future) is grouped under it.
 */
var COURSE_TAB = {
  name: 'Course names',
  columns: ['Name as saved', 'Use this name instead', 'Times seen', 'First seen'],
};

/** Fields the public database may show. Email and consent are never included. */
var PUBLIC_FIELDS = ['study_level', 'course_name', 'university', 'graduation_year', 'student_type',
  'time_to_first_job', 'first_role', 'starting_salary', 'current_role', 'current_salary'];

var MONEY_FIELDS = ['starting_salary', 'current_salary', 'expected_salary'];
var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/* ------------------------------------------------------------------ */
/* Course names: the list, short forms and cleaning rules              */
/*                                                                    */
/* The website uses the same rules for its "Did you mean…?" hints.    */
/* The block between the >>> and <<< markers is copied into           */
/* js/lib/course-clean.js by tools/sync-course-clean.mjs, so edit it  */
/* here, then run:  node tools/sync-course-clean.mjs                  */
/* ------------------------------------------------------------------ */

// >>> COURSE-CLEAN START
/** Official spellings. Add to this list freely; keep names without the level ("Data Science", not "Master of Data Science"). */
var COURSES = [
  'Accounting', 'Actuarial Studies', 'Advanced Computing', 'Aerospace Engineering', 'Agriculture', 'Animal Science',
  'Applied Finance', 'Applied Science', 'Architecture', 'Artificial Intelligence', 'Arts', 'Aviation',
  'Biomedical Engineering', 'Biomedical Science', 'Biotechnology', 'Business', 'Business Administration',
  'Business Analytics', 'Business Information Systems', 'Chemical Engineering', 'Chemistry', 'Civil Engineering',
  'Clinical Psychology', 'Commerce', 'Communication', 'Computer Science', 'Computing', 'Construction Management',
  'Counselling', 'Creative Arts', 'Criminology', 'Cyber Security', 'Data Analytics', 'Data Science', 'Dentistry',
  'Design', 'Early Childhood Education', 'Economics', 'Education', 'Education (Primary)', 'Education (Secondary)',
  'Electrical Engineering', 'Electrical and Electronic Engineering', 'Engineering', 'Environmental Engineering',
  'Environmental Science', 'Exercise and Sport Science', 'Finance', 'Fine Arts', 'Food Science', 'Forensic Science',
  'Game Design', 'Geology', 'Graphic Design', 'Health Science', 'Human Resource Management', 'Industrial Design',
  'Information Systems', 'Information Technology', 'Interior Design', 'International Business',
  'International Relations', 'Journalism', 'Juris Doctor', 'Laws', 'Linguistics', 'Management', 'Marine Science',
  'Marketing', 'Mathematics', 'Mechanical Engineering', 'Mechatronic Engineering', 'Media and Communication',
  'Medical Science', 'Medicine', 'Midwifery', 'Mining Engineering', 'Music', 'Nursing', 'Nutrition and Dietetics',
  'Occupational Therapy', 'Optometry', 'Paramedicine', 'Pharmacy', 'Philosophy', 'Physics', 'Physiotherapy',
  'Podiatry', 'Politics', 'Professional Accounting', 'Project Management', 'Property', 'Psychological Science',
  'Psychology', 'Public Health', 'Public Policy', 'Radiography', 'Science', 'Social Science', 'Social Work',
  'Software Engineering', 'Speech Pathology', 'Sport Management', 'Statistics', 'Supply Chain Management',
  'Teaching', 'Teaching (Primary)', 'Teaching (Secondary)', 'Tourism', 'Urban Planning', 'Veterinary Science',
  'Visual Arts',
];

/** Short forms people type → official name. Keys are lowercase. A [name, level] pair also sets the level. */
var COURSE_ALIASES = {
  'comp sci': 'Computer Science', 'compsci': 'Computer Science', 'cs': 'Computer Science',
  'it': 'Information Technology', 'info tech': 'Information Technology', 'infotech': 'Information Technology',
  'is': 'Information Systems', 'info sys': 'Information Systems', 'info systems': 'Information Systems',
  'psych': 'Psychology', 'biomed': 'Biomedical Science', 'biomed sci': 'Biomedical Science',
  'physio': 'Physiotherapy', 'ot': 'Occupational Therapy', 'law': 'Laws', 'llb': ['Laws', 'Bachelor'],
  'llm': ['Laws', 'Master'], 'jd': 'Juris Doctor', 'mba': ['Business Administration', 'Master'],
  'mech eng': 'Mechanical Engineering', 'mechanical eng': 'Mechanical Engineering',
  'civil eng': 'Civil Engineering', 'elec eng': 'Electrical Engineering', 'electrical eng': 'Electrical Engineering',
  'software eng': 'Software Engineering', 'chem eng': 'Chemical Engineering', 'eng': 'Engineering',
  'cyber': 'Cyber Security', 'cybersecurity': 'Cyber Security', 'cyber sec': 'Cyber Security',
  'ai': 'Artificial Intelligence', 'hr': 'Human Resource Management', 'hrm': 'Human Resource Management',
  'data sci': 'Data Science', 'data analysis': 'Data Analytics', 'econ': 'Economics', 'econs': 'Economics',
  'maths': 'Mathematics', 'math': 'Mathematics', 'stats': 'Statistics', 'vet': 'Veterinary Science',
  'vet science': 'Veterinary Science', 'media and comms': 'Media and Communication', 'comms': 'Communication',
  'primary teaching': 'Teaching (Primary)', 'secondary teaching': 'Teaching (Secondary)',
  'primary education': 'Education (Primary)', 'secondary education': 'Education (Secondary)',
  'early childhood': 'Early Childhood Education', 'dietetics': 'Nutrition and Dietetics',
  'speech path': 'Speech Pathology', 'sports science': 'Exercise and Sport Science',
  'exercise science': 'Exercise and Sport Science', 'paramedic': 'Paramedicine', 'paramedics': 'Paramedicine',
};

/** Degree words people type into the course box, with the level they mean. Checked in order. */
var LEVEL_PREFIXES = [
  [/^bachelor'?s?(\s+degree)?\s+(of|in)\s+/i, 'Bachelor'],
  [/^master'?s?(\s+degree)?\s+(of|in)\s+/i, 'Master'],
  [/^(graduate|grad\.?)\s*(certificate|cert\.?)\s+(of|in)\s+/i, 'Graduate Certificate'],
  [/^(graduate|grad\.?)\s*(diploma|dip\.?)\s+(of|in)\s+/i, 'Graduate Diploma'],
  [/^(advanced\s+)?diploma\s+(of|in)\s+/i, 'Diploma'],
  [/^(doctor\s+of\s+philosophy|ph\.?\s?d\.?)(\s+(of|in))?\s+/i, 'PhD'],
  [/^(b|m)\.?\s?(sc|a|com|eng|ed|it|bus)\.?\s+((of|in)\s+)?/i, null], // BSc, BCom, MSc… (level from first letter)
  [/^bachelor'?s?\s+/i, 'Bachelor'],
  [/^master'?s?\s+/i, 'Master'],
];

/** Short words inside a course name → full word ("Mech Engg" → "Mech Engineering"). Keys are lowercase. */
var WORD_ABBREVIATIONS = {
  'eng': 'Engineering', 'engg': 'Engineering', 'engr': 'Engineering', 'engineerig': 'Engineering',
  'sci': 'Science', 'sc': 'Science', 'tech': 'Technology', 'mgmt': 'Management', 'mgt': 'Management',
  'admin': 'Administration', 'bus': 'Business', 'comms': 'Communication', 'intl': 'International', 'int\'l': 'International',
  'mech': 'Mechanical', 'elec': 'Electrical', 'env': 'Environmental', 'enviro': 'Environmental',
  'info': 'Information', 'psych': 'Psychology', 'ed': 'Education', 'educ': 'Education',
};

var SMALL_WORDS = ['and', 'of', 'in', 'the', 'for', 'with', 'to', 'a', 'an', 'on'];

/** Expand short words using WORD_ABBREVIATIONS. */
function expandCourseWords(text) {
  return text.split(' ').map(function (w) {
    var full = WORD_ABBREVIATIONS[w.toLowerCase().replace(/\.$/, '')];
    return full || w;
  }).join(' ');
}

/** Spacing, punctuation and symbols. */
function tidyCourseText(s) {
  return String(s == null ? '' : s)
    .replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
    .replace(/\s*[&+]\s*/g, ' and ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s.,;:\-]+|[\s.,;:\-]+$/g, '')
    .trim();
}

/** Remove "Bachelor of", "(Hons)" etc. Returns { text, level } (level is null if none found). */
function stripCourseLevel(text) {
  var level = null;
  var t = text.replace(/\s*\((hons|honours)\)$/i, '').replace(/\s+(hons|honours)$/i, '').replace(/\s+degree$/i, '');
  for (var i = 0; i < LEVEL_PREFIXES.length; i++) {
    var m = t.match(LEVEL_PREFIXES[i][0]);
    if (m && m[0].length < t.length) {
      level = LEVEL_PREFIXES[i][1] || (m[1].toLowerCase() === 'b' ? 'Bachelor' : 'Master');
      t = t.slice(m[0].length);
      break;
    }
  }
  t = t.replace(/\s*\((hons|honours)\)$/i, '').replace(/\s+(hons|honours)$/i, '');
  return { text: tidyCourseText(t), level: level };
}

/** "data science" → "Data Science"; keeps acronyms like IT and AI; "and/of/in" stay lowercase. */
function titleCaseCourse(text) {
  return text.split(' ').map(function (word, i) {
    return word.split('-').map(function (part) {
      var lead = part.match(/^[("']*/)[0];
      var core = part.slice(lead.length);
      if (!core) return part;
      var lower = core.toLowerCase();
      if (i > 0 && SMALL_WORDS.indexOf(lower.replace(/[)"',.]+$/, '')) !== -1) return lead + lower;
      if (/[0-9]/.test(core) || (core.length <= 4 && core === core.toUpperCase() && /[A-Z]/.test(core))) return lead + core;
      return lead + lower.charAt(0).toUpperCase() + lower.slice(1);
    }).join('-');
  }).join(' ');
}

/** Number of single-letter edits (insert, delete, swap, replace) between two strings. */
function courseEditDistance(a, b) {
  var d = [];
  for (var i = 0; i <= a.length; i++) { d[i] = [i]; }
  for (var j = 0; j <= b.length; j++) { d[0][j] = j; }
  for (i = 1; i <= a.length; i++) {
    for (j = 1; j <= b.length; j++) {
      var cost = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a.charAt(i - 1) === b.charAt(j - 2) && a.charAt(i - 2) === b.charAt(j - 1)) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

/** The one known name that's a likely typo of `text`, or null. */
function closestCourse(text, known) {
  var q = text.toLowerCase();
  var allowed = q.length >= 8 ? 2 : q.length >= 5 ? 1 : 0;
  if (!allowed) return null;
  var best = null, bestDist = allowed + 1, tie = false;
  for (var i = 0; i < known.length; i++) {
    var k = known[i].toLowerCase();
    if (Math.abs(k.length - q.length) > allowed) continue;
    var dist = courseEditDistance(q, k);
    if (dist < bestDist) { best = known[i]; bestDist = dist; tie = false; }
    else if (dist === bestDist && best && best.toLowerCase() !== k) { tie = true; }
  }
  return best && !tie ? best : null;
}

/**
 * Clean one course name.
 *   raw    what the person typed
 *   ctx    { courses: [...], aliases: {...}, map: { 'lowercase saved name': 'Use this name' } }
 * Returns { name, level, how } where how is one of:
 *   'alias' | 'exact' | 'typo' | 'mapped' | 'new' | 'empty'
 * `level` is the degree level found inside the text ("Masters of…"), or null.
 */
function cleanCourse(raw, ctx) {
  var courses = (ctx && ctx.courses) || COURSES;
  var aliases = (ctx && ctx.aliases) || COURSE_ALIASES;
  var map = (ctx && ctx.map) || {};

  var stripped = stripCourseLevel(tidyCourseText(raw));
  var text = stripped.text, level = stripped.level, key = text.toLowerCase();
  var name = null, how = 'new';
  if (!text) return { name: '', level: level, how: 'empty' };

  var alias = aliases[key] || aliases[key.replace(/\./g, '')];
  if (alias) {
    if (typeof alias === 'string') { name = alias; } else { name = alias[0]; level = level || alias[1]; }
    how = 'alias';
  }
  // Then try the text as typed, and with short words expanded ("Mech Engg" → "Mechanical Engineering").
  var tries = [text];
  var expanded = expandCourseWords(text);
  if (expanded.toLowerCase() !== key) tries.push(expanded);
  for (var t = 0; t < tries.length && !name; t++) {
    var low = tries[t].toLowerCase();
    for (var i = 0; i < courses.length; i++) {
      if (courses[i].toLowerCase() === low) { name = courses[i]; how = 'exact'; break; }
    }
  }
  for (t = 0; t < tries.length && !name; t++) {
    var near = closestCourse(tries[t], courses);
    if (near) { name = near; how = 'typo'; }
  }
  if (!name) name = titleCaseCourse(expanded);

  var mapped = map[name.toLowerCase()];
  if (mapped && mapped.toLowerCase() !== name.toLowerCase()) { name = mapped; how = 'mapped'; }
  return { name: name, level: level, how: how };
}
// <<< COURSE-CLEAN END

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

    var lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      // Course name: keep what they typed, save the cleaned version.
      var map = readCourseMap();
      var cleaned = cleanCourse(data.course_name, { map: map.targets });
      var record = {};
      tab.columns.forEach(function (col) {
        if (col === 'submitted_at') record[col] = new Date();
        else if (col === 'email') record[col] = String(data.email).trim().toLowerCase();
        else if (col === 'show_in_database') record[col] = true; // set to FALSE in the sheet to hide a card
        else if (col === 'course_name') record[col] = cleaned.name;
        else if (col === 'course_name_as_typed') record[col] = clean(data.course_name);
        else if (MONEY_FIELDS.indexOf(col) !== -1) record[col] = data[col] === '' || data[col] === undefined ? '' : Number(data[col]);
        else record[col] = clean(data[col]);
      });
      appendRecord(tab, record);
      noteCourseName(cleaned, map);
    } finally {
      lock.releaseLock();
    }
    var cache = CacheService.getScriptCache();
    cache.removeAll(['entries', 'courses']);
    return json({ ok: true });
  } catch (err) {
    console.error(err);
    return json({ ok: false, error: 'Something went wrong saving your answers. Please try again.' });
  }
}

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || '';
  if (action === 'entries') return cachedJson('entries', function () { return { ok: true, entries: publicEntries() }; });
  if (action === 'courses') return cachedJson('courses', function () { return courseSuggestions(); });
  return json({ ok: true, service: 'Return on Uni', hint: 'Use ?action=entries or ?action=courses' });
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
/* Course names: suggestions, review tab, clean-up                     */
/* ------------------------------------------------------------------ */

/** What the form needs for type-ahead and "Did you mean…?". Course names only, no personal data. */
function courseSuggestions() {
  var map = readCourseMap();
  var official = COURSES.slice();
  Object.keys(map.targets).forEach(function (k) { pushUnique(official, map.targets[k]); });

  var seen = [];
  Object.keys(TABS).forEach(function (p) {
    readTab(TABS[p]).forEach(function (r) { if (r.course_name) pushUnique(seen, applyCourseMap(String(r.course_name), map.targets)); });
  });
  return { ok: true, courses: official.sort(), seen: seen.sort(), aliases: COURSE_ALIASES };
}

/** Reads the "Course names" tab → { targets: {lowercase name: use instead}, rows: {lowercase name: row number} }. */
function readCourseMap() {
  var sheet = getSheet(COURSE_TAB);
  var out = { sheet: sheet, targets: {}, rows: {} };
  if (sheet.getLastRow() < 2) return out;
  var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 3).getValues();
  values.forEach(function (v, i) {
    var name = String(v[0] || '').trim().toLowerCase();
    if (!name) return;
    out.rows[name] = { row: i + 2, seen: Number(v[2]) || 0 };
    var use = String(v[1] || '').trim();
    if (use) out.targets[name] = use;
  });
  return out;
}

function applyCourseMap(name, targets) {
  var t = targets[String(name).trim().toLowerCase()];
  return t || name;
}

/** Unrecognised names go on the review tab (or bump their "Times seen"). */
function noteCourseName(cleaned, map) {
  if (cleaned.how !== 'new' && cleaned.how !== 'mapped') return;
  var key = cleaned.name.toLowerCase();
  var existing = map.rows[key];
  if (existing) {
    existing.seen += 1;
    map.sheet.getRange(existing.row, 3).setValue(existing.seen);
  } else if (cleaned.how === 'new') {
    map.sheet.appendRow([cleaned.name, '', 1, new Date()]);
    map.rows[key] = { row: map.sheet.getLastRow(), seen: 1 };
  }
}

/**
 * Run once from the editor (choose cleanExistingCourses → Run) to clean course
 * names already in the sheet. Keeps the original in course_name_as_typed.
 * Safe to run again at any time.
 */
function cleanExistingCourses() {
  var map = readCourseMap();
  var changed = 0;
  Object.keys(TABS).forEach(function (p) {
    var tab = TABS[p];
    var sheet = getSheet(tab);
    var header = ensureColumns(sheet, tab.columns);
    var nameCol = header.indexOf('course_name'), typedCol = header.indexOf('course_name_as_typed');
    if (sheet.getLastRow() < 2) return;
    var range = sheet.getRange(2, 1, sheet.getLastRow() - 1, header.length);
    var values = range.getValues();
    values.forEach(function (row) {
      if (!row[typedCol]) row[typedCol] = row[nameCol];
      var cleaned = cleanCourse(row[typedCol], { map: map.targets });
      if (cleaned.name && cleaned.name !== row[nameCol]) { row[nameCol] = cleaned.name; changed++; }
      noteCourseName(cleaned, map);
    });
    range.setValues(values);
  });
  CacheService.getScriptCache().removeAll(['entries', 'courses']);
  console.log('Cleaned ' + changed + ' course name(s).');
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
