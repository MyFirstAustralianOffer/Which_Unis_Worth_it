# Supabase setup

Return on Uni uses [Supabase](https://supabase.com) for accounts (sign-in) and the database.
The website only ever uses the project's **public** address and **publishable** key
(`js/config.js`). Everything it may do is defined by the functions in
`supabase/schema.sql`; tables can't be read or written directly.

## 1. Database

Supabase → **SQL Editor** → **New query** → paste the whole of `supabase/schema.sql` → **Run**.
It's safe to run again after changes (it updates functions and only creates what's missing).

## 2. Sign-in

- **Authentication → URL Configuration**: Site URL `https://returnonuni.com.au`,
  Redirect URLs `https://returnonuni.com.au/**`.
- **Authentication → Sign In / Providers**:
  - **Email**: on (sign-in links; nobody sets a password).
  - **Google**: on, with the Client ID and secret from Google Cloud (an OAuth client of type
    *Web application*, redirect URI = the Callback URL Supabase shows).

## 3. Emails from noreply@returnonuni.com.au (before launch)

Supabase's built-in email only sends a few emails an hour, to your own team.
For real users, use [Resend](https://resend.com) (free):

1. Resend → **Domains → Add** `returnonuni.com.au`, add the DNS records it shows in VentraIP, **Verify**.
2. Resend → **API Keys → Create** (sending access).
3. Supabase → **Authentication → Emails → SMTP Settings** → Custom SMTP:
   sender `noreply@returnonuni.com.au`, name `Return on Uni`, host `smtp.resend.com`,
   port `465`, username `resend`, password = the Resend API key.

## 4. Branded sign-in emails

Supabase → **Authentication → Emails → Templates**. Paste these (built by `python3 tools/build-emails.py`):

| Template | Subject | Body |
|---|---|---|
| Magic link | Your Return on Uni sign-in link | `supabase/email-templates/magic-link.html` |
| Confirm signup | Welcome to Return on Uni: confirm your email | `supabase/email-templates/confirm-signup.html` |

## Day to day

- **See answers**: Table editor → `graduates`, `current_students`, `future_students`.
- **Hide a card**: untick `show_in_database` on that row.
- **Fix a course name**: `course_names` → type the right title in `use_instead`.
  Every matching card, past and future, shows the fixed name.
- **Accounts**: `profiles` (who has contributed) and Authentication → Users.
