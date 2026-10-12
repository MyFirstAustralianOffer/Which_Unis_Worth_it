/**
 * The fixed lists the app is built around: universities, courses and
 * answer options. When a real database arrives, these can be loaded from it.
 *
 * Institution list from the MVP Product Brief. Check it against the
 * TEQSA National Register before launch.
 *
 * NOTE: while the site runs on sample data, every page carries a
 * "these results are made up" banner (see index.html).
 */

/** Australian universities. `aliases` are short names people type. */
export const UNIVERSITY_LIST = [
  { name: "Adelaide University", aliases: ["AU", "Adelaide Uni"] },
  { name: "Australian Catholic University", aliases: ["ACU"] },
  { name: "Australian National University", aliases: ["ANU"] },
  { name: "Avondale University", aliases: [] },
  { name: "Bond University", aliases: ["Bond"] },
  { name: "Central Queensland University", aliases: ["CQU", "CQUniversity"] },
  { name: "Charles Darwin University", aliases: ["CDU"] },
  { name: "Charles Sturt University", aliases: ["CSU"] },
  { name: "Curtin University", aliases: ["Curtin"] },
  { name: "Deakin University", aliases: ["Deakin"] },
  { name: "Edith Cowan University", aliases: ["ECU"] },
  { name: "Federation University Australia", aliases: ["FedUni", "Federation"] },
  { name: "Flinders University", aliases: ["Flinders"] },
  { name: "Griffith University", aliases: ["Griffith"] },
  { name: "James Cook University", aliases: ["JCU"] },
  { name: "La Trobe University", aliases: ["La Trobe", "LTU"] },
  { name: "Macquarie University", aliases: ["MQ", "Macca", "Macq"] },
  { name: "Monash University", aliases: ["Monash"] },
  { name: "Murdoch University", aliases: ["Murdoch"] },
  { name: "Queensland University of Technology (QUT)", aliases: ["QUT"] },
  { name: "RMIT University", aliases: ["RMIT"] },
  { name: "Southern Cross University", aliases: ["SCU"] },
  { name: "Swinburne University of Technology", aliases: ["Swinburne", "Swin"] },
  { name: "Torrens University Australia", aliases: ["Torrens"] },
  { name: "University of Adelaide (legacy name)", aliases: ["UofA", "Adelaide", "Adelaide Uni"] },
  { name: "University of Canberra", aliases: ["UC", "UCanberra"] },
  { name: "University of Divinity", aliases: [] },
  { name: "University of Melbourne", aliases: ["UniMelb", "Melb Uni", "Melbourne"] },
  { name: "University of New England", aliases: ["UNE"] },
  { name: "UNSW Sydney", aliases: ["UNSW", "New South Wales"] },
  { name: "University of Newcastle", aliases: ["UoN", "Newcastle"] },
  { name: "University of Notre Dame Australia", aliases: ["Notre Dame", "UNDA"] },
  { name: "University of Queensland", aliases: ["UQ"] },
  { name: "University of South Australia (UniSA, legacy name)", aliases: ["UniSA", "USA"] },
  { name: "University of Southern Queensland (UniSQ)", aliases: ["UniSQ", "USQ"] },
  { name: "University of the Sunshine Coast", aliases: ["UniSC", "USC", "Sunshine Coast"] },
  { name: "University of Sydney", aliases: ["USYD", "Sydney Uni", "Sydney"] },
  { name: "University of Tasmania", aliases: ["UTAS"] },
  { name: "University of Technology Sydney (UTS)", aliases: ["UTS"] },
  { name: "University of Western Australia", aliases: ["UWA"] },
  { name: "University of Wollongong", aliases: ["UOW", "Wollongong"] },
  { name: "Victoria University", aliases: ["VU", "Vic Uni"] },
  { name: "Western Sydney University", aliases: ["WSU", "UWS"] },
];

/** Private higher education providers, listed after the universities. */
export const PRIVATE_PROVIDERS = [
  { name: "Holmes Institute", aliases: ["Holmes"] },
  { name: "Kaplan Business School", aliases: ["Kaplan", "KBS"] },
  { name: "SP Jain School of Global Management", aliases: ["SP Jain", "SPJ"] },
];

export const OTHER_INSTITUTION = "Other / not listed";

/** Every selectable institution, in display order (universities → private → other). */
export const INSTITUTIONS = [...UNIVERSITY_LIST, ...PRIVATE_PROVIDERS];

/** Plain list of names, used by filters and sample data. */
export const UNIVERSITIES = INSTITUTIONS.map((u) => u.name);

/** Does `query` match this institution's name or one of its short names? */
export function matchesInstitution(inst, query) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return inst.name.toLowerCase().includes(q) || inst.aliases.some((a) => a.toLowerCase().startsWith(q));
}

/** Short names for a given institution name (used by keyword search). */
export const aliasesOf = (name) => INSTITUTIONS.find((u) => u.name === name)?.aliases ?? [];

/** course, field, typical months to a job, typical starting salary ($k). */
export const COURSES = [
  { name: "Nursing",                field: "Health",      months: 2,  salary: 76 },
  { name: "Teaching (Primary)",     field: "Education",   months: 2,  salary: 75 },
  { name: "Pharmacy",               field: "Health",      months: 3,  salary: 70 },
  { name: "Social Work",            field: "Health",      months: 4,  salary: 72 },
  { name: "Civil Engineering",      field: "Engineering", months: 4,  salary: 80 },
  { name: "Computer Science",       field: "IT",          months: 5,  salary: 82 },
  { name: "Data Science",           field: "IT",          months: 5,  salary: 85 },
  { name: "Mechanical Engineering", field: "Engineering", months: 5,  salary: 78 },
  { name: "Accounting",             field: "Business",    months: 6,  salary: 66 },
  { name: "Commerce (Finance)",     field: "Business",    months: 7,  salary: 68 },
  { name: "Marketing",              field: "Business",    months: 8,  salary: 60 },
  { name: "Law",                    field: "Law",         months: 9,  salary: 74 },
  { name: "Architecture",           field: "Design",      months: 9,  salary: 62 },
  { name: "Psychology",             field: "Health",      months: 11, salary: 58 },
  { name: "Biomedical Science",     field: "Science",     months: 12, salary: 55 },
];

export const FIELDS = [...new Set(COURSES.map((c) => c.field))].sort();
export const COURSE_NAMES = COURSES.map((c) => c.name).sort();
export const fieldOf = (courseName) => COURSES.find((c) => c.name === courseName)?.field ?? "Other";

export const JOB_ROUTES = [
  "Grad program",
  "Internship conversion",
  "Referral",
  "Cold applications",
  "Placement employer",
  "Recruiter",
];

export const STUDENT_TYPES = ["Domestic", "International"];
export const LEVELS = ["Undergrad", "Postgrad"];

/** Share-form answers → the number stored. [value, label] pairs. */
export const MONTH_OPTIONS = [
  [0, "Before graduating"],
  [2, "Under 3 months"],
  [4, "3–6 months"],
  [9, "6–12 months"],
  [15, "Over a year"],
];

export const SALARY_OPTIONS = [
  [45, "Under $50k"],
  [55, "$50–60k"],
  [65, "$60–70k"],
  [75, "$70–80k"],
  [85, "$80–90k"],
  [95, "$90k+"],
];

export const IN_FIELD_OPTIONS = ["Yes", "Partly", "No"];
