# SelectWithOther Component

## Overview

The `SelectWithOther` component and its React Hook Form variant `FormSelectWithOther` provide a dropdown select that automatically shows an input field when the user selects "Other" (or equivalent in other languages like "Άλλο" in Greek).

## Version

- **Component Version**: 1.0.0
- **Created**: January 2026
- **Last Updated**: January 2026

## Directory Structure

```
components/ui/
├── select-with-other.tsx      # Standalone component
├── form-select-with-other.tsx # React Hook Form integrated component
```

## Features

- **Automatic "Other" Detection**: Detects "Other" values in multiple languages (English, Greek)
- **Smooth Animation**: Input field appears with a smooth CSS animation
- **Full Accessibility**: Proper ARIA attributes and keyboard navigation
- **React Hook Form Integration**: Seamless integration with form validation
- **Separate Field Support**: Can store "Other" value in a separate form field
- **Customizable Patterns**: Add custom patterns to detect as "Other"

## Usage

### Standalone Component

```tsx
import { SelectWithOther, useSelectWithOther } from "@/components/ui/select-with-other";

function MyComponent() {
  const { value, setValue, otherValue, setOtherValue } = useSelectWithOther();

  return (
    <SelectWithOther
      value={value}
      onValueChange={setValue}
      otherValue={otherValue}
      onOtherValueChange={setOtherValue}
      placeholder="Select an option"
      otherPlaceholder="Please specify..."
      options={[
        { value: "option1", label: "Option 1" },
        { value: "option2", label: "Option 2" },
        { value: "OTHER", label: "Other" },
      ]}
    />
  );
}
```

### With React Hook Form

```tsx
import { FormSelectWithOther } from "@/components/ui/form-select-with-other";

function MyForm() {
  return (
    <FormSelectWithOther
      name="propertyType"
      otherFieldName="propertyTypeOther"
      label="Property Type"
      placeholder="Select type"
      otherLabel="Please specify"
      otherPlaceholder="Enter the property type..."
      options={[
        { value: "APARTMENT", label: "Apartment" },
        { value: "HOUSE", label: "House" },
        { value: "OTHER", label: "Other" },
      ]}
    />
  );
}
```

## Props

### SelectWithOther Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | - | Current selected value |
| `onValueChange` | `(value: string) => void` | - | Callback when value changes |
| `otherValue` | `string` | `""` | Current "Other" input value |
| `onOtherValueChange` | `(value: string) => void` | - | Callback when "Other" input changes |
| `placeholder` | `string` | `"Select an option"` | Select placeholder |
| `otherPlaceholder` | `string` | `"Please specify..."` | "Other" input placeholder |
| `otherLabel` | `string` | `"Please specify"` | Label for "Other" input |
| `options` | `SelectOption[]` | - | Array of options |
| `otherPatterns` | `string[]` | - | Additional patterns to detect as "Other" |
| `disabled` | `boolean` | `false` | Whether the select is disabled |
| `otherRequired` | `boolean` | `false` | Whether "Other" input is required |

### FormSelectWithOther Props

Includes all SelectWithOther props plus:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `name` | `string` | - | Form field name for select value |
| `otherFieldName` | `string` | - | Optional separate field for "Other" value |
| `label` | `string` | - | Form field label |
| `description` | `string` | - | Description text |

## Detected "Other" Patterns

The component automatically detects these values as "Other":

- `other`, `OTHER`, `Other`
- `άλλο`, `Άλλο`, `ΑΛΛΟ` (Greek)

You can add custom patterns using the `otherPatterns` prop.

## Helper Functions

### `isOtherValue(value, customPatterns?)`

Check if a value matches any "Other" pattern.

```tsx
import { isOtherValue } from "@/components/ui/select-with-other";

if (isOtherValue(selectedValue)) {
  // Handle "Other" selection
}
```

### `useSelectWithOther(initialValue?, initialOtherValue?)`

Hook for managing SelectWithOther state.

```tsx
const {
  value,
  setValue,
  otherValue,
  setOtherValue,
  reset,
  getFinalValue,
  isOther,
} = useSelectWithOther();
```

## Files Updated

When implementing this feature, the following files were updated:

1. `components/ui/select-with-other.tsx` - New standalone component
2. `components/ui/form-select-with-other.tsx` - React Hook Form integration
3. `app/[locale]/app/(routes)/mls/properties/components/NewPropertyWizard.tsx`
4. `app/[locale]/app/(routes)/mls/components/QuickAddProperty.tsx`
5. `app/[locale]/app/(routes)/mls/properties/[propertyId]/components/EditPropertyForm.tsx`
6. `app/[locale]/app/(routes)/crm/clients/components/NewClientWizard.tsx`
7. `components/calendar/EventCreateForm.tsx` - Calendar event creation form
8. `components/calendar/EventCreateFormContent.tsx` - Calendar event creation form content
9. `components/calendar/EventEditForm.tsx` - Calendar event edit form
10. `locales/el/mls.json` - Greek translations
11. `locales/en/mls.json` - English translations
12. `locales/el/crm.json` - Greek translations
13. `locales/en/crm.json` - English translations
14. `locales/el/calendar.json` - Greek calendar translations
15. `locales/en/calendar.json` - English calendar translations
16. `locales/el/common.json` - Common Greek translations
17. `locales/en/common.json` - Common English translations

## Schema Updates

When using `FormSelectWithOther` with a separate `otherFieldName`, remember to add the corresponding field to your Zod schema:

```tsx
const formSchema = z.object({
  property_type: z.enum(["APARTMENT", "HOUSE", "OTHER"]),
  property_type_other: z.string().optional(), // Add this field
  // ...
});
```
