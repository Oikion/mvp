# Resend Production Setup Design

**Date:** 2026-03-02
**Status:** Approved

## Problem

The Resend email setup has several issues blocking production readiness:

1. `FROM_ADDRESS` in `lib/resend-segments.ts` is hardcoded as `mail@oikion.com` — not the correct `noreply@mail.oikion.com` (verified Resend domain is `mail.oikion.com`)
2. 13+ files use `process.env.EMAIL_FROM || "Oikion <mail@oikion.com>"` as scattered, incorrect fallbacks
3. Newsletter/waitlist signups never notify `contact@oikion.com`
4. `FEEDBACK_EMAIL` defaults to `"info@softbase.cz"` (dev leftover)
5. `lib/sendmail.ts` uses nodemailer (SMTP) for 2 code paths — a separate, unmaintained provider

## Decisions

- **Verified Resend domain:** `mail.oikion.com`
- **Sender (from):** `Oikion <noreply@mail.oikion.com>` — hardcoded to verified domain, not env-variable driven
- **Internal notification recipient:** `contact@oikion.com`
- **All email through Resend:** nodemailer removed
- **Newsletter notification format:** Simple HTML (not a full branded template)

## Design

### 1. Central config — `lib/resend-segments.ts`

Extend `EMAIL_CONFIG` with:
- Fix `FROM_ADDRESS`: `"mail@oikion.com"` → `"noreply@mail.oikion.com"`
- Add `CONTACT_EMAIL: "contact@oikion.com"`

`EMAIL_CONFIG.FROM` (already a getter) then returns `"Oikion <noreply@mail.oikion.com>"`.

### 2. Update all email-sending files (13 files)

Replace every occurrence of:
```ts
process.env.EMAIL_FROM || "Oikion <mail@oikion.com>"
```
with:
```ts
EMAIL_CONFIG.FROM  // imported from "@/lib/resend-segments"
```

Files:
- `app/api/crm/account/[accountId]/task/create/route.ts`
- `app/api/user/inviteuser/route.ts`
- `app/api/feedback/route.ts`
- `actions/referrals/apply-to-referral-programme.ts`
- `actions/referrals/admin-approve-referrer.ts`
- `actions/referrals/admin-deny-referrer.ts`
- `actions/features/request-feature-access.ts`
- `actions/admin/send-mail-to-all/index.ts`
- `actions/platform-admin/user-actions.ts`
- `actions/platform-admin/organization-actions.ts`
- `actions/social/share-via-email.ts`
- `lib/calendar-reminders.ts`
- `lib/notifications/email-service.ts`

### 3. Newsletter notification to `contact@oikion.com`

In `app/api/newsletter/route.ts`, after successful Resend audience add, send:
- **To:** `EMAIL_CONFIG.CONTACT_EMAIL`
- **From:** `EMAIL_CONFIG.FROM`
- **Subject:** `New [Newsletter / Early Access] signup: {email}`
- **Body:** Simple HTML — email, subscription type, timestamp

The notification send failure must NOT block the subscription response.

### 4. Feedback route — fix CONTACT_EMAIL default

In `app/api/feedback/route.ts`, replace:
```ts
const feedbackEmail = process.env.FEEDBACK_EMAIL || "info@softbase.cz";
```
with:
```ts
const feedbackEmail = process.env.FEEDBACK_EMAIL || EMAIL_CONFIG.CONTACT_EMAIL;
```

### 5. Migrate `lib/sendmail.ts` → Resend

Replace the nodemailer implementation with a Resend wrapper that preserves the existing interface (`from`, `to`, `subject`, `text`, `html`). The two callers remain unchanged:
- `lib/new-user-notify.ts`
- `app/api/agent/[slug]/contact/route.ts`

Remove SMTP env vars (`EMAIL_HOST`, `EMAIL_USERNAME`, `EMAIL_PASSWORD`) from `.env.example`.

### 6. Update `.env.example`

- Remove `EMAIL_FROM` (address now hardcoded to verified domain)
- Remove `EMAIL_HOST`, `EMAIL_USERNAME`, `EMAIL_PASSWORD` (SMTP, no longer used)
- Update `FEEDBACK_EMAIL` comment to show `contact@oikion.com`
- Add comment block for Resend section clarifying domain setup

## Out of Scope

- Verifying `oikion.com` root domain in Resend (can be done later if cleaner addresses are needed)
- Resend bounce/unsubscribe webhook handling
- New email templates beyond the simple newsletter notification
