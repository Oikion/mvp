# Forms and Validation

Zod + react-hook-form patterns for Oikion. For design system specifics (loading variants, toast patterns, accessibility), see `docs/design-system/forms.md`.

## Standard Form Setup

All forms use `react-hook-form` with `zodResolver` and the shared `validationConfig`:

```tsx
'use client'
import { useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { validationConfig } from '@/lib/form'
import { useAppToast } from '@/hooks/use-app-toast'

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email'),
  name:  z.string().min(2, 'Name must be at least 2 characters'),
})
type FormValues = z.infer<typeof schema>

export function ExampleForm() {
  const { toast } = useAppToast()
  const [isPending, startTransition] = useTransition()

  const form = useForm<FormValues>({
    ...validationConfig,   // mode: 'onBlur', reValidateMode: 'onChange'
    resolver: zodResolver(schema),
    defaultValues: { email: '', name: '' },
  })

  const onSubmit = (data: FormValues) => {
    startTransition(async () => {
      try {
        await submitAction(data)
        toast.success('createSuccess')
      } catch (error) {
        toast.error('createFailed')
      }
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl><Input type="email" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" isLoading={isPending}>Submit</Button>
      </form>
    </Form>
  )
}
```

## Zod Schema Patterns

```typescript
import { z } from 'zod'

const schema = z.object({
  // Required with custom message
  name: z.string().min(1, 'Required').max(255),

  // Optional with phone normalization
  phone: z.string().optional().transform(val => val?.replace(/\D/g, '')),

  // Enum
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']),

  // Optional number — use explicit handler, not z.coerce.number()
  // z.coerce.number() converts "" to 0, hiding "not entered" vs "entered 0"
  bedrooms: z.number().int().min(0).optional(),

  // Conditional — cross-field refinement
  price: z.number().min(0),
  priceNegotiable: z.boolean(),
}).refine(
  data => data.priceNegotiable || data.price > 0,
  { message: 'Price required when not negotiable', path: ['price'] }
)
```

### Important: z.coerce.number() pitfall

`z.coerce.number()` silently converts `""` to `0`. For optional numeric fields, use an explicit `onChange` handler instead:

```tsx
<Input
  type="number"
  value={field.value ?? ''}
  onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
/>
```

## Error Handling

| Error type | Pattern |
|------------|---------|
| Field validation | `<FormMessage />` — automatic from react-hook-form |
| Server/API error | `toast.error('translationKey')` |
| Multiple field errors from server action | `<FormErrors id="field" errors={state.errors} />` |

```typescript
import { handleServerError } from '@/lib/form'

// In catch block:
handleServerError(error, toast, { translationKey: 'createFailed' })
```

Never use hardcoded colors like `text-red-500` — use `text-destructive` (semantic token) or `<FormMessage />`.

## Multi-Step Wizards

Key convention for the existing `NewPropertyWizard` and `NewClientWizard`:

```tsx
// REQUIRED: key prop forces React to unmount/remount step content on step change.
// This prevents DOM node reuse that causes Selects to lose their value and
// number inputs to cascade values across steps.
<CardContent key={currentStep}>
  {/* step content */}
</CardContent>
```

Do not remove the `key={currentStep}` — it is a deliberate bug fix.

Per-step validation before advancing:

```typescript
const validateStep = async () => {
  const stepFields = STEPS[currentStep].fields
  return await form.trigger(stepFields as FieldPath<FormValues>[])
}
```

Note: `form.trigger(fields)` with `zodResolver` runs the full schema including global `.refine()` validators. Fields failing cross-field refinements on a future step do not block the current step — but the resolver may return `values: {}` in some edge cases. Using `shouldUnregister: false` (react-hook-form default) preserves values across step unmount/remount.

## Toast Conventions

```typescript
import { useAppToast } from '@/hooks/use-app-toast'

const { toast } = useAppToast()

toast.success('createSuccess')           // translation key
toast.error('createFailed')              // translation key
toast.error('Custom message', { isTranslationKey: false })  // literal string
```

Do NOT use `import { useToast } from '@/components/ui/use-toast'` — that is deprecated.

## Loading States

```tsx
// Button with built-in spinner
<Button type="submit" isLoading={isPending}>Submit</Button>

// Section loading
import { Loading } from '@/components/ui/loading'
if (isLoading) return <Loading variant="dots" size="lg" message="Loading..." />
```

## Related

- `docs/design-system/forms.md` — full design system reference (loading variants table, Nielsen heuristics, accessibility)
- `lib/validations/` — all feature Zod schemas
- `lib/form.ts` — `validationConfig`, `handleServerError`
- `hooks/use-app-toast.ts` — toast helper
