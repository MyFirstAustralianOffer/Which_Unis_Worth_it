/**
 * Site settings.
 *
 * SUPABASE_URL and SUPABASE_KEY are the project's public address and
 * publishable key. Both are meant to be public: the database only allows what
 * supabase/schema.sql permits (see the functions there). Never put the secret
 * or service_role key here.
 */
export const CONFIG = {
  SUPABASE_URL: "https://rgzostyfhlpvgoguithw.supabase.co",
  SUPABASE_KEY: "sb_publishable_xHzWlblGRdd6O5Of6muRTQ_JC4dFbxn",

  /**
   * Google sign-in "Client ID" (Google Cloud → Clients; ends in .apps.googleusercontent.com).
   * Public by design. With it, Google's own button signs people in right on
   * this site, and Google's screen names returnonuni.com.au. Empty = the
   * older redirect sign-in, where Google's screen names supabase.co.
   */
  GOOGLE_CLIENT_ID: "",

  /** Shown as the footer "Contact" link. Leave empty to hide the link. */
  CONTACT_EMAIL: "",

  /** How many cards the database page loads at a time. */
  PAGE_SIZE: 24,
};
