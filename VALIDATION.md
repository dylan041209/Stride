# Account integration validation

The browser test uses a simulated Supabase client and runs in headless Microsoft Edge. It does not create real users, send emails or write to the live database.

Passing checks:

- Anonymous direct navigation cannot display the tracker.
- Signup rejects missing uppercase, lowercase, digit, symbol and insufficient length.
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

Still to validate live after setup: SQL execution, owner read/write rules using two actual users, the configured server password policy, verification and recovery email delivery, and true cross-device saving. Do not advertise registration until these checks and the public terms/privacy information are ready.
