/**
 * The Share form, described as data (see "Return on Uni – Share Form Spec").
 *
 * Everyone answers START, then one of PATHS based on the "path" answer.
 * `field` names are the column names in Google Sheets: keep them stable
 * once data collection starts.
 *
 * Question types (rendered by js/components/question.js):
 *   email   – email box
 *   choice  – option buttons            (options)
 *   course  – level dropdown + course text box (fields: levelField, courseField)
 *   select  – dropdown                   (options, placeholder)
 *   text    – text box                   (placeholder)
 *   money   – $ number box               (placeholder)
 *   unis3   – three university dropdowns (fields; only the first is required)
 */
import {
  LEVELS, UNIVERSITIES, STUDENT_TYPES, GRAD_YEARS, GRADUATING_YEARS, START_YEARS, TIME_TO_JOB, JOB_IN_FIELD,
} from "./options.js?v=e19dd9c8";

const SALARY_HELP = "Yearly, in AUD, before tax.";

export const START = [
  {
    type: "email", field: "email", title: "What’s your email?",
    placeholder: "you@email.com",
    helper: "We never share or sell your email or personal details. Ever.",
  },
  {
    type: "choice", field: "path", title: "Which one are you?",
    options: [
      { value: "graduated", label: "Graduated" },
      { value: "studying", label: "Currently studying" },
      { value: "planning", label: "Planning to study in Australia" },
    ],
  },
];

export const PATHS = {
  /* Form A: public. Each graduate becomes one database card. */
  graduated: {
    label: "Graduated",
    questions: [
      { type: "course", levelField: "study_level", courseField: "course_name", title: "What did you study?", placeholder: "Course name, e.g. Nursing" },
      { type: "select", field: "university", title: "Where did you study?", options: UNIVERSITIES, placeholder: "Choose your university" },
      { type: "choice", field: "student_type", title: "Did you study as a domestic or international student?", options: STUDENT_TYPES },
      { type: "select", field: "graduation_year", title: "When did you graduate?", options: GRAD_YEARS, placeholder: "Choose year" },
      { type: "choice", field: "time_to_first_job", title: "How long until your first job in your field?", options: TIME_TO_JOB },
      { type: "text", field: "first_role", title: "What was your first role after your degree?", placeholder: "e.g. Graduate Nurse" },
      { type: "money", field: "starting_salary", title: "What was your starting salary?", placeholder: "e.g. 72,000", helper: SALARY_HELP },
      { type: "text", field: "current_role", title: "What’s your role now?", placeholder: "e.g. Registered Nurse" },
      { type: "money", field: "current_salary", title: "What do you earn now?", placeholder: "e.g. 88,000", helper: SALARY_HELP },
    ],
  },

  /* Form B: private. Only used in anonymous totals. */
  studying: {
    label: "Currently studying",
    questions: [
      { type: "course", levelField: "study_level", courseField: "course_name", title: "What are you studying?", placeholder: "Course name, e.g. Nursing" },
      { type: "select", field: "university", title: "Where are you studying?", options: UNIVERSITIES, placeholder: "Choose your university" },
      { type: "choice", field: "student_type", title: "Are you a domestic or international student?", options: STUDENT_TYPES },
      { type: "select", field: "expected_graduation_year", title: "When will you graduate?", options: GRADUATING_YEARS, placeholder: "Choose year" },
      { type: "choice", field: "job_in_field", title: "Do you have a job in your field yet?", options: JOB_IN_FIELD },
      { type: "text", field: "current_role", title: "What’s your role now, if any?", placeholder: "e.g. Retail assistant, or None" },
      { type: "text", field: "hoped_role", title: "What role do you hope to land after graduating?", placeholder: "e.g. Data Analyst" },
      { type: "money", field: "expected_salary", title: "What starting salary do you expect?", placeholder: "e.g. 70,000", helper: SALARY_HELP },
    ],
  },

  /* Form C: private. Only used in anonymous totals. */
  planning: {
    label: "Planning to study",
    questions: [
      { type: "course", levelField: "study_level", courseField: "course_name", title: "What do you plan to study?", placeholder: "Course name, e.g. Nursing" },
      { type: "unis3", fields: ["university_choice_1", "university_choice_2", "university_choice_3"], title: "Which unis are you considering?", options: UNIVERSITIES },
      { type: "choice", field: "student_type", title: "Will you study as a domestic or international student?", options: STUDENT_TYPES },
      { type: "select", field: "planned_start_year", title: "When do you plan to start?", options: START_YEARS, placeholder: "Choose year" },
      { type: "text", field: "hoped_role", title: "What job do you hope to get after?", placeholder: "e.g. Software Engineer" },
      { type: "money", field: "expected_salary", title: "What starting salary do you expect?", placeholder: "e.g. 70,000", helper: SALARY_HELP },
    ],
  },
};

/** Before someone picks a path, the progress bar uses the Graduated total. */
export const DEFAULT_PATH = "graduated";

/** All questions for a path, start questions included. */
export function questionsFor(path) {
  return [...START, ...PATHS[path || DEFAULT_PATH].questions];
}

export const ERRORS = {
  email: "Please enter a valid email to continue.",
  course: "Please choose a level and type your course to continue.",
  generic: "Please answer this question to continue.",
  consent: "Please agree to the Privacy policy to continue.",
};
