/**
 * Searching the course database (data/courses.json).
 *
 *   buildIndex(json)                       → index used by the functions below
 *   searchCourses(index, text, level)      → titles for the type-ahead list
 *   closestCourses(index, text, level)     → up to 3 "Did you mean …?" titles (best first), or []
 *   findExact(index, text)                 → the official title if `text` is one (any capitals/spacing)
 *
 * Matching works on words, so "masters in politics" finds "Master of Political Science":
 * small words (of, in, and) are ignored, plurals and short forms are normalised, and
 * words can match by prefix ("politic" → "political") or with a small typo.
 */

const STOP = new Set(["of", "in", "and", "the", "for", "with", "a", "an", "to", "on", "by", "or", "&"]);

/** Short forms → full words, applied to both what people type and the titles. */
const SYNONYMS = {
  masters: "master", bachelors: "bachelor", grad: "graduate", cert: "certificate", certif: "certificate",
  dip: "diploma", hons: "honours", honors: "honours", sci: "science", eng: "engineering", engg: "engineering",
  tech: "technology", it: "information technology", cs: "computer science", comp: "computer", info: "information",
  mgmt: "management", mgt: "management", admin: "administration", bus: "business", intl: "international",
  psych: "psychology", phd: "doctor philosophy", mba: "master business administration",
  llb: "bachelor laws", llm: "master laws", jd: "juris doctor", law: "laws", maths: "mathematics", math: "mathematics",
};

/** Words that the level dropdown adds to a search ("Master" + "politics" → "master politics"). */
const LEVEL_WORDS = {
  Bachelor: ["bachelor"], Master: ["master"], Diploma: ["diploma"],
  "Graduate Certificate": ["graduate", "certificate"], "Graduate Diploma": ["graduate", "diploma"],
  PhD: ["doctor", "philosophy"],
};
const ALL_LEVEL_WORDS = new Set(Object.values(LEVEL_WORDS).flat().concat(["honours", "advanced", "associate"]));

function stem(w) {
  if (w.length > 4 && w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (w.length > 4 && w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
  return w;
}

/** "Masters in Politics" → ["master", "politic"] */
export function tokens(text) {
  const out = [];
  String(text).toLowerCase().replace(/[^a-z0-9&'\s/-]/g, " ").split(/[\s/-]+/).forEach((raw) => {
    const w = raw.replace(/'/g, "");
    if (!w || STOP.has(w)) return;
    (SYNONYMS[w] || w).split(" ").forEach((x) => { if (!STOP.has(x)) out.push(stem(x)); });
  });
  return [...new Set(out)];
}

function editDistance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

/** Does query word `q` match title word `t`? `prefix` allows a half-typed last word. */
function wordMatch(q, t, prefix = false) {
  if (q === t) return true;
  if (prefix && q.length >= 2 && t.startsWith(q)) return true;
  if (q.length >= 4 && t.startsWith(q)) return true;                       // politic → political
  if (t.length >= 4 && q.startsWith(t) && q.length - t.length <= 3) return true;
  if (q.length >= 5 && t.length >= 5 && q[0] === t[0]) {
    let p = 0; while (p < q.length && q[p] === t[p]) p++;
    if (p >= 6) return true;                                                // economic → economics
    if (Math.abs(q.length - t.length) <= 2 && editDistance(q, t) <= (q.length >= 8 ? 2 : 1)) return true; // sceince → science
  }
  return false;
}

const isDouble = (name) => name.includes(" / ") || (name.match(/\b(bachelor|master|diploma|doctor|certificate)\b/gi) || []).length > 1;

export function buildIndex(json) {
  const { levels, unis, courses } = json;
  const list = courses.map(([name, lv, u]) => ({
    name,
    lower: name.toLowerCase(),
    levels: lv.split("").map((i) => levels[+i]),
    unis: u.map((i) => unis[i]),
    toks: tokens(name),
    double: isDouble(name),
  }));
  const byName = new Map(list.map((c) => [c.lower, c]));
  return { list, byName, levels, unis };
}

const tidy = (s) => String(s || "").replace(/\s*\/\s*/g, " / ").replace(/\s+/g, " ").trim();

export function findExact(index, text) {
  return index.byName.get(tidy(text).toLowerCase()) || null;
}

/** Courses at this level (all courses if no level chosen). */
const atLevel = (index, level) => (level ? index.list.filter((c) => c.levels.includes(level)) : index.list);

/** Type-ahead: every typed word must match a word in the title (last word can be half-typed). */
export function searchCourses(index, text, level, limit = 8) {
  const q = tokens(text);
  if (!q.length) return [];
  const phrase = tidy(text).toLowerCase();
  const wantsDouble = /\/|\bdouble\b/i.test(text);
  const results = [];
  for (const c of atLevel(index, level)) {
    const ok = q.every((w, i) => c.toks.some((t) => wordMatch(w, t, i === q.length - 1)));
    if (!ok) continue;
    let score = c.name.length / 20 + (c.toks.length - q.length) - Math.min(c.unis.length, 30) / 6; // common degrees first
    if (c.lower.includes(phrase)) score -= 10;
    if (c.double && !wantsDouble) score += 8;
    if (/\(honours\)|exit only|embedded/i.test(c.name)) score += 2;
    results.push([score, c]);
  }
  results.sort((a, b) => a[0] - b[0] || a[1].name.localeCompare(b[1].name));
  return results.slice(0, limit).map((r) => r[1]);
}

/** How well word `w` matches the best word in `list`: 1 exact, 0.85 close (prefix/typo), 0 none. */
function bestWord(w, list) {
  let best = 0;
  for (const t of list) {
    if (t === w) return 1;
    if (best < 0.85 && wordMatch(w, t)) best = 0.85;
  }
  return best;
}

/**
 * "Did you mean …?": up to `limit` official titles, best first ([] if nothing is close).
 * Scores how much of what they typed AND how much of the title matched, so
 * "Masters in Politics" → "Master of Political Science" / "Master of Political Economy",
 * not a long double degree. Several are returned when they're about as good as each other.
 */
export function closestCourses(index, text, level, limit = 3) {
  if (findExact(index, text)) return [];
  let q = tokens(text);
  if (!q.length) return [];
  const typedLevel = q.some((w) => ALL_LEVEL_WORDS.has(w));
  if (level && !typedLevel) q = [...new Set([...q, ...LEVEL_WORDS[level].map(stem)])];
  const subject = q.filter((w) => !ALL_LEVEL_WORDS.has(w));
  if (!subject.length) return [];

  const scored = [];
  for (const c of atLevel(index, level)) {
    const subjectHits = subject.filter((w) => bestWord(w, c.toks) > 0).length;
    if (subjectHits < Math.ceil(subject.length * 0.6)) continue;
    const qScore = q.reduce((sum, w) => sum + bestWord(w, c.toks), 0) / q.length;
    const tScore = c.toks.reduce((sum, t) => sum + bestWord(t, q), 0) / c.toks.length;
    let score = qScore * tScore;
    if (c.double) score *= 0.75;
    if (/exit only|embedded|\(pathway\)/i.test(c.name)) score *= 0.8;
    // Research degrees ("Master of Philosophy (Politics)") only when they asked for one.
    if (/\b(master|bachelor) of philosophy\b|\bresearch\b/i.test(c.name) && !/philosoph|research|mphil/i.test(text)) score *= 0.8;
    scored.push([score + Math.min(c.unis.length, 30) / 3000, c]); // tie-break: offered at more unis
  }
  scored.sort((a, b) => b[0] - a[0] || a[1].name.length - b[1].name.length);
  if (!scored.length || scored[0][0] < 0.45) return [];
  const top = scored[0][0];
  return scored.filter(([s]) => s >= top * 0.9).slice(0, limit).map(([, c]) => c);
}

/** Short "where it's offered" note: "Monash" for one uni, "23 unis" for several. */
export function offeredAt(course, shortUni) {
  return course.unis.length === 1 ? shortUni(course.unis[0]) : `${course.unis.length} unis`;
}
