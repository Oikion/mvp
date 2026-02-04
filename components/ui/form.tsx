import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
import { Slot } from "@radix-ui/react-slot"
import {
  Controller,
  ControllerProps,
  FieldPath,
  FieldValues,
  FormProvider,
  useFormContext,
} from "react-hook-form"

import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"

const Form = FormProvider

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> = {
  name: TName
}

const FormFieldContext = React.createContext<FormFieldContextValue>(
  {} as FormFieldContextValue
)

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  )
}

const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext)
  const itemContext = React.useContext(FormItemContext)
  const { getFieldState, formState } = useFormContext()

  const fieldState = getFieldState(fieldContext.name, formState)

  if (!fieldContext) {
    throw new Error("useFormField should be used within <FormField>")
  }

  const { id } = itemContext

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  }
}

type FormItemContextValue = {
  id: string
}

const FormItemContext = React.createContext<FormItemContextValue>(
  {} as FormItemContextValue
)

const FormItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const id = React.useId()

  return (
    <FormItemContext.Provider value={{ id }}>
      <div ref={ref} className={cn("space-y-2", className)} {...props} />
    </FormItemContext.Provider>
  )
})
FormItem.displayName = "FormItem"

const FormLabel = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => {
  const { error, formItemId } = useFormField()

  return (
    <Label
      ref={ref}
      className={cn(error && "text-destructive", className)}
      htmlFor={formItemId}
      {...props}
    />
  )
})
FormLabel.displayName = "FormLabel"

const FormControl = React.forwardRef<
  React.ElementRef<typeof Slot>,
  React.ComponentPropsWithoutRef<typeof Slot>
>(({ ...props }, ref) => {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField()

  return (
    <Slot
      ref={ref}
      id={formItemId}
      aria-describedby={
        !error
          ? `${formDescriptionId}`
          : `${formDescriptionId} ${formMessageId}`
      }
      aria-invalid={!!error}
      {...props}
    />
  )
})
FormControl.displayName = "FormControl"

const FormDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  const { formDescriptionId } = useFormField()

  return (
    <p
      ref={ref}
      id={formDescriptionId}
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
})
FormDescription.displayName = "FormDescription"

const FormMessage = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  const { error, formMessageId } = useFormField()
  const body = error ? String(error?.message) : children

  if (!body) {
    return null
  }

  return (
    <p
      ref={ref}
      id={formMessageId}
      className={cn("text-sm font-medium text-destructive", className)}
      {...props}
    >
      {body}
    </p>
  )
})
FormMessage.displayName = "FormMessage"

/**
 * FormActions - Standardized form action button container
 *
 * Provides consistent button placement across all forms:
 * - Cancel/secondary actions on the left
 * - Primary action (Save/Submit) on the right
 * - Responsive: stacks on mobile, inline on larger screens
 *
 * @example
 * ```tsx
 * <Form {...form}>
 *   <FormField ... />
 *   <FormActions>
 *     <Button variant="outline" onClick={handleCancel}>Cancel</Button>
 *     <Button type="submit" disabled={isLoading}>
 *       {isLoading ? <Loader2 className="animate-spin" /> : "Save"}
 *     </Button>
 *   </FormActions>
 * </Form>
 * ```
 *
 * @example
 * // With sticky footer
 * <FormActions sticky>
 *   <Button variant="outline">Cancel</Button>
 *   <Button type="submit">Save</Button>
 * </FormActions>
 *
 * @example
 * // Left-aligned actions
 * <FormActions align="left">
 *   <Button type="submit">Save</Button>
 * </FormActions>
 */
interface FormActionsProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Alignment of actions
   * @default "right"
   */
  align?: "left" | "center" | "right" | "between";
  /**
   * Makes the actions sticky at the bottom
   * @default false
   */
  sticky?: boolean;
  /**
   * Additional top border
   * @default true
   */
  showBorder?: boolean;
}

const FormActions = React.forwardRef<HTMLDivElement, FormActionsProps>(
  ({ className, align = "right", sticky = false, showBorder = true, children, ...props }, ref) => {
    const alignmentClasses = {
      left: "justify-start",
      center: "justify-center",
      right: "justify-end",
      between: "justify-between",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col-reverse gap-2 pt-4 sm:flex-row sm:gap-3",
          alignmentClasses[align],
          showBorder && "border-t mt-6",
          sticky && "sticky bottom-0 bg-background py-4 -mx-6 px-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
FormActions.displayName = "FormActions";

/**
 * FormSection - Groups related form fields
 *
 * @example
 * ```tsx
 * <FormSection title="Personal Information" description="Enter your details">
 *   <FormField name="firstName" ... />
 *   <FormField name="lastName" ... />
 * </FormSection>
 * ```
 */
interface FormSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
}

const FormSection = React.forwardRef<HTMLDivElement, FormSectionProps>(
  ({ className, title, description, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("space-y-4", className)}
        {...props}
      >
        {(title || description) && (
          <div className="space-y-1">
            {title && (
              <h3 className="text-lg font-medium leading-6">{title}</h3>
            )}
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        )}
        <div className="space-y-4">
          {children}
        </div>
      </div>
    );
  }
);
FormSection.displayName = "FormSection";

/**
 * FormRow - Horizontal layout for form fields
 *
 * @example
 * ```tsx
 * <FormRow>
 *   <FormField name="firstName" ... />
 *   <FormField name="lastName" ... />
 * </FormRow>
 * ```
 */
const FormRow = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "grid gap-4 sm:grid-cols-2",
        className
      )}
      {...props}
    />
  );
});
FormRow.displayName = "FormRow";

export {
  useFormField,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
  FormActions,
  FormSection,
  FormRow,
}
