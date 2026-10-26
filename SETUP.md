# DuitFlow setup checklist

Steps that need your own accounts. Run commands from the project folder.

## 1. Database (Supabase SQL Editor)

Run each file once, in order:

1. `supabase/migrations/20261026000000_init.sql` (already done)
2. `supabase/migrations/20261027000000_recurring_categories_ai.sql`: custom categories, repeating transactions, live sync between phones, AI usage limits

Until step 2 is run, signed-in sync shows "Some changes are not backed up yet".

## 2. Edge Functions (AI assistant and Delete account)

```bash
npx supabase login
npx supabase link --project-ref miqyzcmdgkraoptzfuql
npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...   # from console.anthropic.com
npx supabase functions deploy ask
npx supabase functions deploy delete-account
```

- Never put `ANTHROPIC_API_KEY` or the Supabase service_role key in `.env.local` or the app.
- The AI uses Claude Opus 5.5 at low effort, limited to 20 questions per user per day
  (`DAILY_QUESTION_LIMIT` in `supabase/functions/ask/index.ts`). Set a monthly spend limit
  in the Anthropic Console as a second safety net.

## 3. Email

Supabase's built-in email only sends a few messages per hour and only to project members.
Before real users sign up, add your own SMTP (e.g. Resend) under
Authentication → Emails → SMTP Settings, then turn "Confirm email" back on if you turned it off.

## 4. Building the real app (EAS)

```bash
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest env:create --environment preview --name EXPO_PUBLIC_SUPABASE_URL --value https://miqyzcmdgkraoptzfuql.supabase.co --visibility plaintext
npx eas-cli@latest env:create --environment preview --name EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY --value sb_publishable_... --visibility plaintext
npx eas-cli@latest build --profile preview --platform android   # installable APK for testing
```

Repeat the two `env:create` lines with `--environment production` before a store build.
`.env.local` is not uploaded to EAS; builds read these EAS variables instead.

The app ID is `com.duitflow.app` (app.json). It can't be changed after the first store upload,
so confirm the name is yours to use first.

## 5. Before publishing to the stores

- Have `docs/privacy.html` reviewed (PDPA), fill in the date and contact, remove the draft banner.
- Check trademark, company name, domain and store listing availability for "DuitFlow".
- Turn on email confirmation and custom SMTP (step 3).
