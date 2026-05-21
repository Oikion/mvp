export interface TourStep {
  /** CSS selector for the highlighted element. Omit for full-screen steps. */
  readonly element?: string;
  readonly popover: {
    readonly title: string;
    readonly description: string;
    readonly side?: "top" | "bottom" | "left" | "right";
  };
}

/**
 * Steps where the user must complete an action before Next is enabled.
 * 0-indexed — matches the array index in getTourSteps().
 *
 * Step 2 (import-upload-zone) requires uploading a file before Next unlocks.
 * Step 3 (import-execute-btn) is intentionally excluded: TourController
 * auto-advances after the demo guard intercepts the import click.
 * Steps 1, 4, 6 (nav links) are NOT action-required — clicking Next on those
 * steps programmatically navigates to the target page via onNextClick in TourController.
 */
export const ACTION_REQUIRED_STEPS = [2] as const;

/**
 * Real-user tour has no action-required steps — all steps advance via Next.
 * Forcing the user to click nav links while the Driver.js overlay is active
 * locks the screen and leaves them with a Next button that silently does nothing.
 */
export const REAL_USER_ACTION_REQUIRED_STEPS: readonly number[] = [];

// ─── Demo-mode tour ───────────────────────────────────────────────────────────
// 8 steps: Welcome → Import → Upload → Execute → Matchmaking → Results → Network → Done
// Steps 1, 2, 4, 6 are action-required (user must interact before Next is enabled).

const stepsEl: TourStep[] = [
  // Step 0 — Welcome (full-screen, no element)
  {
    popover: {
      title: "Καλωσόρισες στο Oikion",
      description: "Ο demo χώρος σου έχει ήδη 20 επαφές, 18 ακίνητα, 6 αιτήματα και 30+ ραντεβού. Σε 8 βήματα θα εισάγεις δεδομένα, θα δεις αυτόματες αντιστοιχίσεις και θα εξερευνήσεις το επαγγελματικό σου δίκτυο.",
    },
  },
  // Step 1 — Import nav (Next navigates to import page)
  {
    element: "[data-tour='import-nav']",
    popover: {
      title: "Εισαγωγή δεδομένων",
      description: "Μεταφέρεις επαφές και ακίνητα από CSV σε λίγα δευτερόλεπτα. Κάνε κλικ Next → για να ανοίξεις τη σελίδα εισαγωγής.",
      side: "right",
    },
  },
  // Step 2 — Upload zone (ACTION: upload a file)
  {
    element: "[data-tour='import-upload-zone']",
    popover: {
      title: "Ανέβασε το αρχείο σου",
      description: "Κάνε κλικ μέσα στη ζώνη για να επιλέξεις ένα CSV. Τα δεδομένα δεν αποθηκεύονται στο demo.",
      side: "top",
    },
  },
  // Step 3 — Execute (not action-required — auto-advances after demo guard intercepts click)
  {
    element: "[data-tour='import-execute-btn']",
    popover: {
      title: "Εκτέλεση εισαγωγής",
      description: "Κάνε κλικ για εκκίνηση. Στο demo, τα αποτελέσματα είναι άμεσα και προσομοιωμένα.",
      side: "top",
    },
  },
  // Step 4 — Matchmaking nav (Next navigates to matchmaking page)
  {
    element: "[data-tour='matchmaking-nav']",
    popover: {
      title: "Αυτόματες αντιστοιχίσεις",
      description: "Η πλατφόρμα αντιστοιχεί ακίνητα με αιτήματα χωρίς χειροκίνητη αναζήτηση. Κάνε κλικ Next → για να δεις τις αντιστοιχίσεις σου.",
      side: "right",
    },
  },
  // Step 5 — Matchmaking results (observational)
  {
    element: "[data-tour='matchmaking-results']",
    popover: {
      title: "Αντιστοιχίες με score",
      description: "Κάθε ζεύγος βαθμολογείται αυτόματα 0–100 βάσει τοποθεσίας, τιμής, μεγέθους και κριτηρίων. Μηδέν χειροκίνητη δουλειά.",
      side: "top",
    },
  },
  // Step 6 — Network nav (Next navigates to network feed)
  {
    element: "[data-tour='network-nav']",
    popover: {
      title: "Επαγγελματικό δίκτυο",
      description: "Σύνδεσε με άλλα γραφεία, μοιράσου ακίνητα και ολοκλήρωσε συναλλαγές μαζί. Κάνε κλικ Next → για να εξερευνήσεις.",
      side: "right",
    },
  },
  // Step 7 — Completion (full-screen, no element)
  {
    popover: {
      title: "Είσαι έτοιμος!",
      description: "Εξερεύνησε τον demo χώρο σου ελεύθερα ή δημιούργησε τον πραγματικό σου οργανισμό για να ξεκινήσεις.",
    },
  },
];

const stepsEn: TourStep[] = [
  // Step 0 — Welcome (full-screen, no element)
  {
    popover: {
      title: "Welcome to Oikion",
      description: "Your demo workspace already has 20 contacts, 18 properties, 6 requests, and 30+ calendar events. In 8 steps you'll import data, see automatic matches, and explore your professional network.",
    },
  },
  // Step 1 — Import nav (Next navigates to import page)
  {
    element: "[data-tour='import-nav']",
    popover: {
      title: "Import your data",
      description: "Transfer contacts and properties from a CSV in seconds. Click Next → to open the import page.",
      side: "right",
    },
  },
  // Step 2 — Upload zone (ACTION: upload a file)
  {
    element: "[data-tour='import-upload-zone']",
    popover: {
      title: "Upload your file",
      description: "Click inside the zone to open the file browser and pick a CSV. Nothing is saved in the demo.",
      side: "top",
    },
  },
  // Step 3 — Execute (not action-required — auto-advances after demo guard intercepts click)
  {
    element: "[data-tour='import-execute-btn']",
    popover: {
      title: "Run the import",
      description: "Click to start. In the demo, results are instant and simulated.",
      side: "top",
    },
  },
  // Step 4 — Matchmaking nav (Next navigates to matchmaking page)
  {
    element: "[data-tour='matchmaking-nav']",
    popover: {
      title: "Automatic matching",
      description: "The platform scores every property against every client request — no manual searching. Click Next → to see your matches.",
      side: "right",
    },
  },
  // Step 5 — Matchmaking results (observational)
  {
    element: "[data-tour='matchmaking-results']",
    popover: {
      title: "Scored matches",
      description: "Every pair is scored 0–100 automatically based on location, price, size, and criteria. Zero manual work.",
      side: "top",
    },
  },
  // Step 6 — Network nav (Next navigates to network feed)
  {
    element: "[data-tour='network-nav']",
    popover: {
      title: "Your professional network",
      description: "Connect with other agencies, share listings, and close deals together. Click Next → to explore.",
      side: "right",
    },
  },
  // Step 7 — Completion (full-screen, no element)
  {
    popover: {
      title: "You're all set!",
      description: "Explore your demo workspace freely, or create your real agency to get started.",
    },
  },
];

export function getTourSteps(locale: "el" | "en"): TourStep[] {
  return locale === "el" ? stepsEl : stepsEn;
}

// ─── Real-user onboarding tour (non-demo orgs) ───────────────────────────────
// All steps target sidebar elements that are always in the DOM — no navigation
// required. This prevents the screen-lock / Next-does-nothing problem caused
// by action-required steps that force the user to click a specific element
// while the Driver.js overlay blocks everything else.

const realUserStepsEl: TourStep[] = [
  // Step 0 — Welcome (full-screen)
  {
    popover: {
      title: "Καλωσόρισες στο Oikion",
      description: "Σε λίγα βήματα θα γνωρίσεις τα βασικά: εισαγωγή δεδομένων, αυτόματες αντιστοιχίσεις και το επαγγελματικό σου δίκτυο.",
    },
  },
  // Step 1 — Import nav
  {
    element: "[data-tour='import-nav']",
    popover: {
      title: "Εισαγωγή δεδομένων",
      description: "Εισήγαγε επαφές ή ακίνητα από CSV με ένα βήμα — το σύστημα αντιστοιχεί τα πεδία αυτόματα.",
      side: "right",
    },
  },
  // Step 2 — Matchmaking nav
  {
    element: "[data-tour='matchmaking-nav']",
    popover: {
      title: "Αυτόματες αντιστοιχίσεις",
      description: "Η πλατφόρμα βαθμολογεί κάθε ζεύγος ακινήτου–αιτήματος 0–100 αυτόματα. Μηδέν χειροκίνητη αναζήτηση.",
      side: "right",
    },
  },
  // Step 3 — Network nav
  {
    element: "[data-tour='network-nav']",
    popover: {
      title: "Επαγγελματικό δίκτυο",
      description: "Σύνδεσε με άλλα γραφεία, μοιράσου ακίνητα και ολοκλήρωσε συναλλαγές μαζί.",
      side: "right",
    },
  },
  // Step 4 — Quick search tip (full-screen)
  {
    popover: {
      title: "Γρήγορη αναζήτηση — ⌘K",
      description: "Πάτησε ⌘K (ή Ctrl+K) από οποιαδήποτε σελίδα για να αναζητήσεις ακίνητα, επαφές και έγγραφα άμεσα.",
    },
  },
  // Step 5 — Completion (full-screen)
  {
    popover: {
      title: "Έτοιμος να ξεκινήσεις!",
      description: "Μπορείς να επιστρέψεις σε αυτόν τον οδηγό οποιαδήποτε στιγμή από την πλευρική μπάρα.",
    },
  },
];

const realUserStepsEn: TourStep[] = [
  // Step 0 — Welcome (full-screen)
  {
    popover: {
      title: "Welcome to Oikion",
      description: "In a few steps you'll learn the essentials: importing data, automatic matching, and your professional network.",
    },
  },
  // Step 1 — Import nav
  {
    element: "[data-tour='import-nav']",
    popover: {
      title: "Import your data",
      description: "Bring in contacts or properties from a CSV in one step — fields are mapped automatically.",
      side: "right",
    },
  },
  // Step 2 — Matchmaking nav
  {
    element: "[data-tour='matchmaking-nav']",
    popover: {
      title: "Automatic matching",
      description: "The platform scores every property–request pair 0–100 automatically. No manual searching needed.",
      side: "right",
    },
  },
  // Step 3 — Network nav
  {
    element: "[data-tour='network-nav']",
    popover: {
      title: "Your professional network",
      description: "Connect with other agencies, share listings, and close deals together.",
      side: "right",
    },
  },
  // Step 4 — Quick search tip (full-screen)
  {
    popover: {
      title: "Quick search — ⌘K",
      description: "Press ⌘K (or Ctrl+K) from anywhere to search properties, contacts, and documents instantly.",
    },
  },
  // Step 5 — Completion (full-screen)
  {
    popover: {
      title: "You're all set!",
      description: "You can revisit this tour at any time from the sidebar.",
    },
  },
];

export function getRealUserTourSteps(locale: "el" | "en"): TourStep[] {
  return locale === "el" ? realUserStepsEl : realUserStepsEn;
}
