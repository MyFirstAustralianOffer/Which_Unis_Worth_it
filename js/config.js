/**
 * Site settings. This is the only file you need to edit to go live.
 */
export const CONFIG = {
  /**
   * Google Apps Script web app URL (ends in /exec).
   * Leave empty to run in DEMO MODE: example cards are shown and form
   * answers are kept only in this browser.
   * Setup guide: docs/google-sheets-setup.md
   */
  SHEETS_API_URL: "https://script.google.com/macros/s/AKfycbwG5_sQXNwmeMupGEUMM1E2usqInOwmn7QarmcM93XRwc6-Z5syv-lR83zgA8lwjOlAeA/exec",

  /** Shown as the footer "Contact" link. Leave empty to hide the link. */
  CONTACT_EMAIL: "",

  /** How many cards the database page shows at a time. */
  PAGE_SIZE: 24,

  /** How long (minutes) the database is cached in the browser. */
  CACHE_MINUTES: 5,
};

export const isConnected = () => CONFIG.SHEETS_API_URL.trim().length > 0;
