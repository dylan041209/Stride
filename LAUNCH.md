# Launch Stride accounts

This branch is for account integration testing. Follow ACCOUNT_SETUP.md to create storage, configure verified email/password sign-in, allow the confirmation/reset callbacks, and test the account flow before merging into main.

The account-enabled index.html needs HTTP/HTTPS hosting. Stride.html forwards to index.html. No Next.js application server is required. Use the existing browser-only version to export your study backup before switching.

Keep the account changes on this testing branch until both the live checks and the launch requirements below are resolved. The source repository can remain on GitHub. [GitHub Pages' published limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits) say Pages sites should not be used for sensitive transactions such as sending passwords; confirm suitable hosting for public account sign-in before choosing the production deployment. Passing database checks alone does not settle hosting suitability.

## Legal drafts and public registration

`terms.html` and `privacy.html` are review draft v0.1, prepared 12 October 2026, not final documents or accepted account terms. They are linked from signup/sign-in and a static footer, run without JavaScript, and make no external requests when read. `legal.css` supports mobile, system dark mode and printing. Do not remove the draft notice while unresolved items remain.

Before public registration:

- Confirm the responsible legal operator/controller and applicable provider agreements; supply monitored contact details and check any further operator disclosures required.
- Review the age-13 minimum, children's privacy risks and proportionate age assurance. Minimise signup information: the currently required name is unused by the tracker.
- Document the final lawful grounds, provider arrangements, regional processing and international-transfer safeguards; confirm the production verification/reset email service.
- Approve retention periods and implement the corresponding processes, including inactivity notices, live account deletion, provider backup/log limits and rights/complaints handling. The 30-day/90-day/24-month periods in the drafts are proposals, not current automation.
- Review each browser-storage purpose under the applicable rules. Add a way to object to remembering appearance and decide on controls/expiry for local study copies that survive sign-out.
- Obtain appropriate UK legal review of the final documents and arrangements, particularly younger users and service responsibility. Add suitable final-Terms acceptance/version handling; reading a privacy notice is not blanket consent.
- Finish the live checks in VALIDATION.md. Reconcile the pages with the resulting code and hosting, resolve every placeholder, set the actual effective date and remove draft-only indexing metadata when final.

When changing the domain, preserve the same Supabase project and update Authentication URL Configuration before advertising. Review provider/hosting references in the Privacy Policy as part of the move.
