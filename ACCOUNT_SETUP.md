# Stride account setup — testing branch

This branch connects the approved onboarding to Supabase, using the public project URL and publishable key. Stride remains a static website: it does not need Next.js, SSR middleware or a separate application server. The browser client is pinned to @supabase/supabase-js 2.117.3.

## 1. Create the private account storage

Open the Supabase project, choose SQL Editor > New query, paste the entire contents of `supabase/setup.sql`, and run it. It creates one row per account, restricts reads to the verified owner, and accepts writes through an owner-bound function with a revision check.

The public browser key cannot create these tables. This step needs the project owner's dashboard access. No secret key or database password needs to be shared with the website or the assistant.

Then run `supabase/verify-access.sql` in the same SQL Editor. It checks owner-only reads, blocked direct writes, anonymous/unverified access, and conflicting revisions using temporary users and data that are rolled back. No verification emails are sent by this SQL check.

## 2. Configure authentication

Enable email/password sign-in and keep email confirmation enabled. Set the minimum password length to 8. Choose the strongest character preset: uppercase, lowercase, a number and a special character. This matches the policy approved for Stride and the validation in its signup and password-reset forms.

To apply the exact policy and URLs together, run `scripts/configure-supabase.mjs` with Node 22+ in your own environment, setting `SUPABASE_ACCESS_TOKEN` privately and passing the hosted website URL. The token is a Supabase personal access token with permission to configure this project, not the browser key. Never put it in config.js, source control or chat. Example command after privately setting that variable:

```
node scripts/configure-supabase.mjs https://dylan041209.github.io/Stride/
```

If you configure settings manually, set Authentication > URL Configuration > Site URL to the hosted address. Allow both exact callback URLs:

- `https://dylan041209.github.io/Stride/?flow=confirm`
- `https://dylan041209.github.io/Stride/?flow=recovery`

Replace the example address with the real deployment address if it differs. Add matching localhost callback URLs separately for development. The website derives its callback address from its current URL. Auth email templates must preserve the configured redirect rather than hard-code an old domain.

## 3. Verification and reset email delivery

Supabase's default email service is for development, only sends to project-team email addresses and is heavily rate limited. Use your project-team email for initial tests. Configure custom SMTP before allowing public sign-ups. Do not turn verification off to bypass email setup: the database and website both require a verified account.

## 4. Test the branch before switching the live site

Serve this directory over HTTP on localhost, or publish it to a separate HTTPS test address and add its callback URLs above. The `main` branch and existing published tracker remain unchanged. Opening account-enabled index.html directly from a ZIP will show a hosting explanation instead of attempting email sign-in.

Create your account, verify the email, choose exactly three subjects, and set or skip a goal. Test a session, exam score, achievement, subject colour change, export and import. Reload to check persistence, then sign in on a second device. Also test a second account and verify it cannot read or write the first account's row.

## 5. Move your old progress

Export a JSON backup from the current tracker. In the account-enabled website, sign in to your own verified account and choose Import backup. Import explicitly replaces the study records in that account after confirmation; it preserves your chosen subjects and colours. Old Business and IT targets are renamed to Business Studies and ICT. History for subjects outside your current three remains available as archived history.

The old shared `stride.v1` browser storage is never automatically copied into an account. Account drafts have separate keys per user. Failed saves retain an account-specific browser draft, and conflicts stop automatic uploads rather than overwrite newer online progress. Export before choosing to discard an unsynced draft.

The account branch's `Stride.html` forwards to the account-enabled index page. Keep your existing downloaded tracker until its backup is safely imported. The original code is retained on `main` until this testing branch is merged, and a local source backup has also been saved separately.

## 6. Change domain before advertising

Keep the same Supabase project. Change hosting/DNS, then set the new Site URL and exact confirmation/recovery callback URLs. Sign in again on the new domain and test new verification and reset emails. Online records follow the account; old browser-only records need export/import.

## Validation status

Browser tests against a simulated Supabase client cover anonymous route guards, signup rules, verification gating, 21 subjects, resumed onboarding, goal scroll stability, dynamic subjects, exam scoring/graphs, achievements, saved colours, backup migration, conflict protection, account switching and recovery routing.

The SQL, real email delivery, live password policy, database isolation and actual cross-device saving still need verification against your configured Supabase project. This is a testing branch, not a completed public launch. Terms and privacy-policy pages need owner-reviewed content before public registration is advertised.

Official references: https://supabase.com/docs/guides/auth/redirect-urls and https://supabase.com/docs/guides/database/postgres/row-level-security
