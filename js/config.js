/**
 * App-wide settings. Change values here instead of hunting through the code.
 */

export const APP_NAME = "Which Uni's Worth It?";

/** Groups smaller than this are never summarised (privacy). */
export const MIN_GROUP_SIZE = 3;

/** How many results the database shows per "Load more" click. */
export const PAGE_SIZE = 12;

/** How many results a logged-out visitor can see before the sign-up wall. */
export const FREE_PREVIEW_COUNT = 3;

/** Latest graduation year offered in forms and used for sample data. */
export const LATEST_GRAD_YEAR = new Date().getFullYear() - 1;

/** Key used to keep the mock session for the current browser tab. */
export const SESSION_KEY = "wuwi_user";

/** Account types a visitor can pick at sign-up. */
export const ROLES = {
  graduate: { label: "Graduate", icon: "🎓", blurb: "Finished in the last few years. Share your result to unlock everything." },
  student:  { label: "Current uni student", icon: "📚", blurb: "See where your course leads." },
  future:   { label: "Future student", icon: "🧭", blurb: "Still choosing a uni or course." },
};
