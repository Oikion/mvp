# Agent Style Quiz Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a BuzzFeed-style personality quiz on the landing page that profiles visitors into one of four agent archetypes and shows personalized Oikion benefits, replacing the How It Works CTA button.

**Architecture:** Pure client-side implementation — two components (`QuizSection` wrapper + `QuizCard` interactive logic), all content in i18n translation files, GSAP for animations, PostHog for analytics. No server logic, no API routes, no database.

**Tech Stack:** React 19, next-intl, GSAP + ScrollTrigger, PostHog (existing), Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-04-02-agent-style-quiz-design.md`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `locales/en/landing.json` | Modify | Add `nav.quiz`, `quiz.bridgeTeaser`, and full `quiz.*` translation block (EN) |
| `locales/el/landing.json` | Modify | Add matching Greek translations |
| `components/website/landing/quiz-section.tsx` | Create | Section wrapper: scroll-triggered entrance, header, dark bg |
| `components/website/landing/quiz-card.tsx` | Create | Interactive quiz: state machine, scoring, transitions, result display |
| `components/website/landing/index.ts` | Modify | Add `QuizSection` export |
| `components/website/landing/landing-page-client.tsx` | Modify | Insert `QuizSection` between HowItWorks and Team |
| `components/website/landing/landing-nav.tsx` | Modify | Add `'quiz'` to `NAV_SECTIONS` and `DARK_SECTIONS` |
| `components/website/landing/landing-footer.tsx` | Modify | Add `'quiz'` to footer nav links |
| `components/website/landing/how-it-works-section.tsx` | Modify | Replace CTA button with bridge teaser |

---

## Task 1: Add English Translation Keys

**Files:**
- Modify: `locales/en/landing.json` (insert between `howItWorks` block ending at line ~126 and `team` block at line ~127)

- [ ] **Step 1: Add `nav.quiz` key**

In `locales/en/landing.json`, add the quiz nav label to the `nav` object. After the existing `"team": "The Team"` line:

```json
"quiz": "Your Style",
```

The `nav` object will now have keys: problem, solution, how-it-works, quiz, team, contact, cta, ...

- [ ] **Step 2: Add `quiz.bridgeTeaser` key**

This key is used by the How It Works section bridge teaser. Add it at the start of the `quiz` block.

- [ ] **Step 3: Add the full `quiz` translation block**

Insert the following block after the `howItWorks` section closing `},` and before the `"team"` block. The complete block:

```json
"quiz": {
  "bridgeTeaser": "What type of agent are you?",
  "sectionLabel": "DISCOVER YOUR STYLE",
  "sectionTitle": "What type of agent are you?",
  "sectionSubtitle": "5 questions. 60 seconds. A personalized look at how Oikion fits your workflow.",
  "startButton": "Start Quiz",
  "progressLabel": "Question {current} of {total}",
  "questions": [
    {
      "text": "A new property just came in. What's the first thing you do?",
      "options": [
        { "text": "Check if anyone in your network has a matching buyer", "profile": "networker" },
        { "text": "Log it in your system, upload photos, update the file", "profile": "organizer" },
        { "text": "Check comparable prices and time-on-market data", "profile": "strategist" },
        { "text": "Start calling potential buyers while updating the listing", "profile": "allRounder" }
      ]
    },
    {
      "text": "What frustrates you most about your current workflow?",
      "options": [
        { "text": "I have no visibility into my pipeline or performance", "profile": "strategist" },
        { "text": "I'm doing sales, admin, marketing, and accounting all at once", "profile": "allRounder" },
        { "text": "I can't see what other agencies have available", "profile": "networker" },
        { "text": "I lose track of things — follow-ups slip, client details get lost", "profile": "organizer" }
      ]
    },
    {
      "text": "A colleague asks what makes you successful. You say:",
      "options": [
        { "text": "\"I wear every hat and still get it done.\"", "profile": "allRounder" },
        { "text": "\"I know everyone. My phone never stops ringing.\"", "profile": "networker" },
        { "text": "\"I never drop the ball. Every client, every detail, tracked.\"", "profile": "organizer" },
        { "text": "\"I read the market better than anyone.\"", "profile": "strategist" }
      ]
    },
    {
      "text": "You have one free hour. How do you use it?",
      "options": [
        { "text": "Organize your client files and catch up on follow-ups", "profile": "organizer" },
        { "text": "Review your numbers — what sold, what didn't, why", "profile": "strategist" },
        { "text": "Answer emails, schedule showings, update a listing", "profile": "allRounder" },
        { "text": "Coffee with another agent to discuss potential deals", "profile": "networker" }
      ]
    },
    {
      "text": "What would change your business the most?",
      "options": [
        { "text": "Seeing what buyers and sellers other agencies have", "profile": "networker" },
        { "text": "A dashboard showing my pipeline, revenue, and KPIs", "profile": "strategist" },
        { "text": "Knowing that every client, every property, every deadline is tracked and nothing falls through", "profile": "organizer" },
        { "text": "Getting back hours every week so I can focus on what actually grows my business", "profile": "allRounder" }
      ]
    }
  ],
  "result": {
    "label": "YOUR AGENT STYLE",
    "helpTitle": "How Oikion helps you",
    "cta": "Start Free",
    "retake": "Retake Quiz",
    "profiles": {
      "networker": {
        "title": "The Networker",
        "titleAlt": "Ο Δικτυωτής",
        "tagline": "Your network is your net worth.",
        "description": "You thrive on connections. While others search for buyers and sellers alone, you've built a web of relationships that surfaces opportunities before they hit the market. Your challenge isn't finding deals — it's finding the right tools to manage a growing network across agencies.",
        "metrics": [
          { "label": "Cross-Agency Visibility", "value": "Access listings from agencies across Greece" },
          { "label": "Instant Matching", "value": "Match mandates to properties in seconds, not weeks" },
          { "label": "Smart Alerts", "value": "Get notified when a mandate matches your listing — or vice versa" }
        ],
        "features": [
          "Polis cross-organization matching",
          "Sharing Hub with visibility controls",
          "Connection requests & agent discovery"
        ]
      },
      "organizer": {
        "title": "The Organizer",
        "titleAlt": "Ο Οργανωτής",
        "tagline": "Nothing falls through the cracks.",
        "description": "You're the person who always knows where the file is, which client needs a callback, and what's due this week. Your systems work — but they're held together with spreadsheets, WhatsApp threads, and memory. You need tools that match your discipline.",
        "metrics": [
          { "label": "Time Saved", "value": "~8 hours/week back from manual admin" },
          { "label": "Tool Consolidation", "value": "Replace spreadsheets, WhatsApp, and notebooks with one CRM" },
          { "label": "Data Migration", "value": "Import your entire client database in minutes" }
        ],
        "features": [
          "Full CRM with client & property management",
          "Calendar with event scheduling",
          "Document templates & management"
        ]
      },
      "strategist": {
        "title": "The Strategist",
        "titleAlt": "Ο Στρατηγικός",
        "tagline": "Data-driven decisions, not gut feelings.",
        "description": "You don't just close deals — you study them. You want to know your average days-on-market, your list-to-sale ratio, and which property types are moving. You're held back by the fact that your data lives in five different places and you can't see the full picture.",
        "metrics": [
          { "label": "Pipeline Visibility", "value": "Full mandate-to-close pipeline in one dashboard" },
          { "label": "Market Intelligence", "value": "Track days-on-market and sale prices across your portfolio" },
          { "label": "GCI Visibility", "value": "Track your commission on every deal" }
        ],
        "features": [
          "KPI dashboard (GCI, days-on-market, list-to-sale ratio)",
          "Deal pipeline with status tracking",
          "Mandate-property matching with scores"
        ]
      },
      "allRounder": {
        "title": "The All-Rounder",
        "titleAlt": "Ο Πολυπράγμων",
        "tagline": "One person. Every role. Zero excuses.",
        "description": "You're the agent, the admin, the marketer, and the accountant. You don't have the luxury of specialization — you need every tool to be in the same place so you can switch between roles without losing time. Your biggest enemy isn't competition — it's context-switching.",
        "metrics": [
          { "label": "Platform Consolidation", "value": "CRM, MLS, documents, calendar, and team feed — one login" },
          { "label": "Zero Context-Switching", "value": "Go from a client call to updating their listing in under a minute" },
          { "label": "End-to-End Workflow", "value": "From listing to matched buyer without leaving the platform" }
        ],
        "features": [
          "Unified platform (CRM + MLS + Calendar + Documents + Feed)",
          "Quick-add for properties and clients",
          "Bulk import to migrate from existing tools"
        ]
      }
    }
  }
},
```

Note: The options within each question are deliberately ordered differently (deterministic per-question shuffle) to prevent visitors from detecting a positional pattern.

- [ ] **Step 4: Validate JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('locales/en/landing.json', 'utf8')); console.log('Valid JSON')"`

Expected: `Valid JSON`

- [ ] **Step 5: Commit**

```bash
git add locales/en/landing.json
git commit -m "feat(quiz): add English translation keys for agent style quiz"
```

---

## Task 2: Add Greek Translation Keys

**Files:**
- Modify: `locales/el/landing.json` (same insertion point — between `howItWorks` and `team`)

- [ ] **Step 1: Add `nav.quiz` key to Greek nav object**

After `"team": "Η Ομάδα"`:

```json
"quiz": "Το Στυλ σου",
```

- [ ] **Step 2: Add the full Greek `quiz` translation block**

Insert after `howItWorks` closing `},` and before `"team"`. The complete block:

```json
"quiz": {
  "bridgeTeaser": "Ποιος τύπος μεσίτη είσαι;",
  "sectionLabel": "ΑΝΑΚΑΛΥΨΕ ΤΟ ΣΤΥΛ ΣΟΥ",
  "sectionTitle": "Ποιος τύπος μεσίτη είσαι;",
  "sectionSubtitle": "5 ερωτήσεις. 60 δευτερόλεπτα. Μια εξατομικευμένη ματιά στο πώς το Oikion ταιριάζει στη ροή εργασίας σου.",
  "startButton": "Ξεκίνα το Quiz",
  "progressLabel": "Ερώτηση {current} από {total}",
  "questions": [
    {
      "text": "Μόλις ήρθε ένα νέο ακίνητο. Τι κάνεις πρώτα;",
      "options": [
        { "text": "Τσεκάρεις αν κάποιος στο δίκτυό σου έχει αντίστοιχο αγοραστή", "profile": "networker" },
        { "text": "Το καταχωρείς στο σύστημα, ανεβάζεις φωτογραφίες, ενημερώνεις το αρχείο", "profile": "organizer" },
        { "text": "Ελέγχεις συγκρίσιμες τιμές και χρόνο παραμονής στην αγορά", "profile": "strategist" },
        { "text": "Αρχίζεις να παίρνεις τηλέφωνα ενώ ενημερώνεις την καταχώρηση", "profile": "allRounder" }
      ]
    },
    {
      "text": "Τι σε απογοητεύει περισσότερο στην τρέχουσα ροή εργασίας σου;",
      "options": [
        { "text": "Δεν έχω ορατότητα στο pipeline ή στην απόδοσή μου", "profile": "strategist" },
        { "text": "Κάνω πωλήσεις, διαχείριση, marketing και λογιστικά ταυτόχρονα", "profile": "allRounder" },
        { "text": "Δεν μπορώ να δω τι έχουν διαθέσιμο άλλα γραφεία", "profile": "networker" },
        { "text": "Χάνω πράγματα — follow-ups ξεφεύγουν, στοιχεία πελατών χάνονται", "profile": "organizer" }
      ]
    },
    {
      "text": "Ένας συνάδελφος ρωτάει τι σε κάνει επιτυχημένο. Απαντάς:",
      "options": [
        { "text": "\"Φοράω κάθε καπέλο και τα καταφέρνω.\"", "profile": "allRounder" },
        { "text": "\"Γνωρίζω τους πάντες. Το τηλέφωνό μου δεν σταματάει να χτυπάει.\"", "profile": "networker" },
        { "text": "\"Δεν μου πέφτει τίποτα. Κάθε πελάτης, κάθε λεπτομέρεια, καταγεγραμμένα.\"", "profile": "organizer" },
        { "text": "\"Διαβάζω την αγορά καλύτερα από οποιονδήποτε.\"", "profile": "strategist" }
      ]
    },
    {
      "text": "Έχεις μία ελεύθερη ώρα. Πώς τη χρησιμοποιείς;",
      "options": [
        { "text": "Οργανώνεις τα αρχεία πελατών και κάνεις catch up στα follow-ups", "profile": "organizer" },
        { "text": "Εξετάζεις τα νούμερά σου — τι πουλήθηκε, τι όχι, γιατί", "profile": "strategist" },
        { "text": "Απαντάς emails, προγραμματίζεις επισκέψεις, ενημερώνεις μια καταχώρηση", "profile": "allRounder" },
        { "text": "Καφές με έναν συνάδελφο για πιθανές συμφωνίες", "profile": "networker" }
      ]
    },
    {
      "text": "Τι θα άλλαζε περισσότερο τη δουλειά σου;",
      "options": [
        { "text": "Να βλέπεις τι αγοραστές και πωλητές έχουν άλλα γραφεία", "profile": "networker" },
        { "text": "Ένα dashboard που δείχνει pipeline, έσοδα και KPIs", "profile": "strategist" },
        { "text": "Να ξέρεις ότι κάθε πελάτης, ακίνητο και προθεσμία παρακολουθείται — τίποτα δεν ξεφεύγει", "profile": "organizer" },
        { "text": "Να κερδίζεις ώρες κάθε βδομάδα για να εστιάσεις σε αυτό που μεγαλώνει τη δουλειά σου", "profile": "allRounder" }
      ]
    }
  ],
  "result": {
    "label": "ΤΟ ΣΤΥΛ ΣΟΥ",
    "helpTitle": "Πώς σε βοηθάει το Oikion",
    "cta": "Ξεκίνα Δωρεάν",
    "retake": "Ξανακάνε το Quiz",
    "profiles": {
      "networker": {
        "title": "Ο Δικτυωτής",
        "titleAlt": "The Networker",
        "tagline": "Το δίκτυό σου είναι η αξία σου.",
        "description": "Ευδοκιμείς μέσα από τις σχέσεις. Ενώ άλλοι ψάχνουν μόνοι τους αγοραστές και πωλητές, εσύ έχεις χτίσει ένα δίκτυο που φέρνει ευκαιρίες πριν βγουν στην αγορά. Η πρόκλησή σου δεν είναι να βρεις συμφωνίες — είναι να βρεις τα σωστά εργαλεία για ένα δίκτυο που μεγαλώνει.",
        "metrics": [
          { "label": "Ορατότητα Μεταξύ Γραφείων", "value": "Πρόσβαση σε καταχωρήσεις από γραφεία σε όλη την Ελλάδα" },
          { "label": "Άμεση Αντιστοίχιση", "value": "Αντιστοίχιση εντολών με ακίνητα σε δευτερόλεπτα, όχι εβδομάδες" },
          { "label": "Έξυπνες Ειδοποιήσεις", "value": "Ειδοποίηση όταν μια εντολή ταιριάζει με την καταχώρησή σου — ή το αντίστροφο" }
        ],
        "features": [
          "Αντιστοίχιση μεταξύ γραφείων μέσω Polis",
          "Sharing Hub με ελέγχους ορατότητας",
          "Αιτήματα σύνδεσης & ανακάλυψη μεσιτών"
        ]
      },
      "organizer": {
        "title": "Ο Οργανωτής",
        "titleAlt": "The Organizer",
        "tagline": "Τίποτα δεν πέφτει στο κενό.",
        "description": "Είσαι αυτός που πάντα ξέρει πού είναι το αρχείο, ποιος πελάτης χρειάζεται callback και τι λήγει αυτή τη βδομάδα. Τα συστήματά σου δουλεύουν — αλλά κρατιούνται με spreadsheets, WhatsApp threads και μνήμη. Χρειάζεσαι εργαλεία που να ταιριάζουν στη πειθαρχία σου.",
        "metrics": [
          { "label": "Εξοικονόμηση Χρόνου", "value": "~8 ώρες/εβδομάδα πίσω από χειροκίνητη διαχείριση" },
          { "label": "Ενοποίηση Εργαλείων", "value": "Αντικατάστασε spreadsheets, WhatsApp και σημειωματάρια με ένα CRM" },
          { "label": "Μεταφορά Δεδομένων", "value": "Εισαγωγή ολόκληρης της βάσης πελατών σου σε λεπτά" }
        ],
        "features": [
          "Πλήρες CRM διαχείρισης πελατών & ακινήτων",
          "Ημερολόγιο με προγραμματισμό εκδηλώσεων",
          "Πρότυπα εγγράφων & διαχείριση"
        ]
      },
      "strategist": {
        "title": "Ο Στρατηγικός",
        "titleAlt": "The Strategist",
        "tagline": "Αποφάσεις βασισμένες σε δεδομένα, όχι σε ένστικτο.",
        "description": "Δεν κλείνεις απλά συμφωνίες — τις μελετάς. Θέλεις να ξέρεις τον μέσο χρόνο στην αγορά, το list-to-sale ratio σου και ποιοι τύποι ακινήτων κινούνται. Σε κρατάει πίσω το γεγονός ότι τα δεδομένα σου ζουν σε πέντε διαφορετικά μέρη.",
        "metrics": [
          { "label": "Ορατότητα Pipeline", "value": "Πλήρες pipeline από εντολή μέχρι κλείσιμο σε ένα dashboard" },
          { "label": "Ευφυΐα Αγοράς", "value": "Παρακολούθηση ημερών στην αγορά και τιμών πώλησης στο χαρτοφυλάκιό σου" },
          { "label": "Ορατότητα GCI", "value": "Παρακολούθηση προμήθειας σε κάθε συμφωνία" }
        ],
        "features": [
          "Dashboard KPIs (GCI, ημέρες στην αγορά, list-to-sale ratio)",
          "Pipeline συμφωνιών με παρακολούθηση κατάστασης",
          "Αντιστοίχιση εντολών-ακινήτων με βαθμολογία"
        ]
      },
      "allRounder": {
        "title": "Ο Πολυπράγμων",
        "titleAlt": "The All-Rounder",
        "tagline": "Ένα άτομο. Κάθε ρόλος. Καμία δικαιολογία.",
        "description": "Είσαι ο μεσίτης, ο διαχειριστής, ο marketer και ο λογιστής. Δεν έχεις την πολυτέλεια της εξειδίκευσης — χρειάζεσαι κάθε εργαλείο στο ίδιο μέρος για να αλλάζεις ρόλους χωρίς να χάνεις χρόνο. Ο μεγαλύτερος εχθρός σου δεν είναι ο ανταγωνισμός — είναι το context-switching.",
        "metrics": [
          { "label": "Ενοποίηση Πλατφόρμας", "value": "CRM, MLS, έγγραφα, ημερολόγιο και team feed — ένα login" },
          { "label": "Μηδέν Context-Switching", "value": "Από κλήση πελάτη σε ενημέρωση καταχώρησης σε λιγότερο από ένα λεπτό" },
          { "label": "End-to-End Ροή", "value": "Από καταχώρηση σε αντιστοιχισμένο αγοραστή χωρίς να φύγεις από την πλατφόρμα" }
        ],
        "features": [
          "Ενοποιημένη πλατφόρμα (CRM + MLS + Ημερολόγιο + Έγγραφα + Feed)",
          "Γρήγορη προσθήκη ακινήτων και πελατών",
          "Μαζική εισαγωγή για μετάβαση από υπάρχοντα εργαλεία"
        ]
      }
    }
  }
},
```

Note: Option order within each question matches the English file's deterministic shuffle — same position-to-profile mapping per question in both locales.

- [ ] **Step 3: Validate JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('locales/el/landing.json', 'utf8')); console.log('Valid JSON')"`

Expected: `Valid JSON`

- [ ] **Step 4: Commit**

```bash
git add locales/el/landing.json
git commit -m "feat(quiz): add Greek translation keys for agent style quiz"
```

---

## Task 3: Create QuizCard Component

**Files:**
- Create: `components/website/landing/quiz-card.tsx`

- [ ] **Step 1: Create the QuizCard component**

Create `components/website/landing/quiz-card.tsx` with the full interactive quiz logic:

```tsx
'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Check, RotateCcw } from 'lucide-react'
import gsap from 'gsap'
import posthog from 'posthog-js'

type ProfileKey = 'networker' | 'organizer' | 'strategist' | 'allRounder'

const PROFILE_KEYS: ProfileKey[] = ['networker', 'organizer', 'strategist', 'allRounder']
const TOTAL_QUESTIONS = 5

function computeResult(answers: ProfileKey[]): ProfileKey {
  const scores: Record<ProfileKey, number> = {
    networker: 0, organizer: 0, strategist: 0, allRounder: 0,
  }
  answers.forEach(a => scores[a]++)

  // Tiebreaker priority: networker > strategist > organizer > allRounder
  const priority: ProfileKey[] = ['networker', 'strategist', 'organizer', 'allRounder']
  return priority.reduce((best, key) =>
    scores[key] > scores[best] ? key : best
  , priority[0])
}

type Step = 'intro' | number | 'result'

export function QuizCard() {
  const [step, setStep] = useState<Step>('intro')
  const [answers, setAnswers] = useState<ProfileKey[]>([])
  const [result, setResult] = useState<ProfileKey | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const t = useTranslations('landing')
  const locale = useLocale()

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const animateTransition = useCallback((direction: 'forward' | 'backward', onComplete: () => void) => {
    if (prefersReducedMotion || !contentRef.current) {
      onComplete()
      return
    }

    const xOut = direction === 'forward' ? -40 : 40
    const xIn = direction === 'forward' ? 40 : -40

    gsap.to(contentRef.current, {
      x: xOut,
      opacity: 0,
      duration: 0.125,
      ease: 'power2.in',
      onComplete: () => {
        onComplete()
        gsap.fromTo(contentRef.current, { x: xIn, opacity: 0 }, {
          x: 0,
          opacity: 1,
          duration: 0.125,
          ease: 'power2.out',
        })
      },
    })
  }, [prefersReducedMotion])

  const handleStart = useCallback(() => {
    posthog.capture('quiz_started')
    animateTransition('forward', () => setStep(0))
  }, [animateTransition])

  const handleAnswer = useCallback((profile: ProfileKey) => {
    const newAnswers = [...answers, profile]
    setAnswers(newAnswers)

    const currentQuestion = step as number

    if (currentQuestion >= TOTAL_QUESTIONS - 1) {
      // Last question — compute and show result
      const resultProfile = computeResult(newAnswers)
      setResult(resultProfile)
      animateTransition('forward', () => setStep('result'))
      posthog.capture('quiz_completed', { profile: resultProfile })
    } else {
      animateTransition('forward', () => setStep(currentQuestion + 1))
    }
  }, [answers, step, animateTransition])

  const handleRetake = useCallback(() => {
    posthog.capture('quiz_retaken')
    setAnswers([])
    setResult(null)
    animateTransition('backward', () => setStep('intro'))
  }, [animateTransition])

  // Focus management: move focus to content on step change
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.focus({ preventScroll: true })
    }
  }, [step])

  // Render: Intro
  if (step === 'intro') {
    return (
      <div ref={cardRef} className="max-w-[640px] mx-auto">
        <div
          ref={contentRef}
          tabIndex={-1}
          className="text-center outline-none"
          aria-live="polite"
        >
          <p className="text-[15px] text-white/50 leading-[1.7] mb-8">
            {t('quiz.sectionSubtitle')}
          </p>
          <button
            onClick={handleStart}
            data-magnetic
            className="inline-flex items-center px-8 py-4 bg-[#7B8C7C] text-white rounded-[5px] text-[14px] font-semibold tracking-[0.02em] hover:bg-[#8a9d8b] transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7B8C7C]"
          >
            {t('quiz.startButton')}
          </button>
        </div>
      </div>
    )
  }

  // Render: Question
  if (typeof step === 'number') {
    const questionIndex = step
    const progress = ((questionIndex + 1) / TOTAL_QUESTIONS) * 100
    const options = t.raw(`quiz.questions.${questionIndex}.options`) as Array<{
      text: string
      profile: ProfileKey
    }>

    return (
      <div ref={cardRef} className="max-w-[640px] mx-auto">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-medium tracking-[0.06em] uppercase text-white/40">
              {t('quiz.progressLabel', { current: questionIndex + 1, total: TOTAL_QUESTIONS })}
            </span>
          </div>
          <div className="w-full h-[3px] bg-white/[0.08] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#7B8C7C] rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
              role="progressbar"
              aria-valuenow={questionIndex + 1}
              aria-valuemin={1}
              aria-valuemax={TOTAL_QUESTIONS}
            />
          </div>
        </div>

        <div
          ref={contentRef}
          tabIndex={-1}
          className="outline-none"
          aria-live="polite"
        >
          {/* Question text */}
          <h3
            id={`quiz-question-${questionIndex}`}
            className="text-[clamp(20px,2.5vw,28px)] font-light text-white leading-[1.3] mb-8"
          >
            {t(`quiz.questions.${questionIndex}.text`)}
          </h3>

          {/* Option buttons */}
          <div
            className="grid grid-cols-1 md:grid-cols-2 gap-3"
            role="group"
            aria-labelledby={`quiz-question-${questionIndex}`}
          >
            {options.map((option, i) => (
              <button
                key={`${questionIndex}-${i}`}
                onClick={() => handleAnswer(option.profile as ProfileKey)}
                className="
                  min-h-[72px] p-5 rounded-xl text-left
                  bg-white/[0.03] border border-white/[0.06]
                  text-[14px] text-white/70 leading-[1.5]
                  transition-all duration-200
                  hover:bg-white/[0.08] hover:border-[#7B8C7C]/30 hover:text-white/90
                  focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7B8C7C]
                  active:scale-[0.98]
                "
              >
                {option.text}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Render: Result
  if (step === 'result' && result) {
    const profile = result
    const metrics = t.raw(`quiz.result.profiles.${profile}.metrics`) as Array<{
      label: string
      value: string
    }>
    const features = t.raw(`quiz.result.profiles.${profile}.features`) as string[]

    return (
      <div ref={cardRef} className="max-w-[700px] mx-auto">
        <div
          ref={contentRef}
          tabIndex={-1}
          className="outline-none"
          aria-live="polite"
        >
          {/* Result label */}
          <p className="text-[11px] font-medium tracking-[0.1em] uppercase text-[#7B8C7C] mb-6 text-center">
            {t('quiz.result.label')}
          </p>

          {/* Profile title */}
          <div className="text-center mb-2">
            <h3 className="text-[clamp(28px,3vw,40px)] font-light text-white leading-[1.15] tracking-[-0.01em]">
              {t(`quiz.result.profiles.${profile}.title`)}
            </h3>
            <p className="text-[15px] text-white/30 mt-1">
              {t(`quiz.result.profiles.${profile}.titleAlt`)}
            </p>
          </div>

          {/* Tagline */}
          <p className="text-[16px] text-[#7B8C7C] italic text-center mb-6">
            &ldquo;{t(`quiz.result.profiles.${profile}.tagline`)}&rdquo;
          </p>

          {/* Description */}
          <p className="text-[14px] text-white/50 leading-[1.7] text-center max-w-[560px] mx-auto mb-10">
            {t(`quiz.result.profiles.${profile}.description`)}
          </p>

          {/* Metrics grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
            {metrics.map((metric, i) => (
              <div
                key={i}
                className="p-5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center"
              >
                <p className="text-[13px] text-white/80 leading-[1.5] mb-2">
                  {metric.value}
                </p>
                <p className="text-[10px] font-medium tracking-[0.06em] uppercase text-[#7B8C7C]/70">
                  {metric.label}
                </p>
              </div>
            ))}
          </div>

          {/* Features */}
          <div className="mb-10">
            <h4 className="text-[12px] font-medium tracking-[0.06em] uppercase text-white/40 mb-4 text-center">
              {t('quiz.result.helpTitle')}
            </h4>
            <div className="flex flex-col gap-3 max-w-[440px] mx-auto">
              {features.map((feature, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-[#7B8C7C] mt-0.5 shrink-0" aria-hidden="true" />
                  <span className="text-[14px] text-white/60 leading-[1.5]">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="flex flex-col items-center gap-4">
            <a
              href={`/${locale}/app/register`}
              data-magnetic
              className="inline-flex items-center px-8 py-4 bg-[#7B8C7C] text-white rounded-[5px] text-[14px] font-semibold tracking-[0.02em] hover:bg-[#8a9d8b] transition-colors duration-200 no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7B8C7C]"
            >
              {t('quiz.result.cta')}
            </a>

            <button
              onClick={handleRetake}
              className="inline-flex items-center gap-2 text-[13px] text-white/40 hover:text-white/70 transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7B8C7C]"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              {t('quiz.result.retake')}
            </button>
          </div>

          {/* All profiles row */}
          <div className="flex items-center justify-center gap-6 mt-10 pt-8 border-t border-white/[0.06]">
            {PROFILE_KEYS.map(key => (
              <span
                key={key}
                className={`text-[11px] tracking-[0.04em] transition-colors duration-200 ${
                  key === profile
                    ? 'text-[#7B8C7C] font-medium'
                    : 'text-white/20'
                }`}
              >
                {t(`quiz.result.profiles.${key}.title`)}
              </span>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return null
}
```

- [ ] **Step 2: Commit**

```bash
git add components/website/landing/quiz-card.tsx
git commit -m "feat(quiz): create QuizCard interactive component with scoring and PostHog tracking"
```

---

## Task 4: Create QuizSection Wrapper

**Files:**
- Create: `components/website/landing/quiz-section.tsx`
- Modify: `components/website/landing/index.ts`

- [ ] **Step 1: Create the QuizSection component**

Create `components/website/landing/quiz-section.tsx`:

```tsx
'use client'

import { useRef } from 'react'
import { useTranslations } from 'next-intl'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { QuizCard } from './quiz-card'

gsap.registerPlugin(ScrollTrigger, useGSAP)

export function QuizSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const t = useTranslations('landing')

  useGSAP(() => {
    if (globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const ctx = gsap.context(() => {
      // Header reveal
      gsap.fromTo(
        '.quiz-header > *',
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.12,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 70%',
            once: true,
          },
        }
      )

      // Quiz card reveal
      gsap.fromTo(
        '.quiz-card-wrapper',
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          delay: 0.2,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: '.quiz-card-wrapper',
            start: 'top 85%',
            once: true,
          },
        }
      )
    }, sectionRef)

    return () => ctx.revert()
  }, { scope: sectionRef })

  return (
    <section
      ref={sectionRef}
      id="quiz"
      className="relative py-24 md:py-32 px-5 md:px-[52px] bg-[#262F27]"
      aria-labelledby="quiz-title"
    >
      <div className="max-w-[1200px] mx-auto">
        {/* Header */}
        <div className="quiz-header mb-16 md:mb-20 text-center">
          <p className="text-[11px] font-medium tracking-[0.1em] uppercase text-[#7B8C7C] mb-4">
            {t('quiz.sectionLabel')}
          </p>
          <h2
            id="quiz-title"
            className="text-[clamp(28px,3vw,44px)] font-light leading-[1.15] text-white tracking-[-0.01em] mb-5"
          >
            {t('quiz.sectionTitle')}
          </h2>
        </div>

        {/* Quiz card */}
        <div className="quiz-card-wrapper">
          <QuizCard />
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Add export to index.ts**

In `components/website/landing/index.ts`, add after the `TeamSection` export line:

```typescript
export { QuizSection } from './quiz-section'
```

- [ ] **Step 3: Commit**

```bash
git add components/website/landing/quiz-section.tsx components/website/landing/index.ts
git commit -m "feat(quiz): create QuizSection wrapper with GSAP scroll-triggered animations"
```

---

## Task 5: Integrate Quiz Into Landing Page

**Files:**
- Modify: `components/website/landing/landing-page-client.tsx`
- Modify: `components/website/landing/landing-nav.tsx`
- Modify: `components/website/landing/landing-footer.tsx`

- [ ] **Step 1: Add QuizSection dynamic import to landing-page-client.tsx**

In `components/website/landing/landing-page-client.tsx`, add the dynamic import alongside the other lazy-loaded sections (after the `TeamSection` dynamic import around line 23-26):

```typescript
const QuizSection = dynamic(
  () => import('./quiz-section').then(m => m.QuizSection),
  { ssr: true }
)
```

- [ ] **Step 2: Insert QuizSection between HowItWorksSection and TeamSection**

In the JSX, place `<QuizSection />` between `<HowItWorksSection />` and `<TeamSection />`:

```tsx
            <HowItWorksSection />
            <QuizSection />
            <TeamSection />
```

- [ ] **Step 3: Add 'quiz' to NAV_SECTIONS and DARK_SECTIONS in landing-nav.tsx**

In `components/website/landing/landing-nav.tsx`:

Update `NAV_SECTIONS` (around line 14) to include `'quiz'` between `'how-it-works'` and `'team'`:

```typescript
const NAV_SECTIONS = ['problem', 'solution', 'how-it-works', 'quiz', 'team', 'contact'] as const
```

Update `DARK_SECTIONS` (around line 32) to include `'quiz'`:

```typescript
const DARK_SECTIONS = ['hero', 'solution', 'quiz', 'team']
```

- [ ] **Step 4: Add 'quiz' to footer nav links in landing-footer.tsx**

In `components/website/landing/landing-footer.tsx`, update the footer nav array (around line 39) to include `'quiz'` between `'how-it-works'` and `'team'`:

```typescript
{['problem', 'solution', 'how-it-works', 'quiz', 'team', 'contact'].map(id => (
```

- [ ] **Step 5: Commit**

```bash
git add components/website/landing/landing-page-client.tsx components/website/landing/landing-nav.tsx components/website/landing/landing-footer.tsx
git commit -m "feat(quiz): integrate QuizSection into landing page, nav, and footer"
```

---

## Task 6: Replace How It Works CTA With Bridge Teaser

**Files:**
- Modify: `components/website/landing/how-it-works-section.tsx`

- [ ] **Step 1: Replace the CTA button with bridge teaser**

In `components/website/landing/how-it-works-section.tsx`, replace the CTA block at lines 189-198:

Replace this:
```tsx
        {/* CTA — centered below the grid */}
        <div className="flex justify-center" style={{ paddingTop: '64px' }}>
          <a
            href={`/${locale}/app/register`}
            data-magnetic
            className="inline-flex items-center px-8 py-4 bg-[#262F27] text-white rounded-[5px] text-[14px] font-semibold tracking-[0.02em] hover:bg-[#1a1f1b] transition-colors duration-200 no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7B8C7C]"
          >
            {t('howItWorks.cta')}
          </a>
        </div>
```

With this:
```tsx
        {/* Bridge teaser — leads into quiz section */}
        <div className="flex flex-col items-center gap-4" style={{ paddingTop: '64px' }}>
          <a
            href="#quiz"
            className="text-[clamp(18px,2vw,24px)] font-light text-[#262F27]/60 hover:text-[#262F27]/90 transition-colors duration-200 no-underline text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7B8C7C]"
          >
            {t('quiz.bridgeTeaser')}
          </a>
          <div className="animate-bounce motion-reduce:animate-none" aria-hidden="true">
            <svg width="20" height="12" viewBox="0 0 20 12" fill="none" className="text-[#7B8C7C]/40">
              <path d="M1 1L10 10L19 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
```

- [ ] **Step 2: Commit**

```bash
git add components/website/landing/how-it-works-section.tsx
git commit -m "feat(quiz): replace How It Works CTA button with bridge teaser to quiz section"
```

---

## Task 7: Verify Build and Test

**Files:** None (verification only)

- [ ] **Step 1: Run the linter**

Run: `pnpm lint`

Expected: No new errors from the quiz files. If there are warnings about `posthog` being an unresolved import, that's fine — it's initialized via the PostHogProvider at the app level.

- [ ] **Step 2: Run the build**

Run: `pnpm build`

Expected: Build succeeds with no errors. Watch for:
- Missing translation keys (would show as build warnings)
- TypeScript errors in the new components
- Import resolution issues

- [ ] **Step 3: Verify JSON validity of both locale files**

Run: `node -e "JSON.parse(require('fs').readFileSync('locales/en/landing.json', 'utf8')); JSON.parse(require('fs').readFileSync('locales/el/landing.json', 'utf8')); console.log('Both locale files valid')"`

Expected: `Both locale files valid`

- [ ] **Step 4: Commit any lint/build fixes if needed**

If lint or build surfaced issues, fix them and commit:

```bash
git add -A
git commit -m "fix(quiz): address lint/build issues from quiz integration"
```
