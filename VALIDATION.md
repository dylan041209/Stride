# Account integration validation

The browser test uses a simulated Supabase client and runs in headless Microsoft Edge. It does not create real users, send emails or write to the live database.

Passing checks:

- Anonymous direct navigation cannot display the tracker.
- Signup rejects missing uppercase, lowercase, digit, symbol and insufficient length.
- Invalid sign-in credentials show a prominent alert, preserve typed values, associate the email/password fields with the warning, and keep the tracker inaccessible. The alert receives focus, clears on editing and is visible on a 390px phone viewport. Connection and rate-limit errors have distinct guidance and do not mark the credentials as incorrect. Alert colours were visually reviewed in both theme states.
- Signup waits for email verification; it does not bypass onboarding as the earlier design prototype did.
- All 21 subjects appear, including Politics; exactly three are required.
- Onboarding resumes after a reload and goal selection retains scroll position at 746 × 668.
- Chosen subjects replace the original hard-coded trio throughout the tracker.
- Exam marks, graph percentages and Full Marks achievements remain available.
- Subject colour choices survive a simulated cloud save/reload.
- Legacy Business and IT data is mapped to Business Studies and ICT on explicit import.
- Conflicting revisions block further uploads rather than overwrite newer online records.
- Switching to a different account does not show the previous account's tracker.
- Password recovery routes to a password change form only with a signed-in account.
- Personal rewards support creation, editing the title/level, cancelling edits and deletions, and deleting both achieved and pending rewards. Changes persist through a simulated save and reload; deleting rewards preserves XP and other rewards.
- Overall levels advance at 100 and 200 XP, and subject levels advance at 100 subject XP. Dashboard and reward progress use the same thresholds.
- Weekly goals can be edited, removed and restored with persistence through a reload.
- Reward cards have been visually checked in light mode, dark mode and at a 390px phone width without horizontal page overflow.
- Deadline cards have been visually reviewed with simulated records in light mode, dark mode and at a 390px phone width. The review includes upcoming, overdue and completed deadlines, a date tile, subject/type/priority labels and completion that persists after reload. The dashboard uses the same card renderer.
- The planner calendar has been visually reviewed with simulated sessions in light/dark themes and at desktop, laptop and 390px phone widths. Sessions use compact cards with separate subject, topic, duration and remove controls. Narrower screens use stacked day rows. Creating and removing a session persists through reload, and the full planned-session list uses the same card renderer.
- Terms and Privacy drafts load anonymously with JavaScript disabled, have working contents links and explicit unresolved placeholders, and request no external services while read. Signup/sign-in and a static footer expose both documents; opening them preserves the account form in its tab. Desktop, 390px mobile and system-dark layouts were visually reviewed. Mobile pages have no horizontal overflow; print styles retain the draft notice and omit navigation.
- The welcome panel was visually reviewed on 13 October 2026 at 1440px, the reported 970px window width, and 390px/320px phone widths. Its copy and illustration are inset, decorative cards stay inside their container without overlapping the achievement label, and there is no horizontal page overflow. A stored dark tracker preference no longer applies an unreadable dark background to the light account welcome panel.
- Welcome copy was reviewed individually with the owner: remove the repeated subject/goal/pace footnote, illustration label and progress tagline; use “Your study tracker”, “Getting started” and “Set a weekly goal”. Retain the welcome label, description and achievement badge. The owner chose to retain the dashboard, Courses and Rewards hero wording. This changes presentation only; wider rollout and animation additions remain separate work.
- GSAP entrances and progress feedback, Lenis wheel smoothing and a React Bits SpotlightCard adaptation are now integrated. Checks cover actual entrance transforms, changing reduced-motion preferences while running, restoring native scrolling, wheel input followed by keyboard Home/End on a 120-session history, independent scrolling inside a modal with the background locked, card pointer feedback, cleanup across repeated route changes, native touch behaviour and a working exam-score form when animation-library requests fail. Light/dark desktop and 390px mobile layouts were visually reviewed. New motion files are served with the site and add no runtime provider requests or storage keys; THIRD_PARTY.md records versions and attribution.

The legal checks verify access, draft status, links and presentation. They do not establish enforceability or data-protection compliance. The current pages do not record acceptance or implement the proposed retention periods; LAUNCH.md lists the unresolved facts and processes.

The user reported that supabase/verify-access.sql passed against their project on 12 October 2026. That transaction checks isolation, verified access, blocked direct writes and revision conflicts with temporary users, then rolls them back.

Approved-email SQL was executed locally in PGlite/PostgreSQL with simulated Supabase roles. Checks pass for exact enabled addresses, case/space normalization, disabled addresses, outsiders on the same domain, unapproved aliases, anonymous signup, forged approval metadata, inaccessible lists/hooks and blocked self-approval. Repeated setup preserves the rule; verification test rows are rolled back. Browser checks cover the prominent rejection message, preserved inputs, email-only error association, clearing on edit and blocked onboarding. These checks do not activate the live Supabase hook or prove live email delivery; APPROVED_EMAIL_SETUP.md lists those steps.

The owner reported that the setup SQL completed, but the original hosted verification failed with SQLSTATE 42501 when attempting SET ROLE supabase_auth_admin. The revised hosted check uses owner-executed rule cases and named grant/RLS-policy inspection without any role switches. Its regression environment uses a non-superuser owner with no Auth-role membership and explicitly reproduces the denied switch before running the corrected check. A separate privileged local database retains real role-execution isolation tests; this does not claim impersonation is available in the hosted SQL Editor. The signup rule and its grants are unchanged by this repair.

The configuration helper now plans without credentials or network calls by default. Its tests cover root/index callback equivalence, all four redirects, preserving localhost entries, repeatability and rejecting embedded credentials or unreadable old settings. Applying the plan still requires a private management token and an explicit --apply flag in the owner's environment.

Still to validate live after setup: owner read/write rules using two actual signed-in users, the configured server password policy, verification and recovery email delivery, and true cross-device saving. Do not advertise registration until these checks and the public terms/privacy information are ready.
