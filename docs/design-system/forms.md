# Forms - Oikion Design System

This document covers form patterns, error handling, loading states, and validation strategies following Nielsen's usability heuristics.

## Table of Contents

1. [Form Structure](#form-structure)
2. [Error Handling Decision Tree](#error-handling-decision-tree)
3. [Loading States](#loading-states)
4. [Validation Patterns](#validation-patterns)
5. [Accessibility](#accessibility)
6. [Code Examples](#code-examples)
7. [Nielsen Heuristics Coverage](#nielsen-heuristics-coverage)

---

## Form Structure

### Standard Form Template

Use `react-hook-form` with `zod` for all forms:

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { validationConfig } from "@/lib/form";
import { useAppToast } from "@/hooks/use-app-toast";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const schema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(2, "Name must be at least 2 characters"),
});

type FormValues = z.infer<typeof schema>;

export function ExampleForm() {
  const { toast } = useAppToast();
  const [isPending, startTransition] = useTransition();

  const form = useForm<FormValues>({
    ...validationConfig,
    resolver: zodResolver(schema),
    defaultValues: { email: "", name: "" },
  });

  const onSubmit = (data: FormValues) => {
    startTransition(async () => {
      try {
        await submitData(data);
        toast.success("createSuccess");
      } catch (error) {
        toast.error("createFailed");
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button type="submit" isLoading={isPending}>
          Submit
        </Button>
      </form>
    </Form>
  );
}
```

---

## Error Handling Decision Tree

### When to Use Each Pattern

| Error Type | Display Method | Example |
|------------|----------------|---------|
| **Field validation** | `FormMessage` | Email format invalid |
| **Form-level errors** | Toast (error) | "Please fix the errors above" |
| **Server errors** | Toast (error) | API failure, 500 errors |
| **Network errors** | Toast (error) | Connection timeout |
| **Validation hints** | Helper text | "Password must be 8+ characters" |
| **Success feedback** | Toast (success) | "Created successfully" |

### Field-Level Errors

Use `FormMessage` from react-hook-form for field validation:

```tsx
// DO: Use FormMessage for field errors
<FormField
  control={form.control}
  name="email"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Email</FormLabel>
      <FormControl>
        <Input {...field} />
      </FormControl>
      <FormMessage /> {/* Automatic error display */}
    </FormItem>
  )}
/>

// DON'T: Mix patterns or use hardcoded colors
{errors.email && (
  <span className="text-red-500">{errors.email.message}</span>
)}
```

### Server/API Errors

Use toast notifications for server errors:

```tsx
import { handleServerError } from "@/lib/form";
import { useAppToast } from "@/hooks/use-app-toast";

function MyForm() {
  const { toast } = useAppToast();

  const onSubmit = async (data: FormData) => {
    try {
      await api.createItem(data);
      toast.success("createSuccess");
    } catch (error) {
      // Option 1: Use helper function
      handleServerError(error, toast);
      
      // Option 2: Use translation key directly
      toast.error("createFailed");
      
      // Option 3: Custom message
      toast.error("Custom error message", { isTranslationKey: false });
    }
  };
}
```

### Form Errors Component

For server actions returning multiple field errors:

```tsx
import { FormErrors } from "@/components/form/form-errors";

// Server action returns: { errors: { email: ["Email already exists"] } }
<FormErrors id="email" errors={state.errors} />
```

---

## Loading States

### Button Loading

Use the enhanced Button component with `isLoading`:

```tsx
// DO: Use built-in isLoading prop
<Button type="submit" isLoading={isPending}>
  Submit
</Button>

// DON'T: Manually add spinner
<Button type="submit" disabled={isPending}>
  {isPending && <Loader2 className="animate-spin" />}
  Submit
</Button>
```

### Section Loading

Use the Loading component for section/page loading:

```tsx
import { Loading, PageLoading } from "@/components/ui/loading";

// Section loading
if (isLoading) {
  return <Loading variant="dots" size="lg" message="Loading clients..." />;
}

// Full page loading (convenience wrapper)
if (isLoading) {
  return <PageLoading message="Loading your dashboard..." />;
}
```

### Loading Variants Decision Tree

| Context | Variant | Size | Example |
|---------|---------|------|---------|
| Button | `spinner` | `sm` | Submit button |
| Inline text | `spinner` | `xs` | Loading indicator in text |
| Section/Card | `dots` | `md` or `lg` | Data table loading |
| Full page | `dots` or `orbit` | `xl` | Route transition |
| Long operation | `orbit` or `pulse` | `lg` | File upload |

---

## Validation Patterns

### Standard Configuration

Use the shared validation config for consistent behavior:

```tsx
import { validationConfig } from "@/lib/form";

const form = useForm({
  ...validationConfig, // mode: "onBlur", reValidateMode: "onChange"
  resolver: zodResolver(schema),
});
```

### Validation Timing

- **onBlur**: Validate when user leaves field (better UX, less intrusive)
- **onChange after error**: Re-validate on change after first error appears
- **onSubmit**: Final validation before submission

### Zod Schema Best Practices

```tsx
const schema = z.object({
  // Required field with custom message
  email: z
    .string()
    .min(1, "Email is required")
    .email("Invalid email address"),

  // Optional field with transform
  phone: z
    .string()
    .optional()
    .transform((val) => val?.replace(/\D/g, "")),

  // Conditional validation
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain uppercase letter")
    .regex(/[0-9]/, "Must contain number"),

  // Enum validation
  status: z.enum(["active", "inactive", "pending"]),
});
```

---

## Accessibility

### Required Fields

```tsx
<FormField
  control={form.control}
  name="email"
  render={({ field }) => (
    <FormItem>
      <FormLabel>
        Email <span className="text-destructive">*</span>
      </FormLabel>
      <FormControl>
        <Input {...field} aria-required="true" />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

### Error Announcements

FormMessage automatically uses `aria-live="polite"` to announce errors to screen readers. The FormErrors component also includes proper ARIA attributes:

```tsx
<div
  id={`${id}-error`}
  aria-live="polite"
  role="alert"
  className="text-destructive"
>
  {errors}
</div>
```

### Loading States

Always provide accessible loading indicators:

```tsx
// Button with aria-busy
<Button isLoading={isPending} aria-busy={isPending}>
  Submit
</Button>

// Loading component with screen reader text
<Loading 
  variant="dots" 
  aria-label="Loading client data" 
  message="Loading..."
/>
```

### Keyboard Navigation

Forms should be fully keyboard navigable:

- **Tab**: Move between form fields
- **Shift+Tab**: Move backwards
- **Enter**: Submit form (when focus on submit button)
- **Space**: Toggle checkboxes/switches

---

## Code Examples

### Complete Form with All Patterns

```tsx
"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { validationConfig, handleServerError } from "@/lib/form";
import { useAppToast } from "@/hooks/use-app-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Save } from "lucide-react";

const clientSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  notes: z.string().max(500, "Notes must be under 500 characters").optional(),
});

type ClientFormValues = z.infer<typeof clientSchema>;

interface ClientFormProps {
  onSuccess?: () => void;
}

export function ClientForm({ onSuccess }: ClientFormProps) {
  const { toast } = useAppToast();
  const [isPending, startTransition] = useTransition();

  const form = useForm<ClientFormValues>({
    ...validationConfig,
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      notes: "",
    },
  });

  const onSubmit = (data: ClientFormValues) => {
    startTransition(async () => {
      try {
        await createClient(data);
        toast.success("createSuccess");
        form.reset();
        onSuccess?.();
      } catch (error) {
        handleServerError(error, toast, {
          translationKey: "createFailed",
        });
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Name Field - Required */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Name <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Email Field - Required with validation hint */}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Email <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input type="email" placeholder="john@example.com" {...field} />
              </FormControl>
              <FormDescription>
                We'll use this to send important notifications.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Phone Field - Optional */}
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone</FormLabel>
              <FormControl>
                <Input type="tel" placeholder="+30 xxx xxx xxxx" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Notes Field - Optional with character limit */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Additional information..."
                  rows={4}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                {field.value?.length || 0}/500 characters
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Submit Button with Loading State */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => form.reset()}
            disabled={isPending}
          >
            Reset
          </Button>
          <Button
            type="submit"
            isLoading={isPending}
            leftIcon={<Save />}
          >
            Create Client
          </Button>
        </div>
      </form>
    </Form>
  );
}
```

---

## Nielsen Heuristics Coverage

### How Forms Address Each Heuristic

| # | Heuristic | Implementation |
|---|-----------|----------------|
| 1 | **Visibility of system status** | Loading states on buttons, toast notifications, autosave indicators |
| 2 | **Match system and real world** | Clear labels, natural language errors, familiar form patterns |
| 3 | **User control and freedom** | Reset buttons, dismissible toasts, undo support |
| 4 | **Consistency and standards** | Unified error patterns, consistent button placement, standard validation timing |
| 5 | **Error prevention** | Validation on blur, input constraints, confirmation dialogs |
| 6 | **Recognition over recall** | Visible placeholders, dropdown options, autocomplete |
| 7 | **Flexibility and efficiency** | Keyboard shortcuts, autofill support, quick actions |
| 8 | **Aesthetic and minimalist design** | Clean form layouts, only essential fields, progressive disclosure |
| 9 | **Help users with errors** | Clear error messages, inline guidance, recovery suggestions |
| 10 | **Help and documentation** | FormDescription hints, tooltips, contextual help |

---

## Multi-Step Forms / Wizards

### When to Use Wizards

Use multi-step forms when:
- Form has more than 7-10 fields
- Fields can be logically grouped into steps
- User needs guidance through a complex process
- Conditional fields depend on previous answers

### Wizard Pattern

```tsx
"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { validationConfig } from "@/lib/form";
import { useAppToast } from "@/hooks/use-app-toast";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

// Define steps and their fields
const STEPS = {
  1: { title: "Basic Info", fields: ["name", "email"] },
  2: { title: "Details", fields: ["phone", "address"] },
  3: { title: "Preferences", fields: ["notifications", "privacy"] },
} as const;

const TOTAL_STEPS = Object.keys(STEPS).length;

export function MultiStepForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isPending, startTransition] = useTransition();
  const { toast } = useAppToast();

  const form = useForm({
    ...validationConfig,
    resolver: zodResolver(schema),
  });

  // Validate current step before proceeding
  const validateStep = async () => {
    const stepFields = STEPS[currentStep as keyof typeof STEPS].fields;
    return await form.trigger(stepFields);
  };

  const handleNext = async () => {
    const isValid = await validateStep();
    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, TOTAL_STEPS));
    }
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const onSubmit = (data: FormValues) => {
    startTransition(async () => {
      try {
        await submitData(data);
        toast.success("createSuccess");
      } catch (error) {
        toast.error("createFailed");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Step {currentStep} of {TOTAL_STEPS}</span>
          <span>{STEPS[currentStep as keyof typeof STEPS].title}</span>
        </div>
        <Progress value={(currentStep / TOTAL_STEPS) * 100} />
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Render step content conditionally */}
          {currentStep === 1 && <StepOne control={form.control} />}
          {currentStep === 2 && <StepTwo control={form.control} />}
          {currentStep === 3 && <StepThree control={form.control} />}

          {/* Navigation buttons */}
          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1 || isPending}
            >
              Previous
            </Button>

            {currentStep < TOTAL_STEPS ? (
              <Button type="button" onClick={handleNext}>
                Next
              </Button>
            ) : (
              <Button type="submit" isLoading={isPending}>
                Submit
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
}
```

### Wizard Best Practices

| Aspect | Recommendation |
|--------|----------------|
| **Progress** | Show clear step indicator (e.g., Progress component) |
| **Validation** | Validate each step before allowing progression |
| **Navigation** | Allow going back without losing data |
| **Autosave** | Save draft data between steps for long forms |
| **Review** | Consider a review step before final submission |
| **Exit warning** | Warn users about unsaved changes when leaving |

### Draft/Autosave Support

```tsx
import { useDebounce } from "@/hooks/use-debounce";

// Autosave on form changes
const formValues = form.watch();
const debouncedValues = useDebounce(formValues, 1000);

useEffect(() => {
  if (debouncedValues) {
    saveDraft(debouncedValues);
  }
}, [debouncedValues]);
```

---

## Migration Guide

### From Old Toast Pattern

```tsx
// Before (deprecated)
import { useToast } from "@/components/ui/use-toast";
const { toast } = useToast();
toast({ title: "Success", variant: "success" });

// After (standardized)
import { useAppToast } from "@/hooks/use-app-toast";
const { toast } = useAppToast();
toast.success("createSuccess");
```

### From Hardcoded Error Colors

```tsx
// Before
<span className="text-red-500">{error}</span>

// After
<FormMessage /> // or
<span className="text-destructive">{error}</span>
```

### From Manual Loading States

```tsx
// Before
<Button disabled={isPending}>
  {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
  Submit
</Button>

// After
<Button isLoading={isPending}>Submit</Button>
```

---

## Related Documentation

- [Buttons](./buttons.md) - Button variants and usage
- [Feedback](./feedback.md) - Toast, loading, and notification patterns
- [Colors](./colors.md) - Semantic color tokens
- [Accessibility](../design-system.md#accessibility) - WCAG compliance guidelines
