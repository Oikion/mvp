# Feedback - Oikion Design System

User feedback patterns including toasts, loading states, and progress indicators.

## Toast Notifications

### Import

```tsx
import { useAppToast } from "@/hooks/use-app-toast";
```

### Usage

```tsx
function MyComponent() {
  const { toast } = useAppToast();

  // Using translation keys (recommended)
  toast.success("createSuccess");
  toast.error("deleteFailed");
  toast.warning("warning");
  toast.info("info");

  // Custom messages
  toast.success("Item saved!", { isTranslationKey: false });
  toast.error("Failed to connect", { 
    description: "Check your network",
    isTranslationKey: false 
  });
}
```

### Toast Variants

| Method | Duration | Use Case |
|--------|----------|----------|
| `success()` | 4s | Successful operations |
| `error()` | 6s | Errors, failures |
| `warning()` | 5s | Caution, attention needed |
| `info()` | 4s | Information, tips |

### Promise Toast

Show loading, success, and error states automatically:

```tsx
toast.promise(
  saveData(formData),
  {
    loading: "Saving...",
    success: "createSuccess",
    error: "createFailed",
  }
);
```

### With Actions

```tsx
toast.error("File deleted", {
  description: "This cannot be undone",
  action: {
    label: "Undo",
    onClick: () => restoreFile(),
  },
});
```

### Translation Keys

Add keys to `locales/en/common.json`:

```json
{
  "toast": {
    "createSuccess": "Created successfully",
    "createFailed": "Creation failed. Please try again.",
    // ... more keys
  }
}
```

## Loading States

### Import

```tsx
import { Loading, LoadingSpinner, PageLoading } from "@/components/ui/loading";
```

### Variants

| Variant | Use Case |
|---------|----------|
| `spinner` | Buttons, inline |
| `dots` | Sections, default |
| `pulse` | Important loads |
| `orbit` | Long operations |
| `wave` | Data loading |
| `bars` | Progress-like |

### Button Loading

```tsx
<Button isLoading={isPending}>Submit</Button>
```

### Section Loading

```tsx
if (isLoading) {
  return <Loading variant="dots" size="lg" message="Loading clients..." />;
}
```

### Page Loading

```tsx
if (isLoading) {
  return <PageLoading message="Loading dashboard..." />;
}
```

### Full Screen Loading

```tsx
<Loading 
  variant="orbit" 
  size="xl" 
  message="Processing..." 
  fullscreen 
/>
```

## Progress Indicators

### Progress Bar

```tsx
import { Progress } from "@/components/ui/progress";

<Progress value={progress} className="h-2" />
```

### Job Status Tracking

```tsx
import { JobStatusTracker } from "@/components/jobs";

<JobStatusTracker 
  jobId={jobId}
  onComplete={(job) => handleComplete(job)}
  onError={(job) => handleError(job)}
/>
```

## Decision Tree

### When to use what:

| Scenario | Feedback Type |
|----------|---------------|
| Action completed | `toast.success()` |
| Action failed | `toast.error()` |
| Warning before action | `toast.warning()` |
| Helpful information | `toast.info()` |
| Button submission | `isLoading` prop |
| Section loading | `<Loading />` component |
| Full page load | `<PageLoading />` |
| Background job | `<JobStatusTracker />` |
| File upload | Progress bar |

## Autosave Indicator

For forms with autosave:

```tsx
import { AutosaveIndicator } from "@/components/form/autosave-indicator";

<AutosaveIndicator status="saving" />
<AutosaveIndicator status="saved" />
<AutosaveIndicator status="failed" />
```

## Accessibility

- Toast notifications use `aria-live="polite"`
- Loading states include screen reader text
- Progress bars have appropriate ARIA attributes

```tsx
// Screen reader announces loading state
<Loading aria-label="Loading user data" />

// Progress bar with label
<Progress value={50} aria-label="Upload progress: 50%" />
```

## Migration

### From old useToast

```tsx
// Before (deprecated)
import { useToast } from "@/components/ui/use-toast";
const { toast } = useToast();
toast({ title: "Success", variant: "success" });

// After
import { useAppToast } from "@/hooks/use-app-toast";
const { toast } = useAppToast();
toast.success("Success", { isTranslationKey: false });
```

Run migration:
```bash
npx tsx scripts/design-system/migrate-toast.ts
```
