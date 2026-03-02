# Resend Production Setup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all Resend email configuration so the app sends from `noreply@mail.oikion.com`, notifies `contact@oikion.com` on newsletter/waitlist signups, and routes all email through a single provider (Resend).

**Architecture:** Extend the existing `EMAIL_CONFIG` object in `lib/resend-segments.ts` as the single source of truth for email addresses. Update every caller to import from there. Replace the nodemailer `sendmail.ts` shim with a Resend-backed version that preserves the same interface.

**Tech Stack:** Resend SDK (`resend` package), React Email (`@react-email/components`), Next.js API routes, TypeScript

---

## Background: What exists today

- `lib/resend-segments.ts` — has `EMAIL_CONFIG` with `FROM_ADDRESS: "mail@oikion.com"` (wrong), no `CONTACT_EMAIL`
- 13 files use `process.env.EMAIL_FROM || "Oikion <mail@oikion.com>"` as the `from` field (scattered, wrong address)
- `app/api/newsletter/route.ts` — adds subscriber to Resend audience, sends welcome email to subscriber, **never notifies `contact@oikion.com`**
- `app/api/feedback/route.ts` — uses `process.env.FEEDBACK_EMAIL || "info@softbase.cz"` (leftover dev address)
- `lib/sendmail.ts` — nodemailer/SMTP shim, used in 2 places; EMAIL_HOST/USERNAME/PASSWORD env vars needed

---

### Task 1: Fix central config in `lib/resend-segments.ts`

**Files:**
- Modify: `lib/resend-segments.ts`

**Step 1: Make the change**

Open `lib/resend-segments.ts`. The current `EMAIL_CONFIG` block looks like:

```ts
export const EMAIL_CONFIG = {
  FROM_ADDRESS: "mail@oikion.com",
  FROM_NAME: "Oikion",
  get FROM() {
    return `${this.FROM_NAME} <${this.FROM_ADDRESS}>`;
  },
} as const;
```

Replace it with:

```ts
export const EMAIL_CONFIG = {
  FROM_ADDRESS: "noreply@mail.oikion.com",
  FROM_NAME: "Oikion",
  CONTACT_EMAIL: "contact@oikion.com",
  get FROM() {
    return `${this.FROM_NAME} <${this.FROM_ADDRESS}>`;
  },
} as const;
```

**Step 2: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit 2>&1 | head -30
```

Expected: no errors from `lib/resend-segments.ts`.

**Step 3: Commit**

```bash
git add lib/resend-segments.ts
git commit -m "fix(email): set correct noreply@mail.oikion.com from address and add CONTACT_EMAIL"
```

---

### Task 2: Update `app/api/feedback/route.ts`

**Files:**
- Modify: `app/api/feedback/route.ts`

**Step 1: Add import**

At the top of the file, add to the existing imports:

```ts
import { EMAIL_CONFIG } from "@/lib/resend-segments";
```

**Step 2: Fix the two wrong values**

Line 51 — change:
```ts
const feedbackEmail = process.env.FEEDBACK_EMAIL || "info@softbase.cz";
```
to:
```ts
const feedbackEmail = process.env.FEEDBACK_EMAIL || EMAIL_CONFIG.CONTACT_EMAIL;
```

Line 67 — change:
```ts
from: process.env.EMAIL_FROM || "Oikion <mail@oikion.com>",
```
to:
```ts
from: EMAIL_CONFIG.FROM,
```

**Step 3: Verify**

```bash
pnpm tsc --noEmit 2>&1 | grep "feedback" | head -10
```

Expected: no errors.

**Step 4: Commit**

```bash
git add app/api/feedback/route.ts
git commit -m "fix(email): use correct from address and contact@oikion.com in feedback route"
```

---

### Task 3: Add `contact@oikion.com` notification to the newsletter route

**Files:**
- Modify: `app/api/newsletter/route.ts`

**Step 1: Understand the current flow**

The file already imports `EMAIL_CONFIG` from `@/lib/resend-segments` and uses `EMAIL_CONFIG.FROM` on line 83 for the welcome email. The `resend` client is already initialized at the top.

**Step 2: Add the notification send**

After the welcome email try/catch block (around line 98, after `console.log('[Newsletter] Welcome email sent:', emailResult)`), add a notification send inside the outer `if (resend)` block:

```ts
// Notify contact@oikion.com about new signup
try {
  await resend.emails.send({
    from: EMAIL_CONFIG.FROM,
    to: EMAIL_CONFIG.CONTACT_EMAIL,
    subject: `New ${preAlphaInterest ? 'Early Access' : 'Newsletter'} signup: ${normalizedEmail}`,
    html: `<p>New signup received:</p>
<ul>
  <li><strong>Email:</strong> ${normalizedEmail}</li>
  <li><strong>Type:</strong> ${preAlphaInterest ? 'Early Access (Beta Waitlist)' : 'Newsletter'}</li>
  <li><strong>Time:</strong> ${new Date().toISOString()}</li>
</ul>`,
  });
} catch (notifyError) {
  // Don't fail the subscription if notification fails
  console.error('[Newsletter] Error sending admin notification:', notifyError);
}
```

Place it at the end of the outer `try` block inside `if (resend) { ... }`, after the welcome email try/catch.

**Step 3: Verify**

```bash
pnpm tsc --noEmit 2>&1 | grep "newsletter" | head -10
```

Expected: no errors.

**Step 4: Commit**

```bash
git add app/api/newsletter/route.ts
git commit -m "feat(email): notify contact@oikion.com on newsletter/early-access signups"
```

---

### Task 4: Update the 11 remaining scattered `from` fields

These files all have `process.env.EMAIL_FROM || "Oikion <mail@oikion.com>"` or `process.env.EMAIL_FROM as string`. Replace every occurrence with `EMAIL_CONFIG.FROM` from `@/lib/resend-segments`.

**Files to modify (11 files):**
- `app/api/crm/account/[accountId]/task/create/route.ts` (lines 68, 106)
- `app/api/user/inviteuser/route.ts` (line 86)
- `actions/referrals/apply-to-referral-programme.ts` (line 80)
- `actions/referrals/admin-approve-referrer.ts` (line 77)
- `actions/referrals/admin-deny-referrer.ts` (line 37)
- `actions/features/request-feature-access.ts` (line 124)
- `actions/admin/send-mail-to-all/index.ts` (lines 71, 81)
- `actions/platform-admin/user-actions.ts` (lines 92, 201, 298, 363)
- `actions/platform-admin/organization-actions.ts` (lines 116, 239, 346)
- `actions/social/share-via-email.ts` (line 218)
- `lib/calendar-reminders.ts` (line 201)
- `lib/notifications/email-service.ts` (line 430)

**Step 1: Add import to each file**

For every file that does NOT already import from `@/lib/resend-segments`, add:

```ts
import { EMAIL_CONFIG } from "@/lib/resend-segments";
```

Check if the file already imports from that path first. For example, `app/api/newsletter/route.ts` already has it. Most of the above files do NOT.

**Step 2: Replace all occurrences**

For each file, replace:
```ts
process.env.EMAIL_FROM || "Oikion <mail@oikion.com>"
```
with:
```ts
EMAIL_CONFIG.FROM
```

Also replace the special case in `actions/admin/send-mail-to-all/index.ts` line 71:
```ts
process.env.EMAIL_FROM as string
```
with:
```ts
EMAIL_CONFIG.FROM
```

**Step 3: Verify all 11 files compile**

```bash
pnpm tsc --noEmit 2>&1 | head -40
```

Expected: no errors. If you see errors, read them — they will reference the specific file and line.

**Step 4: Commit**

```bash
git add \
  app/api/crm/account/\[accountId\]/task/create/route.ts \
  app/api/user/inviteuser/route.ts \
  actions/referrals/apply-to-referral-programme.ts \
  actions/referrals/admin-approve-referrer.ts \
  actions/referrals/admin-deny-referrer.ts \
  actions/features/request-feature-access.ts \
  actions/admin/send-mail-to-all/index.ts \
  actions/platform-admin/user-actions.ts \
  actions/platform-admin/organization-actions.ts \
  actions/social/share-via-email.ts \
  lib/calendar-reminders.ts \
  lib/notifications/email-service.ts
git commit -m "fix(email): replace all scattered EMAIL_FROM references with EMAIL_CONFIG.FROM"
```

---

### Task 5: Migrate `lib/sendmail.ts` from nodemailer to Resend

**Files:**
- Modify: `lib/sendmail.ts`

**Background:** `lib/sendmail.ts` wraps nodemailer. It is called in:
- `lib/new-user-notify.ts` — sends plain text notification
- `app/api/agent/[slug]/contact/route.ts` — sends HTML email to agent

Both callers pass `{ from, to, subject, text?, html? }`. We preserve that interface.

**Step 1: Replace the implementation**

Replace the entire contents of `lib/sendmail.ts` with:

```ts
import { Resend } from "resend";
import { EMAIL_CONFIG } from "./resend-segments";

interface EmailOptions {
  from?: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export default async function sendEmail(options: EmailOptions): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[sendEmail] RESEND_API_KEY not set, skipping email send");
    return;
  }

  const resend = new Resend(apiKey);

  try {
    await resend.emails.send({
      from: options.from || EMAIL_CONFIG.FROM,
      to: options.to,
      subject: options.subject,
      ...(options.html ? { html: options.html } : {}),
      ...(options.text ? { text: options.text } : {}),
    });
  } catch (error) {
    console.error("[sendEmail] Failed to send email:", error);
  }
}
```

**Step 2: Verify callers still compile**

```bash
pnpm tsc --noEmit 2>&1 | grep -E "sendmail|new-user-notify|contact/route" | head -20
```

Expected: no errors.

**Step 3: Commit**

```bash
git add lib/sendmail.ts
git commit -m "fix(email): replace nodemailer with Resend in sendmail.ts"
```

---

### Task 6: Update `.env.example`

**Files:**
- Modify: `.env.example`

**Step 1: Update the email section**

Find the `# ----- EMAIL (Resend) -----` section. It currently reads:

```
# ----- EMAIL (Resend) -----
RESEND_API_KEY="re_..."
EMAIL_FROM="noreply@yourdomain.com"
FEEDBACK_EMAIL="feedback@yourdomain.com"
```

Replace it with:

```
# ----- EMAIL (Resend) -----
# Verified sending domain: mail.oikion.com
# From address is hardcoded to: Oikion <noreply@mail.oikion.com>
# No EMAIL_FROM env var needed — address is fixed to the verified domain.
RESEND_API_KEY="re_..."
# Optional override for where feedback/admin emails are delivered (default: contact@oikion.com)
FEEDBACK_EMAIL="contact@oikion.com"
```

**Step 2: Remove SMTP vars** (they were used by the old nodemailer `lib/sendmail.ts`)

Search for and remove these lines if they exist in `.env.example`:
- `EMAIL_HOST=`
- `EMAIL_USERNAME=`
- `EMAIL_PASSWORD=`

(Check first with grep — they may not be present.)

```bash
grep -n "EMAIL_HOST\|EMAIL_USERNAME\|EMAIL_PASSWORD" /Users/stapo/Desktop/Oikion/MVP/.env.example
```

Remove any lines found.

**Step 3: Commit**

```bash
git add .env.example
git commit -m "docs(env): update email config comments, remove legacy SMTP vars"
```

---

### Task 7: Final verification

**Step 1: Run TypeScript check**

```bash
pnpm tsc --noEmit 2>&1 | head -50
```

Expected: 0 errors related to our changes.

**Step 2: Run lint**

```bash
pnpm lint 2>&1 | grep -E "error|warning" | grep -v node_modules | head -30
```

Expected: no new errors.

**Step 3: Confirm no remaining wrong addresses**

```bash
grep -r "mail@oikion.com\|EMAIL_FROM\|softbase" \
  --include="*.ts" --include="*.tsx" \
  --exclude-dir=node_modules --exclude-dir=.next \
  /Users/stapo/Desktop/Oikion/MVP
```

Expected: zero matches (or only comments/docs, not actual `from:` field values).

**Step 4: Final commit if any cleanup needed**

```bash
git add -p  # review and stage any remaining changes
git commit -m "chore(email): final cleanup of legacy email references"
```
