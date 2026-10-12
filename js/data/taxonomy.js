/**
 * The fixed lists the app is built around: universities, courses and
 * answer options. When a real database arrives, these can be loaded from it.
 *
 * NOTE: university names are fictional on purpose. The demo never shows
 * invented numbers about real universities.
 */

export const UNIVERSITIES = [
  "Banksia University",
  "Kestrel University",
  "Marlow Institute of Technology",
  "Wattle Hill University",
  "Eastgate University",
  "Harbourline University",
];

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
