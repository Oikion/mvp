# Nielsen's 10 Usability Heuristics - Oikion Design System

This document maps how the Oikion Design System addresses each of Nielsen's 10 usability heuristics.

## Overview

Nielsen's heuristics are fundamental principles for user interface design. Our design system components and patterns are specifically designed to satisfy these principles.

---

## 1. Visibility of System Status

> The design should always keep users informed about what is going on, through appropriate feedback within a reasonable amount of time.

### Implementation

| Pattern | Component/Feature |
|---------|-------------------|
| Loading states | `<Loading />`, `<Button isLoading />` |
| Form submission | Button loading + toast notifications |
| Background jobs | `<JobStatusTracker />` |
| Autosave | `<AutosaveIndicator />` |
| Progress | `<Progress />` component |
| Real-time updates | Toast notifications |

### Example

```tsx
<Button isLoading={isPending}>Saving...</Button>
{isPending && <Loading variant="dots" message="Processing..." />}
<JobStatusTracker jobId={jobId} />
```

---

## 2. Match Between System and Real World

> The design should speak the users' language. Use words, phrases, and concepts familiar to the user, rather than internal jargon.

### Implementation

| Pattern | Component/Feature |
|---------|-------------------|
| Natural language | Toast messages via translation keys |
| Familiar icons | Lucide icons with standard meanings |
| Clear labels | FormLabel, FormDescription |
| Context-aware text | Localized content (Greek/English) |

### Example

```tsx
// Use natural language in toasts
toast.success("createSuccess"); // "Created successfully"

// Clear form labels
<FormLabel>Email Address</FormLabel>
<FormDescription>
  We'll never share your email with anyone.
</FormDescription>
```

---

## 3. User Control and Freedom

> Users often perform actions by mistake. They need a clearly marked "emergency exit" to leave the unwanted action without having to go through an extended process.

### Implementation

| Pattern | Component/Feature |
|---------|-------------------|
| Dismissible toasts | Auto-dismiss + close button |
| Cancel actions | `<Button variant="outline">Cancel</Button>` |
| Undo support | Toast with action button |
| Form reset | Reset buttons |
| Job cancellation | Cancel job button |

### Example

```tsx
// Dismissible toast with undo
toast.error("Item deleted", {
  action: {
    label: "Undo",
    onClick: () => restoreItem(),
  },
});

// Cancel button in forms
<div className="flex gap-2">
  <Button variant="outline" onClick={handleCancel}>Cancel</Button>
  <Button type="submit">Save</Button>
</div>
```

---

## 4. Consistency and Standards

> Users should not have to wonder whether different words, situations, or actions mean the same thing.

### Implementation

| Pattern | Component/Feature |
|---------|-------------------|
| Single button component | Unified `<Button />` |
| Unified toast API | `useAppToast()` hook |
| Semantic colors | `text-destructive`, `text-success` |
| Typography scale | `text-h1` through `text-caption` |
| ESLint enforcement | Design system rules |

### Example

```tsx
// Consistent button variants across the app
<Button variant="default">Primary Action</Button>
<Button variant="destructive">Delete</Button>
<Button variant="success">Confirm</Button>

// Consistent color usage
<span className="text-destructive">Error</span>
<span className="text-success">Success</span>
```

---

## 5. Error Prevention

> Good error messages are important, but the best designs carefully prevent problems from occurring in the first place.

### Implementation

| Pattern | Component/Feature |
|---------|-------------------|
| Validation on blur | `validationConfig` with `mode: "onBlur"` |
| Input constraints | Zod schemas, max length |
| Confirmation dialogs | `<AlertDialog />` for destructive actions |
| Type safety | TypeScript strict types |
| Disabled states | `disabledTooltip` explaining why |

### Example

```tsx
// Validation prevents submission of invalid data
const schema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Min 8 characters"),
});

// Confirmation before destructive action
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive">Delete</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
    <AlertDialogDescription>
      This action cannot be undone.
    </AlertDialogDescription>
  </AlertDialogContent>
</AlertDialog>
```

---

## 6. Recognition Rather Than Recall

> Minimize the user's memory load by making elements, actions, and options visible.

### Implementation

| Pattern | Component/Feature |
|---------|-------------------|
| Visible form states | Error messages inline |
| Dropdown options | Select, Combobox components |
| Autocomplete | Location/address autocomplete |
| Placeholders | Example text in inputs |
| Icons with labels | Buttons with icons + text |

### Example

```tsx
// Visible error state
<FormMessage />

// Icon + text for clarity
<Button leftIcon={<Save />}>Save Changes</Button>

// Autocomplete reduces recall
<LocationAutocomplete placeholder="Search for address..." />
```

---

## 7. Flexibility and Efficiency of Use

> Shortcuts — hidden from novice users — can speed up the interaction for the expert user.

### Implementation

| Pattern | Component/Feature |
|---------|-------------------|
| Keyboard shortcuts | `?` for shortcuts modal |
| Quick actions | Floating action buttons |
| Command palette | `Cmd+K` global search |
| Table navigation | J/K keys, Enter to open |
| Bulk actions | Multi-select + bulk operations |

### Example

```tsx
// Keyboard shortcuts hook
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

// Quick add buttons
<FloatingActions>
  <QuickAddClient />
  <QuickAddProperty />
</FloatingActions>
```

---

## 8. Aesthetic and Minimalist Design

> Interfaces should not contain information that is irrelevant or rarely needed.

### Implementation

| Pattern | Component/Feature |
|---------|-------------------|
| Clean components | shadcn/ui base |
| Progressive disclosure | Collapsible sections |
| Focused forms | Essential fields only |
| Minimal toast content | Title + optional description |
| Theme-aware design | CSS variables, no visual clutter |

### Example

```tsx
// Minimal toast - just what's needed
toast.success("createSuccess");

// Progressive disclosure
<Collapsible>
  <CollapsibleTrigger>Advanced Options</CollapsibleTrigger>
  <CollapsibleContent>
    {/* Additional options hidden by default */}
  </CollapsibleContent>
</Collapsible>
```

---

## 9. Help Users Recognize, Diagnose, and Recover from Errors

> Error messages should be expressed in plain language, precisely indicate the problem, and constructively suggest a solution.

### Implementation

| Pattern | Component/Feature |
|---------|-------------------|
| Inline errors | `<FormMessage />` |
| Descriptive messages | Zod custom messages |
| Error recovery | Toast with retry action |
| Clear error states | Semantic colors (destructive) |
| Help text | `<FormDescription />` |

### Example

```tsx
// Clear, actionable error message
const schema = z.object({
  email: z.string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
});

// Toast with recovery action
toast.error("Failed to save", {
  description: "Check your connection",
  action: {
    label: "Retry",
    onClick: () => handleRetry(),
  },
});
```

---

## 10. Help and Documentation

> It may be necessary to provide documentation to help users understand how to complete their tasks.

### Implementation

| Pattern | Component/Feature |
|---------|-------------------|
| Inline tooltips | `<Tooltip />` component |
| Form hints | `<FormDescription />` |
| Keyboard shortcuts modal | Accessible via `?` |
| Contextual help | Info icons with popovers |
| Documentation | `/docs/design-system/` |

### Example

```tsx
// Tooltip for icons
<Tooltip>
  <TooltipTrigger>
    <InfoIcon />
  </TooltipTrigger>
  <TooltipContent>
    This setting affects all team members.
  </TooltipContent>
</Tooltip>

// Form hint
<FormDescription>
  Password must be at least 8 characters with one number.
</FormDescription>
```

---

## Checklist for New Features

When building new features, verify coverage of all heuristics:

- [ ] **Visibility**: Loading states, progress indicators
- [ ] **Match**: Natural language, familiar patterns
- [ ] **Control**: Cancel, undo, escape routes
- [ ] **Consistency**: Use design system components
- [ ] **Prevention**: Validation, confirmations
- [ ] **Recognition**: Visible options, autocomplete
- [ ] **Flexibility**: Keyboard shortcuts where useful
- [ ] **Aesthetic**: Minimal, focused UI
- [ ] **Errors**: Clear messages, recovery options
- [ ] **Help**: Tooltips, descriptions, documentation
