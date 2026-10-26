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

  /** Shown as the footer "Contact" link. Leave empty to hide the link. */
  CONTACT_EMAIL: "",

  /** How many cards the database page loads at a time. */
  PAGE_SIZE: 24,
};
