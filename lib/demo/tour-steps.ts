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
 * Step 9 (import-execute-btn) is intentionally excluded: TourController
 * auto-advances after the demo guard intercepts the import click.
 */
export const ACTION_REQUIRED_STEPS = [4, 5, 8] as const;

/**
 * Real-user tour steps that require a nav click before Next is enabled.
 * Steps 2, 4, 6 are the import-nav, network-nav, and matchmaking-nav steps.
 * Clicking the nav link auto-advances the tour (no separate Next click needed).
 */
export const REAL_USER_ACTION_REQUIRED_STEPS = [2, 4, 6] as const;

const stepsEl: TourStep[] = [
  // Chapter 1 — Orientation (steps 0–2, observational)
  {
    element: "[data-tour='sidebar-nav']",
    popover: {
      title: "Το κέντρο ελέγχου σου",
      description: "Από εδώ έχεις πρόσβαση σε CRM, MLS, μηνύματα και έγγραφα — όλα σε ένα μέρος.",
      side: "right",
    },
  },
  {
    element: "[data-tour='oikosync-feed']",
    popover: {
      title: "Ζωντανή ροή ομάδας",
      description: "Μηνύματα, ενημερώσεις, pin ακινήτων και αντιδράσεις εμφανίζονται εδώ σε πραγματικό χρόνο.",
      side: "right",
    },
  },
  {
    element: "[data-tour='first-message']",
    popover: {
      title: "Η ομάδα σου είναι ενεργή",
      description: "Ο demo χώρος εργασίας σου έχει ήδη δραστηριότητα. Κάνε κλικ σε οποιοδήποτε μήνυμα για να το ανοίξεις.",
      side: "top",
    },
  },
  // Chapter 2 — Editing & Linking (steps 3–6, mixed)
  {
    element: "[data-tour='crm-nav']",
    popover: {
      title: "Βάση επαφών σου",
      description: "Στο CRM βρίσκεις όλες τις επαφές, πελάτες και συνεργάτες σου, οργανωμένους και ασφαλισμένους.",
      side: "right",
    },
  },
  {
    // ACTION_REQUIRED_STEPS[0] — index 4
    element: "[data-tour='first-contact-row']",
    popover: {
      title: "Επαφές — κάνε κλικ για να ανοίξεις",
      description: "Κάθε επαφή αποθηκεύεται κρυπτογραφημένη. Κάνε κλικ σε αυτήν για να δεις τις λεπτομέρειες.",
      side: "top",
    },
  },
  {
    // ACTION_REQUIRED_STEPS[1] — index 5
    element: "[data-tour='contact-edit-btn']",
    popover: {
      title: "Επεξεργασία επαφής",
      description: "Κάνε κλικ στο Επεξεργασία για να τροποποιήσεις τα στοιχεία. Οι αλλαγές κρυπτογραφούνται αυτόματα.",
      side: "left",
    },
  },
  {
    element: "[data-tour='link-entity-btn']",
    popover: {
      title: "Σύνδεση οντοτήτων",
      description: "Συνδέεις επαφές με ακίνητα, αιτήματα ή συμφωνίες — δημιουργώντας ένα ολοκληρωμένο ιστορικό.",
      side: "left",
    },
  },
  // Chapter 3 — Importing (steps 7–9, mixed)
  {
    element: "[data-tour='import-nav']",
    popover: {
      title: "Μαζική εισαγωγή",
      description: "Εισάγεις επαφές ή ακίνητα από CSV με ένα βήμα — το σύστημα αντιστοιχεί τα πεδία αυτόματα.",
      side: "right",
    },
  },
  {
    // ACTION_REQUIRED_STEPS[2] — index 8
    element: "[data-tour='import-upload-zone']",
    popover: {
      title: "Ανέβασε το αρχείο σου",
      description: "Σύρε ένα CSV ή κάνε κλικ για να επιλέξεις αρχείο. Δοκίμασε τώρα — τα δεδομένα δεν θα αποθηκευτούν στον demo χώρο.",
      side: "top",
    },
  },
  {
    // index 9 — not action-required; TourController auto-advances after demo guard intercepts
    element: "[data-tour='import-execute-btn']",
    popover: {
      title: "Εκτέλεση εισαγωγής",
      description: "Κάνε κλικ για να ξεκινήσει η εισαγωγή. Στον demo χώρο, τα αποτελέσματα είναι προσομοιωμένα.",
      side: "top",
    },
  },
  // Chapter 4 — Create Org CTA (steps 10–11)
  {
    element: "[data-tour='demo-banner-cta']",
    popover: {
      title: "Έτοιμος να ξεκινήσεις;",
      description: "Όταν είσαι έτοιμος, δημιούργησε τον πραγματικό σου οργανισμό και εισήγαγε τα δεδομένα σου.",
      side: "bottom",
    },
  },
  {
    // index 11 — no element, full-screen completion overlay
    popover: {
      title: "Ολοκλήρωσες τον οδηγό!",
      description: "Τώρα μπορείς να εξερευνήσεις ελεύθερα τον demo χώρο σου ή να δημιουργήσεις τον πραγματικό σου οργανισμό.",
    },
  },
];

const stepsEn: TourStep[] = [
  // Chapter 1 — Orientation (steps 0–2, observational)
  {
    element: "[data-tour='sidebar-nav']",
    popover: {
      title: "Your command centre",
      description: "CRM, MLS, messages, and documents — everything in one place.",
      side: "right",
    },
  },
  {
    element: "[data-tour='oikosync-feed']",
    popover: {
      title: "Live team feed",
      description: "Messages, updates, property pins, and reactions appear here in real time.",
      side: "right",
    },
  },
  {
    element: "[data-tour='first-message']",
    popover: {
      title: "Your team is already active",
      description: "Your demo workspace has pre-loaded activity. Click any message to expand it.",
      side: "top",
    },
  },
  // Chapter 2 — Editing & Linking (steps 3–6, mixed)
  {
    element: "[data-tour='crm-nav']",
    popover: {
      title: "Your contact database",
      description: "All contacts, clients, and partners — organised and encrypted.",
      side: "right",
    },
  },
  {
    // ACTION_REQUIRED_STEPS[0] — index 4
    element: "[data-tour='first-contact-row']",
    popover: {
      title: "Contacts — click to open",
      description: "Each contact is stored encrypted. Click one to see their full profile.",
      side: "top",
    },
  },
  {
    // ACTION_REQUIRED_STEPS[1] — index 5
    element: "[data-tour='contact-edit-btn']",
    popover: {
      title: "Edit a contact",
      description: "Click Edit to update contact details. Changes are encrypted automatically.",
      side: "left",
    },
  },
  {
    element: "[data-tour='link-entity-btn']",
    popover: {
      title: "Link entities",
      description: "Connect contacts to properties, requests, or deals — building a complete activity history.",
      side: "left",
    },
  },
  // Chapter 3 — Importing (steps 7–9, mixed)
  {
    element: "[data-tour='import-nav']",
    popover: {
      title: "Bulk import",
      description: "Import contacts or properties from a CSV in one step — fields are mapped automatically.",
      side: "right",
    },
  },
  {
    // ACTION_REQUIRED_STEPS[2] — index 8
    element: "[data-tour='import-upload-zone']",
    popover: {
      title: "Upload your file",
      description: "Drag a CSV or click to choose a file. Try it now — data won't be saved in the demo.",
      side: "top",
    },
  },
  {
    // index 9 — not action-required; TourController auto-advances after demo guard intercepts
    element: "[data-tour='import-execute-btn']",
    popover: {
      title: "Run the import",
      description: "Click to start the import. In the demo, results are simulated.",
      side: "top",
    },
  },
  // Chapter 4 — Create Org CTA (steps 10–11)
  {
    element: "[data-tour='demo-banner-cta']",
    popover: {
      title: "Ready to start?",
      description: "When you're ready, create your real agency and import your actual data.",
      side: "bottom",
    },
  },
  {
    // index 11 — no element, full-screen completion overlay
    popover: {
      title: "Tour complete!",
      description: "You can now explore your demo workspace freely, or create your real agency to get started.",
    },
  },
];

export function getTourSteps(locale: "el" | "en"): TourStep[] {
  return locale === "el" ? stepsEl : stepsEn;
}

// ─── Real-user onboarding tour (non-demo orgs) ───────────────────────────────
// Covers: Navigation, Import, Network, Matchmaking (8 steps, no action gates)

const realUserStepsEl: TourStep[] = [
  // Chapter 1 — Navigation
  {
    element: "[data-tour='sidebar-nav']",
    popover: {
      title: "Η πλοήγησή σου",
      description: "Από εδώ έχεις πρόσβαση σε όλα: ακίνητα, επαφές, αιτήματα, συμφωνίες και δίκτυο — ένα μέρος για τα πάντα.",
      side: "right",
    },
  },
  {
    // No element — shows centered; describes CMD+K search
    popover: {
      title: "Γρήγορη αναζήτηση — ⌘K",
      description: "Πάτησε ⌘K (ή Ctrl+K) από οποιαδήποτε σελίδα για να αναζητήσεις ακίνητα, επαφές, έγγραφα και να πλοηγηθείς άμεσα.",
    },
  },
  // Chapter 2 — Import
  {
    element: "[data-tour='import-nav']",
    popover: {
      title: "Εισαγωγή δεδομένων",
      description: "Εισήγαγε επαφές ή ακίνητα από CSV με ένα βήμα — το σύστημα αντιστοιχεί τα πεδία αυτόματα. Κάνε κλικ για να συνεχίσεις.",
      side: "right",
    },
  },
  {
    element: "[data-tour='import-upload-zone']",
    popover: {
      title: "Ανέβασε το αρχείο σου",
      description: "Σύρε ένα CSV ή κάνε κλικ για να επιλέξεις αρχείο. Το σύστημα θα αντιστοιχίσει αυτόματα τις στήλες στα πεδία της πλατφόρμας.",
      side: "top",
    },
  },
  // Chapter 3 — Network
  {
    element: "[data-tour='network-nav']",
    popover: {
      title: "Επαγγελματικό δίκτυο",
      description: "Σύνδεσε με άλλους μεσίτες, μοιράσου ακίνητα και λάβε αιτήματα συνεργασίας. Κάνε κλικ για να εξερευνήσεις.",
      side: "right",
    },
  },
  {
    element: "[data-tour='network-feed']",
    popover: {
      title: "Ροή δικτύου",
      description: "Δες τι κάνουν οι συνεργάτες σου — δημοσιεύσεις ακινήτων, ανακοινώσεις και ενημερώσεις σε πραγματικό χρόνο.",
      side: "top",
    },
  },
  // Chapter 4 — Matchmaking
  {
    element: "[data-tour='matchmaking-nav']",
    popover: {
      title: "Αντιστοίχιση ακινήτων",
      description: "Η πλατφόρμα αντιστοιχεί αυτόματα τα ακίνητά σου με τα αιτήματα πελατών. Κάνε κλικ για να δεις τις προτάσεις.",
      side: "right",
    },
  },
  {
    // No element — full-screen completion
    popover: {
      title: "Έτοιμος να ξεκινήσεις!",
      description: "Έχεις εξερευνήσει τα βασικά της πλατφόρμας. Μπορείς να επιστρέψεις σε αυτόν τον οδηγό οποιαδήποτε στιγμή από την πλευρική μπάρα.",
    },
  },
];

const realUserStepsEn: TourStep[] = [
  // Chapter 1 — Navigation
  {
    element: "[data-tour='sidebar-nav']",
    popover: {
      title: "Your navigation hub",
      description: "Access everything from here: properties, contacts, requests, deals, and your network — all in one place.",
      side: "right",
    },
  },
  {
    // No element — shows centered; describes CMD+K search
    popover: {
      title: "Quick search — ⌘K",
      description: "Press ⌘K (or Ctrl+K) from anywhere to search properties, contacts, documents, and navigate instantly.",
    },
  },
  // Chapter 2 — Import
  {
    element: "[data-tour='import-nav']",
    popover: {
      title: "Import your data",
      description: "Bring in contacts or properties from a CSV in one step — fields are mapped automatically. Click to continue.",
      side: "right",
    },
  },
  {
    element: "[data-tour='import-upload-zone']",
    popover: {
      title: "Upload your file",
      description: "Drag a CSV or click to choose a file. The system will auto-map columns to the platform's fields.",
      side: "top",
    },
  },
  // Chapter 3 — Network
  {
    element: "[data-tour='network-nav']",
    popover: {
      title: "Your professional network",
      description: "Connect with other agents, share listings, and receive collaboration requests. Click to explore.",
      side: "right",
    },
  },
  {
    element: "[data-tour='network-feed']",
    popover: {
      title: "Network feed",
      description: "See what your partners are doing — property posts, announcements, and updates in real time.",
      side: "top",
    },
  },
  // Chapter 4 — Matchmaking
  {
    element: "[data-tour='matchmaking-nav']",
    popover: {
      title: "Smart matchmaking",
      description: "The platform automatically matches your listings against client requests. Click to see the suggestions.",
      side: "right",
    },
  },
  {
    // No element — full-screen completion
    popover: {
      title: "You're all set!",
      description: "You've explored the platform basics. You can revisit this tour at any time from the sidebar.",
    },
  },
];

export function getRealUserTourSteps(locale: "el" | "en"): TourStep[] {
  return locale === "el" ? realUserStepsEl : realUserStepsEn;
}
