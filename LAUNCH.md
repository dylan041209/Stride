# Launch Stride accounts

This branch is for account integration testing. Follow ACCOUNT_SETUP.md to create storage, configure verified email/password sign-in, allow the confirmation/reset callbacks, and test the account flow before merging into main.

The account-enabled index.html needs HTTP/HTTPS hosting. Stride.html forwards to index.html. No Next.js application server is required. Use the existing browser-only version to export your study backup before switching.

Keep the account changes on this testing branch until both the live checks and the launch requirements below are resolved. The source repository can remain on GitHub. [GitHub Pages' published limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits) say Pages sites should not be used for sensitive transactions such as sending passwords; confirm suitable hosting for public account sign-in before choosing the production deployment. Passing database checks alone does not settle hosting suitability.

## Legal drafts and public registration

The chosen first shared release is an approved-email friends trial, not open registration. Follow APPROVED_EMAIL_SETUP.md and verify the actual hook before sharing account signup. Known users can contact the project owner through their existing personal channel during this trial; the final public contact details remain unresolved. A restricted trial is not being treated as automatically outside data-protection law or provider terms. The owner reported that the Cloudflare Pages preview at https://stride-a81.pages.dev/ became accessible on 14 October 2026, and has confirmed verification and recovery in their tests. The hosted callback configuration and the remaining live checks still need confirmation; the SMTP provider settings have not been independently inspected.

`terms.html` remains review draft v0.2 (13 October 2026); `privacy.html` is review draft v0.4 (16 October 2026), updated to describe browser display preferences and their remembering opt-out. They are not final documents or accepted account terms. They are linked from signup/sign-in and a static footer, run without JavaScript, and make no external requests when read. `legal.css` supports mobile, system dark mode and printing. Do not remove the draft notice while unresolved items remain.

Before public registration:

- Confirm the responsible legal operator/controller and applicable provider agreements; supply monitored contact details and check any further operator disclosures required.
- Review the age-13 minimum, children's privacy risks and proportionate age assurance. Review the necessity of requiring a signup name; it now initially fills the editable private display name in Account settings.
- Document the final lawful grounds, provider arrangements, regional processing and international-transfer safeguards; confirm the production verification/reset email service.
- Approve retention periods and implement the corresponding processes, including inactivity notices, live account deletion, provider backup/log limits and rights/complaints handling. The 30-day/90-day/24-month periods in the drafts are proposals, not current automation.
- Review each browser-storage purpose under the applicable rules. The display-preference remembering opt-out is available in Account → Settings; decide on controls/expiry for local study copies that survive sign-out.
- Obtain appropriate UK legal review of the final documents and arrangements, particularly younger users and service responsibility. Add suitable final-Terms acceptance/version handling; reading a privacy notice is not blanket consent.
- Finish the live checks in VALIDATION.md. Reconcile the pages with the resulting code and hosting, resolve every placeholder, set the actual effective date and remove draft-only indexing metadata when final.

When changing the domain, preserve the same Supabase project and update Authentication URL Configuration before advertising. Review provider/hosting references in the Privacy Policy as part of the move.
