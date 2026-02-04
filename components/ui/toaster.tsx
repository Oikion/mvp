// @ts-nocheck
// TODO: Fix type errors
"use client"

/**
 * @deprecated This Radix UI Toaster component is no longer used.
 * 
 * All toasts now go through Sonner via the `useAppToast` hook.
 * The Sonner Toaster is rendered in app/[locale]/layout.tsx via:
 *   import { Toaster } from "@/components/ui/sonner";
 * 
 * This file can be safely deleted once confirmed no components depend on it.
 * 
 * For toast usage, use:
 * ```tsx
 * import { useAppToast } from "@/hooks/use-app-toast";
 * 
 * const { toast } = useAppToast();
 * toast.success("updateSuccess"); // Uses translation key
 * toast.error("Custom message", { isTranslationKey: false }); // Raw message
 * ```
 */

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
// Note: This component is broken - useAppToast doesn't return 'toasts' array
// Keeping for reference only - do not use

/**
 * @deprecated Use Sonner Toaster from @/components/ui/sonner instead.
 */
export function Toaster() {
  // This is intentionally broken - the old useToast returned { toasts }
  // but useAppToast returns { toast } with methods like toast.success()
  const toasts: never[] = []

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
