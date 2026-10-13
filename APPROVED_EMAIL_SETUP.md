# Approved emails: one-time setup

The website code is prepared for approved-email registration. The restriction becomes active only after you install and enable the Supabase hook below. No real email list is shipped in the website or repository.

## 1. Install the rule

In your Supabase project, open **SQL Editor → New query**. Copy the entire contents of [supabase/approved-emails.sql](supabase/approved-emails.sql), paste it into the editor, and click **Run**. This creates a private-to-users approval table and a function that checks new accounts. It leaves existing accounts and study records alone.

Then run [supabase/verify-approved-emails.sql](supabase/verify-approved-emails.sql) the same way. The expected result is **PASS: approved-email rules and list permissions**. The temporary test entries are rolled back, and no emails are sent.

## 2. Add approved addresses privately

Open **Table Editor**, select **stride_approved_emails**, and choose **Insert row**:

- **email:** the exact address your friend will use to sign up.
- **enabled:** leave this switched on / `true`.
- **added_at:** leave the default.

Save the row. Repeat for each friend. You can include your own email for future signup testing. Existing accounts can still sign in regardless of this list.

Uppercase letters and spaces around an address are cleaned up automatically. Different addresses, including `+` aliases, need their own approval. Do not approve an entire email provider or publish the list in config.js.

## 3. Enable the rule

Open **Authentication → Hooks → Before User Created**. Choose a **Postgres function**, select **public.stride_check_signup**, and enable/save the hook.

Keep ordinary email/password signups enabled and email confirmation switched on. This method uses the normal signup form; turning all new signups off would prevent approved friends from registering too.

Once enabled, Supabase rejects new accounts whose address is not enabled in the table, including requests sent directly to its API. Existing-account sign-in and password reset still work. The website does not ask for, download or display the approval list.

## 4. Check one approved and one unapproved signup

An approved address should reach the verification screen. An unapproved address should get the clear approval warning and should not appear as a new Auth user. Recheck these against the live service after enabling the hook; local tests do not activate it for you.

Your friends also need working verification/reset email delivery. Supabase's default email sender only sends to project-team addresses. Configure custom SMTP before testing friends' addresses; email approval alone does not change that restriction.

## Adding or removing permission later

Add another table row to approve a new friend. Switch **enabled** off to prevent a future signup using that address. This does not delete or suspend an account that already exists. Existing-account closure is a separate action; do not delete someone's records just to change this list.

Do not disable the hook to work around a typo or delivery failure. Correct the email row or sending configuration instead. An empty list blocks every new signup once the hook is enabled.

Sources: [Supabase Before User Created](https://supabase.com/docs/guides/auth/auth-hooks/before-user-created-hook), [hook permissions and Free-plan availability](https://supabase.com/docs/guides/auth/auth-hooks), [email delivery](https://supabase.com/docs/guides/auth/auth-smtp).
