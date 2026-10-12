# Launch Stride accounts

This branch is for account integration testing. Follow ACCOUNT_SETUP.md to create storage, configure verified email/password sign-in, allow the confirmation/reset callbacks, and test the account flow before merging into main.

The account-enabled index.html needs HTTP/HTTPS hosting. Stride.html forwards to index.html. No Next.js application server is required. Use the existing browser-only version to export your study backup before switching.

GitHub Pages should keep serving main until the live Supabase checks pass. When changing the domain, preserve the same Supabase project and update Authentication URL Configuration before advertising.
