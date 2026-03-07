# Unsubscribe Feature Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a secure, HMAC-signed unsubscribe flow that removes contacts from both the local DB and Resend audiences in one click.

**Architecture:** Public landing page at `/unsubscribe?email=x&token=hmac` shows a confirm button after validating the HMAC token. On confirm, a POST to `/api/newsletter/unsubscribe` verifies the token again, marks the `NewsletterSubscriber` as `UNSUBSCRIBED` in the DB, and sets `unsubscribed: true` on the Resend contact in both audience segments. Email templates are updated to generate signed URLs.

**Tech Stack:** Next.js 16 (App Router), Resend SDK, Node.js `crypto` (HMAC-SHA256), Prisma, React, next-intl

---

## Task 1: Create HMAC token utility

**Files:**
- Create: `lib/unsubscribe-token.ts`

**Step 1: Create the token utility**

```typescript
import { createHmac, timingSafeEqual } from "crypto";

const HMAC_SECRET = process.env.CLERK_SECRET_KEY || "";

/**
 * Generate an HMAC-SHA256 token for an email address.
 * Used to sign unsubscribe links so they can't be forged.
 */
export function generateUnsubscribeToken(email: string): string {
  const normalized = email.toLowerCase().trim();
  return createHmac("sha256", HMAC_SECRET).update(normalized).digest("hex");
}

/**
 * Verify an HMAC token matches the expected value for an email.
 * Uses timing-safe comparison to prevent timing attacks.
 */
export function verifyUnsubscribeToken(
  email: string,
  token: string
): boolean {
  const normalized = email.toLowerCase().trim();
  const expected = createHmac("sha256", HMAC_SECRET)
    .update(normalized)
    .digest("hex");

  if (token.length !== expected.length) return false;

  return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

/**
 * Build a full unsubscribe URL with signed token.
 */
export function buildUnsubscribeUrl(email: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://oikion.com";
  const normalized = email.toLowerCase().trim();
  const token = generateUnsubscribeToken(normalized);
  return `${baseUrl}/unsubscribe?email=${encodeURIComponent(normalized)}&token=${token}`;
}
```

**Step 2: Commit**

```bash
git add lib/unsubscribe-token.ts
git commit -m "feat: add HMAC-signed unsubscribe token utility"
```

---

## Task 2: Create the unsubscribe API route

**Files:**
- Create: `app/api/newsletter/unsubscribe/route.ts`

**Step 1: Create the API handler**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { verifyUnsubscribeToken } from "@/lib/unsubscribe-token";
import { RESEND_SEGMENTS } from "@/lib/resend-segments";
import prismadb from "@/lib/prisma";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, token } = body;

    if (!email || !token) {
      return NextResponse.json(
        { error: "Missing email or token" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Verify HMAC token
    if (!verifyUnsubscribeToken(normalizedEmail, token)) {
      return NextResponse.json(
        { error: "Invalid unsubscribe token" },
        { status: 403 }
      );
    }

    // 1. Update local DB — mark as UNSUBSCRIBED in all orgs
    try {
      await prismadb.newsletterSubscriber.updateMany({
        where: { email: normalizedEmail },
        data: {
          status: "UNSUBSCRIBED",
          unsubscribedAt: new Date(),
        },
      });
    } catch (dbError) {
      // Subscriber might not exist in local DB (e.g. added directly via Resend)
      console.warn("[Unsubscribe] DB update skipped:", dbError);
    }

    // 2. Mark as unsubscribed in Resend across both audience segments
    if (resend) {
      const audienceIds = [
        RESEND_SEGMENTS.NEWSLETTER,
        RESEND_SEGMENTS.EARLY_ACCESS,
      ];

      await Promise.allSettled(
        audienceIds.map(async (audienceId) => {
          try {
            await resend.contacts.update({
              audienceId,
              id: normalizedEmail,
              unsubscribed: true,
            });
            console.log(
              `[Unsubscribe] Marked ${normalizedEmail} as unsubscribed in audience ${audienceId}`
            );
          } catch (err) {
            // Contact might not exist in this audience — that's fine
            console.warn(
              `[Unsubscribe] Could not update contact in audience ${audienceId}:`,
              err
            );
          }
        })
      );
    }

    console.log(`[Unsubscribe] Successfully unsubscribed ${normalizedEmail}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Unsubscribe] Error:", error);
    return NextResponse.json(
      { error: "Failed to process unsubscribe request" },
      { status: 500 }
    );
  }
}
```

**Step 2: Commit**

```bash
git add app/api/newsletter/unsubscribe/route.ts
git commit -m "feat: add unsubscribe API route with HMAC verification and Resend removal"
```

---

## Task 3: Create the unsubscribe landing page

**Files:**
- Create: `app/[locale]/(landing)/unsubscribe/page.tsx`

This is a public page (inside the `(landing)` route group — no auth required). It follows the same pattern as `legal/privacy-policy/page.tsx`: server component with `next-intl`, locale-aware params.

The page reads `email` and `token` from search params, verifies the token server-side, and renders either a confirm form or an "invalid link" message. The confirm button POSTs to the API route client-side.

**Step 1: Create the page**

```tsx
import { getTranslations } from "next-intl/server";
import { verifyUnsubscribeToken } from "@/lib/unsubscribe-token";
import { UnsubscribeForm } from "./unsubscribe-form";

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ email?: string; token?: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "website" });
  return {
    title: `${t("unsubscribe.title")} | Oikion`,
    robots: "noindex, nofollow",
  };
}

export default async function UnsubscribePage({
  params,
  searchParams,
}: PageProps) {
  const { locale } = await params;
  const { email, token } = await searchParams;
  const t = await getTranslations({ locale, namespace: "website" });

  const isValid = !!(email && token && verifyUnsubscribeToken(email, token));

  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground mb-4 font-gallery">
          {t("unsubscribe.title")}
        </h1>

        {isValid ? (
          <UnsubscribeForm
            email={email!}
            token={token!}
            confirmLabel={t("unsubscribe.confirm")}
            cancelLabel={t("unsubscribe.cancel")}
            description={t("unsubscribe.description")}
            successTitle={t("unsubscribe.successTitle")}
            successMessage={t("unsubscribe.successMessage")}
            errorMessage={t("unsubscribe.errorMessage")}
          />
        ) : (
          <div className="mt-6">
            <p className="text-muted-foreground">
              {t("unsubscribe.invalidLink")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Create the client-side form component**

Create `app/[locale]/(landing)/unsubscribe/unsubscribe-form.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface UnsubscribeFormProps {
  email: string;
  token: string;
  confirmLabel: string;
  cancelLabel: string;
  description: string;
  successTitle: string;
  successMessage: string;
  errorMessage: string;
}

export function UnsubscribeForm({
  email,
  token,
  confirmLabel,
  cancelLabel,
  description,
  successTitle,
  successMessage,
  errorMessage,
}: UnsubscribeFormProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function handleUnsubscribe() {
    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token }),
      });

      if (!res.ok) throw new Error("Request failed");

      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="mt-6 space-y-3">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-foreground">{successTitle}</h2>
        <p className="text-muted-foreground">{successMessage}</p>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      <p className="text-muted-foreground">{description}</p>
      <p className="text-sm text-muted-foreground font-mono bg-muted px-3 py-2 rounded-md">
        {email}
      </p>

      {status === "error" && (
        <p className="text-sm text-destructive">{errorMessage}</p>
      )}

      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
        <Button
          onClick={handleUnsubscribe}
          disabled={status === "loading"}
          variant="destructive"
        >
          {status === "loading" ? "..." : confirmLabel}
        </Button>
        <Button variant="outline" asChild>
          <Link href="/">{cancelLabel}</Link>
        </Button>
      </div>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add app/\[locale\]/\(landing\)/unsubscribe/
git commit -m "feat: add unsubscribe landing page with confirm button"
```

---

## Task 4: Add i18n translations

**Files:**
- Modify: `locales/en/website.json` — add `unsubscribe` namespace
- Modify: `locales/el/website.json` — add `unsubscribe` namespace

**Step 1: Add English translations**

Add under the `"unsubscribe"` key in `locales/en/website.json`:

```json
"unsubscribe": {
  "title": "Unsubscribe",
  "description": "You are about to unsubscribe from all Oikion emails. You will no longer receive newsletters or product updates.",
  "confirm": "Unsubscribe",
  "cancel": "Cancel",
  "successTitle": "You've been unsubscribed",
  "successMessage": "You will no longer receive emails from Oikion. If this was a mistake, you can re-subscribe at any time from our website.",
  "errorMessage": "Something went wrong. Please try again or contact support@oikion.com.",
  "invalidLink": "This unsubscribe link is invalid or has been tampered with. If you need help, contact support@oikion.com."
}
```

**Step 2: Add Greek translations**

Add under the `"unsubscribe"` key in `locales/el/website.json`:

```json
"unsubscribe": {
  "title": "Κατάργηση εγγραφής",
  "description": "Πρόκειται να καταργήσετε την εγγραφή σας από όλα τα email του Oikion. Δεν θα λαμβάνετε πλέον ενημερωτικά δελτία ή ενημερώσεις προϊόντων.",
  "confirm": "Κατάργηση εγγραφής",
  "cancel": "Ακύρωση",
  "successTitle": "Η εγγραφή σας καταργήθηκε",
  "successMessage": "Δεν θα λαμβάνετε πλέον email από το Oikion. Αν αυτό ήταν λάθος, μπορείτε να εγγραφείτε ξανά ανά πάσα στιγμή από τον ιστότοπό μας.",
  "errorMessage": "Κάτι πήγε στραβά. Δοκιμάστε ξανά ή επικοινωνήστε στο support@oikion.com.",
  "invalidLink": "Αυτός ο σύνδεσμος κατάργησης εγγραφής δεν είναι έγκυρος. Αν χρειάζεστε βοήθεια, επικοινωνήστε στο support@oikion.com."
}
```

**Step 3: Commit**

```bash
git add locales/en/website.json locales/el/website.json
git commit -m "feat: add unsubscribe i18n translations (en, el)"
```

---

## Task 5: Update email templates with signed unsubscribe URLs

**Files:**
- Modify: `emails/Welcome.tsx`
- Modify: `emails/admin/MessageToAllUser.tsx`

**Step 1: Update Welcome.tsx**

The `WelcomeEmail` component already receives `email` as a prop. Import `buildUnsubscribeUrl` and replace the hardcoded unsubscribe link.

Change line 139:
```tsx
// Before:
<Link href={`${baseUrl}/unsubscribe?email=${encodeURIComponent(email)}`} className="text-zinc-500 underline">

// After:
<Link href={unsubscribeUrl} className="text-zinc-500 underline">
```

Add at the top of the component body (after destructuring props):
```tsx
const unsubscribeUrl = buildUnsubscribeUrl(email);
```

And add the import:
```tsx
import { buildUnsubscribeUrl } from "@/lib/unsubscribe-token";
```

**Step 2: Update MessageToAllUser.tsx**

This template doesn't currently have an `email` prop. Add it to the interface and use `buildUnsubscribeUrl`.

Add `email` to `MessageToAllUsersEmailProps`:
```tsx
interface MessageToAllUsersEmailProps {
  username: string;
  title: string;
  message: string;
  email: string;
}
```

Add `email` to destructured props and compute the URL:
```tsx
const unsubscribeUrl = buildUnsubscribeUrl(email);
```

Replace line 117:
```tsx
// Before:
<Link href={`${baseUrl}/unsubscribe`} className="text-zinc-500 underline">

// After:
<Link href={unsubscribeUrl} className="text-zinc-500 underline">
```

**Step 3: Find and update all call sites passing email to MessageToAllUsers**

Search for `MessageToAllUsers` usage and add the `email` prop at each call site.

**Step 4: Commit**

```bash
git add emails/Welcome.tsx emails/admin/MessageToAllUser.tsx
git commit -m "feat: use HMAC-signed unsubscribe URLs in email templates"
```

---

## Task 6: Final verification

**Step 1: Run build**

```bash
pnpm build
```

Expected: Clean build with no errors.

**Step 2: Run lint**

```bash
pnpm lint
```

Expected: No new warnings or errors.

**Step 3: Manual test checklist**

- [ ] Visit `/unsubscribe` with no params → shows "invalid link"
- [ ] Visit `/unsubscribe?email=test@example.com` (no token) → shows "invalid link"
- [ ] Visit `/unsubscribe?email=test@example.com&token=bad` → shows "invalid link"
- [ ] Generate a valid token via the utility and visit the URL → shows confirm button
- [ ] Click confirm → shows success message
- [ ] Check Resend dashboard → contact marked as unsubscribed
- [ ] Click confirm again (idempotent) → still shows success

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete unsubscribe feature with HMAC-signed links"
```
