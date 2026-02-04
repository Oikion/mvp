# Buttons - Oikion Design System

Unified button component with consistent styling, variants, and behavior.

## Import

```tsx
import { Button } from "@/components/ui/button";
```

## Variants

| Variant | Use Case | Example |
|---------|----------|---------|
| `default` | Primary actions | Save, Submit, Create |
| `secondary` | Secondary actions | Cancel, Back |
| `destructive` | Dangerous actions | Delete, Remove |
| `success` | Positive confirmations | Confirm, Approve |
| `outline` | Tertiary actions | Filter, Export |
| `ghost` | Subtle actions | Icon buttons |
| `link` | Navigation, inline | View more, Learn more |

```tsx
<Button variant="default">Save</Button>
<Button variant="secondary">Cancel</Button>
<Button variant="destructive">Delete</Button>
<Button variant="success">Confirm</Button>
<Button variant="outline">Export</Button>
<Button variant="ghost">Edit</Button>
<Button variant="link">Learn more</Button>
```

## Sizes

| Size | Height | Use Case |
|------|--------|----------|
| `sm` | 36px | Compact UIs, tables |
| `default` | 40px | Standard buttons |
| `lg` | 44px | Prominent actions |
| `icon` | 40x40px | Icon-only buttons |

```tsx
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
<Button size="icon"><Save /></Button>
```

## Loading State

Use the built-in `isLoading` prop for loading states:

```tsx
// DO: Use isLoading prop
<Button isLoading={isPending}>Submit</Button>

// DON'T: Manually add spinner
<Button disabled={isPending}>
  {isPending && <Loader2 className="animate-spin" />}
  Submit
</Button>
```

## Icons

Use `leftIcon` and `rightIcon` props:

```tsx
<Button leftIcon={<Save />}>Save</Button>
<Button rightIcon={<ChevronRight />}>Next</Button>
<Button leftIcon={<Plus />} rightIcon={<ChevronDown />}>
  Add Item
</Button>
```

## Full Width

```tsx
<Button fullWidth>Full Width Button</Button>
```

## Disabled with Tooltip

Explain why a button is disabled:

```tsx
<Button 
  disabled 
  disabledTooltip="Complete the form to enable"
>
  Submit
</Button>
```

## Complete Example

```tsx
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Save, Trash2 } from "lucide-react";
import { useAppToast } from "@/hooks/use-app-toast";

function ActionButtons() {
  const { toast } = useAppToast();
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    startTransition(async () => {
      await saveData();
      toast.success("updateSuccess");
    });
  };

  return (
    <div className="flex gap-3">
      <Button variant="outline">Cancel</Button>
      <Button 
        variant="destructive" 
        leftIcon={<Trash2 />}
      >
        Delete
      </Button>
      <Button 
        variant="default"
        leftIcon={<Save />}
        isLoading={isPending}
        onClick={handleSave}
      >
        Save Changes
      </Button>
    </div>
  );
}
```

## Accessibility

- Buttons have visible focus states (`focus-visible:ring-2`)
- Disabled buttons have `aria-disabled="true"`
- Loading buttons have `aria-busy="true"`
- Icon-only buttons require `aria-label`

```tsx
<Button size="icon" leftIcon={<Settings />} aria-label="Settings" />
```

## Button vs Link

- Use `Button` for actions that change state
- Use `Link` for navigation
- Use `Button variant="link"` for inline text actions

```tsx
// Navigation
<Link href="/settings">Settings</Link>

// Action
<Button onClick={handleClick}>Save</Button>

// Inline action
<Button variant="link" onClick={openModal}>
  View details
</Button>
```

## Migration from Website Button

If using the old `@/components/website/button`:

```tsx
// Before
import { Button } from "@/components/website/button";

// After (same props supported)
import { Button } from "@/components/ui/button";
```

Run migration:
```bash
npx tsx scripts/design-system/migrate-buttons.ts
```
