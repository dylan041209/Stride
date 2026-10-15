# Stride

A colourful personal study tracker. This testing branch adds Supabase sign-in, private cloud records, a 21-subject catalogue, and the approved onboarding.

Start with [ACCOUNT_SETUP.md](ACCOUNT_SETUP.md). The account-enabled preview is hosted at https://stride-a81.pages.dev/ from accounts-onboarding. The original main branch remains unchanged.

The Account dropdown at the top right contains Display name, Subjects & colours, and Sign out. Save changes in Account settings to synchronise a private display name, three subject choices and their colours. Changing subjects preserves previous sessions in study history. Editing a display name does not change the sign-in email or the original signup metadata. Existing accounts initially use their signup name; no additional database setup is needed.

The first shared release uses owner-approved email addresses. [APPROVED_EMAIL_SETUP.md](APPROVED_EMAIL_SETUP.md) gives the one-time Supabase setup and explains how to add friends privately. The rule is enforced by Supabase only once its Before User Created hook is installed and enabled; website wording alone does not restrict signup.

[Terms & Conditions](terms.html) and [Privacy Policy](privacy.html) are review drafts, accessible before signup and without JavaScript. They deliberately retain unresolved operator/contact/transfer details and label retention proposals as inactive. See [LAUNCH.md](LAUNCH.md) before enabling public registration. Technical checks do not constitute legal approval.

For browser tests: npm install, npx playwright install chromium, then npm test. These tests simulate Supabase; [VALIDATION.md](VALIDATION.md) lists the remaining live checks.

Motion uses locally served, pinned GSAP and Lenis files, plus a React Bits SpotlightCard adaptation within the existing plain-JavaScript site. See [THIRD_PARTY.md](THIRD_PARTY.md) for versions, source attribution and reduced-motion/native-input behaviour.
