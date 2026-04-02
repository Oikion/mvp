# Agent Style Quiz — Design Spec

**Date:** 2026-04-02
**Status:** Approved
**Scope:** Landing page interactive quiz replacing the How It Works CTA button

---

## Overview

A BuzzFeed-style personality quiz embedded in the landing page that profiles visitors into one of four agent archetypes and shows them personalized Oikion benefits grounded in real product features and defensible market data. The quiz replaces the "Create Account" CTA button at the end of the How It Works section with a higher-conversion interactive experience.

## Goals

1. **Increase engagement** — break the passive scroll pattern with an interactive moment
2. **Gather market insights** — PostHog tracking reveals how agents self-identify (profile distribution)
3. **Improve conversion** — the account CTA appears after a personalized result, the highest-intent moment on the page

## Non-Goals

- No server-side logic, no API routes, no database
- No authentication or user data collection
- No dynamic/calculated metrics — all content is static and translatable

---

## Section Placement & Narrative Flow

```
Hero → Problem → Solution → How It Works → **Quiz** → Team → Contact
```

The How It Works section's "Δημιούργησε Λογαριασμό" CTA button is replaced with a bridge teaser — a text prompt rendered via `useTranslations('landing')` using the key `quiz.bridgeTeaser` (English: "What type of agent are you?", Greek: "Ποιος τύπος μεσίτη είσαι;"). Only the active locale is displayed, consistent with every other section on the page. The teaser includes a subtle downward chevron/arrow animation pointing to `#quiz`, uses the section's existing typography scale, and sits centered where the CTA button was. The account creation CTA moves to the quiz result screen.

The quiz section uses `bg-[#262F27]` (dark), creating a continuous dark block through to the Team section. It is registered in `DARK_SECTIONS` in the landing nav for correct navbar theming.

---

## Profiles

Four agent archetypes, each mapping to a distinct work style and a distinct set of Oikion capabilities:

### 1. The Networker / Ο Δικτυωτής

> *"Your network is your net worth."*

You thrive on connections. While others search for buyers and sellers alone, you've built a web of relationships that surfaces opportunities before they hit the market. Your challenge isn't finding deals — it's finding the right tools to manage a growing network across agencies.

**Metrics:**

| Label | Value | Grounding |
|---|---|---|
| Cross-Agency Visibility | Access listings from agencies across Greece | Polis network — actual feature |
| Instant Matching | Match mandates to properties in seconds, not weeks | Matchmaking engine — actual feature |
| Smart Alerts | Get notified when a mandate matches your listing — or vice versa | Matchmaking notifications — actual feature |

**Featured capabilities:**
1. Polis cross-organization matching
2. Sharing Hub with visibility controls
3. Connection requests & agent discovery

### 2. The Organizer / Ο Οργανωτής

> *"Nothing falls through the cracks."*

You're the person who always knows where the file is, which client needs a callback, and what's due this week. Your systems work — but they're held together with spreadsheets, WhatsApp threads, and memory. You need tools that match your discipline.

**Metrics:**

| Label | Value | Grounding |
|---|---|---|
| Time Saved | ~8 hours/week back from manual admin | Derived from CEPI survey "11 hrs/week on admin" (conservative subset) |
| Tool Consolidation | Replace spreadsheets, WhatsApp, and notebooks with one CRM | Landing page Problem section reference |
| Data Migration | Import your entire client database in minutes | Bulk CSV import — actual feature |

**Featured capabilities:**
1. Full CRM with client & property management
2. Calendar with event scheduling
3. Document templates & management

### 3. The Strategist / Ο Στρατηγικός

> *"Data-driven decisions, not gut feelings."*

You don't just close deals — you study them. You want to know your average days-on-market, your list-to-sale ratio, and which property types are moving. You're held back by the fact that your data lives in five different places and you can't see the full picture.

**Metrics:**

| Label | Value | Grounding |
|---|---|---|
| Pipeline Visibility | Full mandate-to-close pipeline in one dashboard | Deal pipeline + KPI dashboard — actual features |
| Market Intelligence | Track days-on-market and sale prices across your portfolio | Reports page KPIs — actual features |
| GCI Visibility | Track your commission on every deal | Commission tracking — actual feature |

**Featured capabilities:**
1. KPI dashboard (GCI, days-on-market, list-to-sale ratio)
2. Deal pipeline with status tracking
3. Mandate-property matching with scores

### 4. The All-Rounder / Ο Πολυπράγμων

> *"One person. Every role. Zero excuses."*

You're the agent, the admin, the marketer, and the accountant. You don't have the luxury of specialization — you need every tool to be in the same place so you can switch between roles without losing time. Your biggest enemy isn't competition — it's context-switching.

**Metrics:**

| Label | Value | Grounding |
|---|---|---|
| Platform Consolidation | CRM, MLS, documents, calendar, and team feed — one login | Actual module list |
| Zero Context-Switching | Go from a client call to updating their listing in under a minute | Unified platform — actual capability |
| End-to-End Workflow | From listing to matched buyer without leaving the platform | Full workflow capability |

**Featured capabilities:**
1. Unified platform (CRM + MLS + Calendar + Documents + Feed)
2. Quick-add for properties and clients
3. Bulk import to migrate from existing tools

---

## Quiz Questions

5 questions, 4 options each. Each question approaches profile differentiation from a different psychological angle. Option order is deterministically shuffled per question (defined in translation files) to prevent visitors from detecting a positional pattern.

### Question Design Framework

| # | Angle | Purpose |
|---|---|---|
| Q1 | Action | Instinctive behavior — what you do first |
| Q2 | Pain point | What frustrates you most |
| Q3 | Identity | How you see yourself |
| Q4 | Priorities | How you allocate scarce time |
| Q5 | Aspiration | What would change your business most |

### Q1: "A new property just came in. What's the first thing you do?"

- Check if anyone in your network has a matching buyer → **Networker**
- Log it in your system, upload photos, update the file → **Organizer**
- Check comparable prices and time-on-market data → **Strategist**
- Start calling potential buyers while updating the listing → **All-Rounder**

### Q2: "What frustrates you most about your current workflow?"

- I can't see what other agencies have available → **Networker**
- I lose track of things — follow-ups slip, client details get lost → **Organizer**
- I have no visibility into my pipeline or performance → **Strategist**
- I'm doing sales, admin, marketing, and accounting all at once → **All-Rounder**

### Q3: "A colleague asks what makes you successful. You say:"

- "I know everyone. My phone never stops ringing." → **Networker**
- "I never drop the ball. Every client, every detail, tracked." → **Organizer**
- "I read the market better than anyone." → **Strategist**
- "I wear every hat and still get it done." → **All-Rounder**

### Q4: "You have one free hour. How do you use it?"

- Coffee with another agent to discuss potential deals → **Networker**
- Organize your client files and catch up on follow-ups → **Organizer**
- Review your numbers — what sold, what didn't, why → **Strategist**
- Answer emails, schedule showings, update a listing → **All-Rounder**

### Q5: "What would change your business the most?"

- Seeing what buyers and sellers other agencies have → **Networker**
- Knowing that every client, every property, every deadline is tracked and nothing falls through → **Organizer**
- A dashboard showing my pipeline, revenue, and KPIs → **Strategist**
- Getting back hours every week so I can focus on what actually grows my business → **All-Rounder**

---

## Scoring

Each option maps to one profile. Selecting it adds +1 to that profile's score. After 5 questions, the profile with the highest score wins.

**Tiebreaker priority:** Networker > Strategist > Organizer > All-Rounder (biased toward Oikion's most differentiated features).

```typescript
type ProfileKey = 'networker' | 'organizer' | 'strategist' | 'allRounder'

function computeResult(answers: ProfileKey[]): ProfileKey {
  const scores: Record<ProfileKey, number> = {
    networker: 0, organizer: 0, strategist: 0, allRounder: 0
  }
  answers.forEach(a => scores[a]++)

  const priority: ProfileKey[] = ['networker', 'strategist', 'organizer', 'allRounder']
  return priority.reduce((best, key) =>
    scores[key] > scores[best] ? key : best
  , priority[0])
}
```

---

## Interaction Design

### Quiz Flow

```
INTRO → Q1 → Q2 → Q3 → Q4 → Q5 → RESULT
```

### Intro State

A brief prompt with section header and "Start Quiz" button. Creates an explicit opt-in moment — everyone who starts has actively chosen to engage.

### Question States (Q1-Q5)

- **Progress bar** at top: thin line in `#7B8C7C`, animates width from 20% to 100%
- **"Question X of 5"** label
- **Question text** prominently displayed
- **4 option buttons**: equal height containers (accommodate longest option), stacked vertically on mobile, 2×2 grid on desktop
- **Transition on click**: GSAP horizontal slide — current question exits left, next enters from right. 250ms, `power2.inOut` easing. Snappy, not theatrical.

### Result State

- Profile title + alternate-language title (via `title` / `titleAlt` i18n pattern)
- Tagline in accent color (`#7B8C7C`)
- Description paragraph
- 3 metrics in responsive grid (3-col desktop, stacked mobile)
- "How Oikion Helps You" section with 3 checkmark features
- CTA button: "Start Free" / "Ξεκίνα Δωρεάν" → links to `/${locale}/app/register`
- "Retake Quiz" text link (resets to intro state)
- Subtle 4-profile row at bottom: all profile names shown, visitor's result highlighted. Creates curiosity and legitimacy.

---

## Component Architecture

### File Structure

```
components/website/landing/
├── quiz-section.tsx          # Section wrapper, GSAP scroll reveal, header
├── quiz-card.tsx             # Interactive quiz: state, transitions, scoring, result
└── index.ts                  # Add QuizSection export
```

### QuizSection (section wrapper)

- `<section id="quiz">` with GSAP `ScrollTrigger` entrance animation
- Background: `bg-[#262F27]` (dark)
- Contains section header (label, title, subtitle) and `<QuizCard />`
- Follows existing section component pattern (see `team-section.tsx`, `contact-section.tsx`)

### QuizCard (interactive logic)

- `'use client'` component
- State: `step` (`'intro' | 0 | 1 | 2 | 3 | 4 | 'result'`), `answers` array, `result` profile key
- All content from `useTranslations('landing')` — zero hardcoded strings
- GSAP for horizontal slide transitions between steps
- `posthog.capture('quiz_completed', { profile: result })` on result render

---

## Integration Points

| Target | Change |
|---|---|
| `landing-page-client.tsx` | Add `QuizSection` between `HowItWorksSection` and `TeamSection` (dynamic import, `ssr: true`) |
| `landing-nav.tsx` | Add `'quiz'` to `NAV_SECTIONS` and `DARK_SECTIONS` |
| `landing-footer.tsx` | Add `'quiz'` to footer nav links array |
| `how-it-works-section.tsx` | Replace CTA button with bridge teaser text + scroll cue to `#quiz` |
| `locales/en/landing.json` | Add `nav.quiz` and `quiz.*` keys |
| `locales/el/landing.json` | Add `nav.quiz` and `quiz.*` keys (Greek translations) |

---

## Translation Key Structure

```
quiz.sectionLabel          — "DISCOVER YOUR STYLE"
quiz.sectionTitle          — "What type of agent are you?"
quiz.sectionSubtitle       — "5 questions. 60 seconds. A personalized look at how Oikion fits your workflow."
quiz.startButton           — "Start Quiz"
quiz.progressLabel         — "Question {current} of {total}" (ICU format)
quiz.questions[0-4].text   — question stem
quiz.questions[0-4].options[0-3].text    — option display text
quiz.questions[0-4].options[0-3].profile — scoring key (not displayed)
quiz.result.label          — "YOUR AGENT STYLE"
quiz.result.helpTitle      — "How Oikion helps you"
quiz.result.cta            — "Start Free"
quiz.result.retake         — "Retake Quiz"
quiz.result.profiles.{key}.title      — profile name (primary locale)
quiz.result.profiles.{key}.titleAlt   — profile name (alternate locale)
quiz.result.profiles.{key}.tagline    — one-liner
quiz.result.profiles.{key}.description — 2-3 sentence description
quiz.result.profiles.{key}.metrics[0-2].value — metric display text
quiz.result.profiles.{key}.metrics[0-2].label — metric label
quiz.result.profiles.{key}.features[0-2]      — capability description
```

Option order in the `options` arrays is deterministically varied per question to prevent positional pattern detection. The `profile` field is used for scoring only and is never displayed to the visitor.

---

## Metric Guardrails

Every metric on the result screen must pass this test:

> **"With Oikion, you can..."** — if the metric completes this sentence, it's a capability claim (valid). If it instead completes "Did you know that the Greek market...", it's a market pain stat and belongs in the Problem section, not the result screen.

All metrics trace to:
1. Actual Oikion features (verifiable in the product)
2. Data already cited on the landing page (Bank of Greece, CEPI, Eurostat, Hellenic Property Federation)
3. Conservative derivations from those sources (e.g., ~8 hrs/week from 11 hrs/week total)

---

## Analytics

**PostHog event on quiz completion:**

```typescript
// On "Start Quiz" button click
posthog.capture('quiz_started')

// On result render
posthog.capture('quiz_completed', {
  profile: result,  // 'networker' | 'organizer' | 'strategist' | 'allRounder'
})

// On retake
posthog.capture('quiz_retaken')
```

No additional dependencies — PostHog is already initialized in the app. This provides:
- Quiz start rate (section view → quiz start)
- Quiz completion rate and drop-off (quiz start → quiz complete)
- Profile distribution across visitors
- Retake rate (engagement signal)
- Conversion rate by profile (quiz complete → account creation)

---

## Visual Design

- **Palette**: Inherits landing page earth tones — `#262F27` (bg), `#7B8C7C` (accent), `#F2EFE9` / `#E8E2D9` (light elements on dark bg), white text with opacity variants
- **Typography**: Consistent with landing page — `clamp()` responsive headings, `tracking-[0.1em]` uppercase labels, `font-light` for body
- **Cards**: `bg-white/[0.03]` with `border-white/[0.06]` (matches team section cards)
- **Option buttons**: Equal height, generous padding, hover state (`bg-white/[0.06]`), clear active/selected state
- **Progress bar**: Thin (`2-3px`), `#7B8C7C` fill, smooth width animation
- **Result card**: Centered, max-width constrained, with breathing room above the CTA
- **Animations**: GSAP — scroll-triggered section entrance, horizontal slide between questions (250ms, `power2.inOut`), result card scale-up reveal
- **Motion**: Respects `prefers-reduced-motion` — skip transitions, show content immediately

---

## UI Constraint

Q5 option (b) runs longer than other options. Option button containers must use a fixed height that accommodates the longest option in each question. This ensures visual balance across all four options regardless of text length.

---

## Accessibility

- `role="group"` on option button sets with `aria-labelledby` pointing to question text
- `aria-live="polite"` on the quiz card container for screen reader announcements on step change
- All option buttons are `<button>` elements (not divs), keyboard navigable
- Progress communicated via `aria-valuenow` / `aria-valuemax` on progress bar
- Focus management: focus moves to question text on each transition
- Result section: semantic heading hierarchy (h2 for profile title, h3 for subsections)
- Touch targets: minimum 44×44px on all interactive elements
- Color contrast: all text meets WCAG AA (4.5:1 on dark backgrounds)
- `prefers-reduced-motion`: all GSAP transitions (slide, scale-up, scroll-triggered reveals) must be skipped when reduced motion is preferred — show content immediately with no animation (see Visual Design section)
