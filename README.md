# Stride

A colourful personal study tracker. This testing branch adds Supabase sign-in, private cloud records, a 21-subject catalogue, and the approved onboarding.

Start with [ACCOUNT_SETUP.md](ACCOUNT_SETUP.md). The existing live site remains on main until this branch is ready.

[Terms & Conditions](terms.html) and [Privacy Policy](privacy.html) are review drafts, accessible before signup and without JavaScript. They deliberately retain unresolved operator/contact/transfer details and label retention proposals as inactive. See [LAUNCH.md](LAUNCH.md) before enabling public registration. Technical checks do not constitute legal approval.

For browser tests: npm install, npx playwright install chromium, then npm test. These tests simulate Supabase; [VALIDATION.md](VALIDATION.md) lists the remaining live checks.

Motion uses locally served, pinned GSAP and Lenis files, plus a React Bits SpotlightCard adaptation within the existing plain-JavaScript site. See [THIRD_PARTY.md](THIRD_PARTY.md) for versions, source attribution and reduced-motion/native-input behaviour.
