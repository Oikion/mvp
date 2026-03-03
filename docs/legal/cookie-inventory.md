# Oikion Cookie Inventory & User Flow

**Document Version:** 1.0  
**Last Updated:** March 2026  
**Purpose:** Technical documentation of all cookies collected by Oikion, mapped to user flow stages. Use for legal cookie policy, GDPR compliance, and consent management.

---

## User Flow Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  1. LANDING / PUBLIC         2. LOCALE            3. APP ACCESS GATE        │
│  /, /el, /en, /legal/*        (next-intl)         /app/access               │
│  /agent/*, /property/*        NEXT_LOCALE         oik_access (if enabled)   │
│  Clerk: __session, __client_uat                                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  4. SIGN-IN / REGISTER        5. AUTHENTICATED APP   6. FEATURE-SPECIFIC    │
│  /app/sign-in, /app/register  Dashboard, CRM, MLS    /app/emails             │
│  Clerk session established    sidebar_state         react-resizable-panels   │
│                               (when user toggles)   (layout/collapsed)       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Essential Cookies

### 1.1 Clerk Authentication (`@clerk/nextjs`)

| Cookie Name     | Domain      | Set When                         | User Flow Stage      | Purpose                              |
|-----------------|-------------|----------------------------------|----------------------|--------------------------------------|
| `__session`     | `.clerk.com`| First Clerk API request (sign-in)| Sign-in, Register    | Session JWT for authenticated requests |
| `__client_uat`  | `.clerk.com`| First Clerk API request          | Sign-in, Register    | Client last-activity timestamp      |

**Technical details:**
- Set by Clerk when users interact with sign-in, register, or any Clerk-backed request
- HttpOnly where applicable; SameSite=Lax
- Required for authentication; cannot be disabled
- **Reference:** [Clerk Cookies Documentation](https://clerk.com/docs/guides/how-clerk-works/cookies)

**User flow stage:** Set on first visit to Clerk-enabled routes (e.g. `/app/sign-in`, `/app/register`) or when Clerk middleware processes a request.

---

### 1.2 Cloudflare (via Clerk)

| Cookie Name | Domain                          | Set When              | User Flow Stage | Purpose           |
|-------------|---------------------------------|-----------------------|-----------------|-------------------|
| `_cfuvid`   | `.clerk.com`, `.dashboard.clerk.com` | Cloudflare infrastructure | Any Clerk request | Cloudflare session |

**User flow stage:** Set when traffic passes through Cloudflare (Clerk infrastructure).

---

### 1.3 Oikion App Access Gate (`lib/app-access.ts`)

| Cookie Name | Domain | Set When                          | User Flow Stage | Purpose                     |
|-------------|--------|-----------------------------------|-----------------|-----------------------------|
| `oik_access`| Same   | User submits correct 6-digit code | App access gate | Proves access was granted   |

**Technical details:**
- HttpOnly: yes
- Secure: yes (production)
- SameSite: strict
- MaxAge: 30 days (2,592,000 seconds)
- Path: /
- **Source:** `app/api/app-access/verify/route.ts`
- Only set when `APP_ACCESS_CODE` and `APP_ACCESS_COOKIE_SECRET` env vars are configured

**User flow stage:** Set when user enters the correct access code at `/{locale}/app/access` before reaching sign-in. Verified in `proxy.ts` before any app route (including sign-in).

---

## 2. Functional Cookies

### 2.1 next-intl (Language/Locale)

| Cookie Name   | Domain | Set When                               | User Flow Stage | Purpose                 |
|---------------|--------|----------------------------------------|-----------------|-------------------------|
| `NEXT_LOCALE` | Same   | User visits locale-prefixed URL or switches locale | Landing, any page | Remember language (el/en) |

**Technical details:**
- Set by next-intl middleware when locale differs from `Accept-Language` or user switches language
- SameSite: Lax (default)
- **Source:** `proxy.ts` copies cookies from `intlMiddleware(req)`

**User flow stage:** Set on first visit to `/` (redirect to `/el` or `/en`) or when user changes locale via language switcher.

---

### 2.2 Sidebar State (`components/ui/sidebar.tsx`)

| Cookie Name     | Domain | Set When                   | User Flow Stage | Purpose              |
|-----------------|--------|----------------------------|-----------------|----------------------|
| `sidebar_state` | Same   | User toggles sidebar open/closed | Authenticated app | Persist sidebar state |

**Technical details:**
- MaxAge: 7 days (604,800 seconds)
- Path: /
- **Source:** `components/ui/sidebar.tsx` line 93

**User flow stage:** Set when user expands or collapses the main app sidebar (Dashboard, CRM, MLS, etc.) or Platform Admin sidebar. Only applies to authenticated app layout.

---

### 2.3 react-resizable-panels (Email Layout)

| Cookie Name                       | Domain | Set When                      | User Flow Stage | Purpose              |
|----------------------------------|--------|-------------------------------|-----------------|----------------------|
| `react-resizable-panels:layout`  | Same   | User resizes email panel      | Emails page     | Panel size ratios    |
| `react-resizable-panels:collapsed`| Same  | User collapses/expands nav panel | Emails page     | Nav collapsed state  |

**Technical details:**
- **Source:** `app/[locale]/app/(routes)/emails/components/mail.tsx` lines 62, 76, 82
- Read server-side: `app/[locale]/app/(routes)/emails/page.tsx` lines 22–24

**User flow stage:** Set only when user visits `/app/emails` and resizes the layout or toggles the navigation panel collapse state.

---

## 3. Analytics Cookies

### 3.1 PostHog (`posthog-js` client SDK)

| Cookie Name  | Domain            | Set When                | User Flow Stage | Purpose                          |
|--------------|-------------------|-------------------------|-----------------|----------------------------------|
| `ph_posthog` | Same / eu.i.posthog.com | PostHog client loads | Any page with PostHog | distinct_id, session, feature flags |

**Technical details:**
- Default persistence: `localStorage+cookie`; cookie used for cross-subdomain identification
- Default expiry: 365 days
- **Note:** `posthog-js` is in dependencies; client-side init is optional. Server-side `posthog-node` does not set cookies. Cookie is set only when PostHog client SDK is initialized in the browser (e.g. via `PostHogProvider`).

**User flow stage:** When enabled, set on first page load that runs the PostHog client.

---

## 4. Third-Party / Conditional Cookies

### 4.1 Facebook SDK (WhatsApp Integration)

| Cookie Name | Domain     | Set When              | User Flow Stage | Purpose              |
|-------------|------------|------------------------|-----------------|----------------------|
| Various     | facebook.com | User visits Messages → WhatsApp flow | Messages / Integrations | Facebook session, tracking |

**Technical details:**
- **Source:** `app/[locale]/app/(routes)/messages/components/integrations/WhatsAppConnectionFlow.tsx` line 65 — `cookie: true` in FB.init()
- Only set when user enters the WhatsApp connection flow and Facebook SDK loads

**User flow stage:** Set when user configures WhatsApp integration in `/app/messages` → Integrations.

---

## 5. LocalStorage (Similar Technologies)

Not cookies but stored in the browser; include in policy as "similar technologies."

| Key             | Source                    | Set When             | User Flow Stage | Purpose                 |
|-----------------|---------------------------|----------------------|-----------------|-------------------------|
| `oikion-theme`  | next-themes (`ThemeProvider`) | User selects theme   | Any page        | Theme (light/dark/pearl-sand/twilight-lavender) |

**Technical details:**
- **Source:** `app/providers/ThemeProvider.tsx` — `storageKey={THEME_STORAGE_KEY}`

---

## 6. Summary Table by User Flow Stage

| Stage                    | Routes / Context                 | Cookies Set                                                |
|--------------------------|----------------------------------|------------------------------------------------------------|
| Landing / Public         | /, /el, /en, /legal/*, /agent/* | NEXT_LOCALE (if locale set)                                |
| App Access Gate          | /app/access                      | oik_access (on successful code entry)                     |
| Sign-in / Register       | /app/sign-in, /app/register      | __session, __client_uat, _cfuvid                           |
| Authenticated App        | /app/* (dashboard, CRM, MLS…)   | sidebar_state (on toggle)                                  |
| Emails                   | /app/emails                      | react-resizable-panels:layout, react-resizable-panels:collapsed |
| Messages / WhatsApp      | /app/messages → Integrations     | Facebook cookies (when SDK loads)                          |
| Any (if PostHog client)  | Any                              | ph_posthog                                                 |

---

## 7. Cookie Categories for Legal Policy

| Category   | Cookies                                                                 | Consent Required |
|------------|-------------------------------------------------------------------------|------------------|
| Essential  | __session, __client_uat, _cfuvid, oik_access                            | No (strictly necessary) |
| Functional | NEXT_LOCALE, sidebar_state, react-resizable-panels:layout, react-resizable-panels:collapsed | Typically no (preference) |
| Analytics  | ph_posthog                                                              | Yes (if PostHog client used) |
| Marketing  | Facebook cookies (WhatsApp flow)                                        | Yes                             |

---

## 8. Implementation References

| Cookie / Storage   | File(s)                                                                 |
|--------------------|-------------------------------------------------------------------------|
| oik_access         | `lib/app-access.ts`, `app/api/app-access/verify/route.ts`, `proxy.ts`   |
| NEXT_LOCALE        | `proxy.ts` (intlMiddleware)                                             |
| sidebar_state      | `components/ui/sidebar.tsx`                                             |
| react-resizable-panels | `app/[locale]/app/(routes)/emails/components/mail.tsx`, `.../emails/page.tsx` |
| oikion-theme       | `app/providers/ThemeProvider.tsx`                                       |
| Clerk / Cloudflare | Clerk SDK (external)                                                     |
| Facebook           | `messages/components/integrations/WhatsAppConnectionFlow.tsx`           |

---

## 9. Maintenance

- **When adding new cookies:** Add to this document with name, source file, user flow stage, and category.
- **When removing packages:** Remove or mark deprecated in this inventory.
- **Consent:** Ensure analytics and marketing cookies (PostHog, Facebook) are gated by user consent before loading.
