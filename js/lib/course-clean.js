/**
 * Course-name cleaning rules, shared with the Google script.
 *
 * GENERATED from apps-script/Code.gs by tools/sync-course-clean.mjs.
 * Don't edit here: edit Code.gs, then run  node tools/sync-course-clean.mjs
 */
/* eslint-disable no-var */
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

export { COURSES, COURSE_ALIASES, tidyCourseText, stripCourseLevel, titleCaseCourse, courseEditDistance, closestCourse, cleanCourse };
