"""
Builds the sign-in emails for Supabase (supabase/email-templates/*.html).

    python3 tools/build-emails.py

Then paste each file into Supabase → Authentication → Emails → Templates:
  magic-link.html      → "Magic link"        (people who already have an account)
  confirm-signup.html  → "Confirm signup"    (someone signing in for the first time)
Subjects are printed below. Email clients ignore stylesheets, so every style is inline.
"""
import pathlib

OUT = pathlib.Path(__file__).resolve().parent.parent / "supabase" / "email-templates"
NAVY, TEXT, MUTED, LINE, SOFT, PEACH = "#15213b", "#2b3445", "#667085", "#e4e7ec", "#f6f7f9", "#ffe2b8"
FONT = "'Manrope', -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"

def email(preheader, heading, intro, button, after):
    return f"""<!doctype html>
<html lang="en-AU">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<title>{heading}</title>
</head>
<body style="margin:0;padding:0;background:{SOFT};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:{SOFT};">{preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:{SOFT};">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">
      <tr><td style="padding:0 4px 18px;font-family:{FONT};font-size:18px;font-weight:800;color:{NAVY};letter-spacing:-0.01em;">
        Return on <span style="background:{PEACH};border-radius:5px;padding:1px 6px;">Uni</span>
      </td></tr>
      <tr><td style="background:#ffffff;border:1px solid {LINE};border-radius:16px;padding:32px 30px;font-family:{FONT};">
        <h1 style="margin:0 0 12px;font-size:24px;line-height:1.25;font-weight:800;color:{NAVY};letter-spacing:-0.02em;">{heading}</h1>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:{TEXT};">{intro}</p>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="border-radius:999px;background:{NAVY};">
            <a href="{{{{ .ConfirmationURL }}}}" style="display:inline-block;padding:14px 28px;font-family:{FONT};font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px;">{button}</a>
          </td>
        </tr></table>
        <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:{MUTED};">{after}</p>
        <p style="margin:20px 0 0;padding-top:18px;border-top:1px solid {LINE};font-size:12px;line-height:1.6;color:{MUTED};">
          Button not working? Copy this link into your browser:<br>
          <a href="{{{{ .ConfirmationURL }}}}" style="color:{NAVY};word-break:break-all;">{{{{ .ConfirmationURL }}}}</a>
        </p>
      </td></tr>
      <tr><td style="padding:18px 4px 0;font-family:{FONT};font-size:12px;line-height:1.6;color:{MUTED};">
        Sent to {{{{ .Email }}}} because someone asked to sign in to
        <a href="https://returnonuni.com.au" style="color:{MUTED};">Return on Uni</a> with this email.
        No passwords, ever. We never share or sell your email.
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>
"""

EMAILS = {
    "magic-link.html": dict(
        subject="Your Return on Uni sign-in link",
        preheader="Tap the button to sign in. The link works once and expires in an hour.",
        heading="Here's your sign-in link",
        intro="Tap the button below to sign in to Return on Uni. It works once and expires in an hour.",
        button="Sign in to Return on Uni",
        after="Didn't ask for this? You can safely ignore this email. Nobody can sign in without this link.",
    ),
    "confirm-signup.html": dict(
        subject="Welcome to Return on Uni: confirm your email",
        preheader="One tap to confirm your email and sign in.",
        heading="Welcome to Return on Uni",
        intro="Confirm your email to finish signing in. Then share where your degree took you, and explore real outcomes from Australian graduates.",
        button="Confirm and sign in",
        after="The link works once and expires in an hour. Didn't sign up? You can safely ignore this email.",
    ),
}

if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for name, e in EMAILS.items():
        (OUT / name).write_text(email(e["preheader"], e["heading"], e["intro"], e["button"], e["after"]))
        print(f"{name:22} subject: {e['subject']}")
