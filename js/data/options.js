/**
 * Shared option lists, exactly as in the Share Form Spec.
 * Stored values are the labels themselves, so the Google Sheet stays readable.
 * Keep these stable once data collection starts.
 */

export const LEVELS = ["Bachelor", "Master", "Diploma", "Graduate Certificate", "Graduate Diploma", "PhD", "Other"];

/**
 * The University of Adelaide and UniSA merged into Adelaide University in 2026.
 * All three names stay because graduates finished under the old names.
 */
export const UNIVERSITIES = [
  "Adelaide University", "Australian Catholic University", "Australian National University", "Bond University",
  "CQUniversity", "Charles Darwin University", "Charles Sturt University", "Curtin University", "Deakin University",
  "Edith Cowan University", "Federation University", "Flinders University", "Griffith University",
  "James Cook University", "La Trobe University", "Macquarie University", "Monash University", "Murdoch University",
  "QUT", "RMIT University", "Southern Cross University", "Swinburne University of Technology",
  "Torrens University Australia", "University of Adelaide", "University of Canberra", "University of Divinity",
  "University of Melbourne", "University of New England", "UNSW Sydney", "University of Newcastle",
  "University of Notre Dame Australia", "University of Queensland", "University of South Australia",
  "University of Southern Queensland", "University of the Sunshine Coast", "University of Sydney",
  "University of Tasmania", "UTS", "University of Western Australia", "University of Wollongong",
  "Victoria University", "Western Sydney University", "Other",
];

/** Shorter names for database cards, e.g. "UNSW (2021) · Domestic". Others show in full. */
export const UNI_SHORT_NAMES = {
  "UNSW Sydney": "UNSW",
  "Monash University": "Monash",
  "Macquarie University": "Macquarie",
  "Deakin University": "Deakin",
  "Curtin University": "Curtin",
  "Flinders University": "Flinders",
  "Griffith University": "Griffith",
  "RMIT University": "RMIT",
  "Bond University": "Bond",
  "Murdoch University": "Murdoch",
  "La Trobe University": "La Trobe",
  "Swinburne University of Technology": "Swinburne",
};
export const shortUni = (name) => UNI_SHORT_NAMES[name] || name;

export const STUDENT_TYPES = ["Domestic", "International"];

const range = (from, to) => {
  const step = from <= to ? 1 : -1;
  return Array.from({ length: Math.abs(to - from) + 1 }, (_, i) => String(from + i * step));
};

/** Graduated: 2026 down to 2016, then "Before 2016". */
export const GRAD_YEARS = [...range(2026, 2016), "Before 2016"];
/** Current students: 2026 to 2031. */
export const GRADUATING_YEARS = range(2026, 2031);
/** Future students: 2026 to 2029, then "Not sure yet". */
export const START_YEARS = [...range(2026, 2029), "Not sure yet"];

export const TIME_TO_JOB = ["Before graduating", "Under 3 months", "3–6 months", "6–12 months", "Over 12 months", "Still looking"];
/** "How long have you been looking?": the time spans from TIME_TO_JOB. */
export const TIME_LOOKING = TIME_TO_JOB.filter((t) => t !== "Before graduating" && t !== "Still looking");

export const JOB_IN_FIELD = ["Yes", "Internship", "Job outside my field", "Not yet"];
