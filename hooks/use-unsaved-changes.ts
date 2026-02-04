"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * useUnsavedChanges - Hook for warning users about unsaved changes
 *
 * Provides two types of protection:
 * 1. Browser-level: Warns when closing tab/refreshing (beforeunload)
 * 2. App-level: Warns when using Next.js router navigation
 *
 * Note: Next.js App Router doesn't have a direct router event API like Pages Router.
 * This hook uses a workaround with a wrapped router to intercept push/replace.
 *
 * @example
 * ```tsx
 * function EditForm() {
 *   const [isDirty, setIsDirty] = useState(false);
 *
 *   const { confirmNavigation, ConfirmDialog } = useUnsavedChanges({
 *     isDirty,
 *     message: "You have unsaved changes. Are you sure you want to leave?",
 *   });
 *
 *   return (
 *     <>
 *       <ConfirmDialog />
 *       <form onChange={() => setIsDirty(true)}>
 *         ...
 *       </form>
 *     </>
 *   );
 * }
 * ```
 *
 * @example With React Hook Form
 * ```tsx
 * function EditForm() {
 *   const form = useForm();
 *   const { isDirty } = form.formState;
 *
 *   useUnsavedChanges({ isDirty });
 *
 *   return <form>...</form>;
 * }
 * ```
 */

export interface UseUnsavedChangesOptions {
  /**
   * Whether there are unsaved changes
   */
  isDirty: boolean;
  /**
   * Custom message for the confirmation dialog
   * Note: Modern browsers ignore custom messages for beforeunload
   */
  message?: string;
  /**
   * Callback when user confirms navigation (leaves without saving)
   */
  onConfirmLeave?: () => void;
  /**
   * Callback when user cancels navigation (stays on page)
   */
  onCancelLeave?: () => void;
  /**
   * Whether to show the browser's native dialog for page refresh/close
   * Default: true
   */
  enableBrowserWarning?: boolean;
}

export function useUnsavedChanges({
  isDirty,
  message = "You have unsaved changes. Are you sure you want to leave?",
  onConfirmLeave,
  onCancelLeave,
  enableBrowserWarning = true,
}: UseUnsavedChangesOptions) {
  const isDirtyRef = useRef(isDirty);

  // Keep ref in sync with isDirty state
  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  /**
   * Handle browser beforeunload event (refresh, close tab, navigate away)
   */
  useEffect(() => {
    if (!enableBrowserWarning) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current) {
        // Modern browsers show a generic message regardless of returnValue
        e.preventDefault();
        // For older browsers (returnValue is deprecated but still needed for Safari)
        // eslint-disable-next-line deprecation/deprecation
        (e as BeforeUnloadEvent).returnValue = message;
        return message;
      }
    };

    globalThis.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      globalThis.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [enableBrowserWarning, message]);

  /**
   * Confirm navigation programmatically
   * Use this when you need to navigate and want to check for unsaved changes first
   */
  const confirmNavigation = useCallback(
    (onConfirm: () => void): boolean => {
      if (!isDirtyRef.current) {
        onConfirm();
        return true;
      }

      // Use browser confirm dialog
      // For a better UX, consider using a custom dialog component
      const confirmed = globalThis.confirm(message);

      if (confirmed) {
        onConfirmLeave?.();
        onConfirm();
        return true;
      } else {
        onCancelLeave?.();
        return false;
      }
    },
    [message, onConfirmLeave, onCancelLeave]
  );

  /**
   * Check if there are unsaved changes
   */
  const hasUnsavedChanges = useCallback(() => isDirtyRef.current, []);

  return {
    /**
     * Whether there are currently unsaved changes
     */
    isDirty,
    /**
     * Confirm navigation with unsaved changes check
     */
    confirmNavigation,
    /**
     * Check if there are unsaved changes
     */
    hasUnsavedChanges,
    /**
     * The warning message
     */
    message,
  };
}

/**
 * useUnsavedChangesRouter - Hook that wraps router to warn about unsaved changes
 *
 * Provides a wrapped router that intercepts push/replace to show warnings.
 *
 * @example
 * ```tsx
 * function EditForm() {
 *   const [isDirty, setIsDirty] = useState(false);
 *   const { push, replace, back } = useUnsavedChangesRouter({ isDirty });
 *
 *   const handleCancel = () => {
 *     // This will show a warning if there are unsaved changes
 *     back();
 *   };
 *
 *   return <form>...</form>;
 * }
 * ```
 */
export function useUnsavedChangesRouter(
  options: Pick<UseUnsavedChangesOptions, "isDirty" | "message">
) {
  const router = useRouter();
  const { confirmNavigation } = useUnsavedChanges(options);

  const safeRouter = {
    /**
     * Navigate to a URL, showing warning if there are unsaved changes
     */
    push: (url: string) => {
      confirmNavigation(() => router.push(url));
    },
    /**
     * Replace current URL, showing warning if there are unsaved changes
     */
    replace: (url: string) => {
      confirmNavigation(() => router.replace(url));
    },
    /**
     * Go back, showing warning if there are unsaved changes
     */
    back: () => {
      confirmNavigation(() => router.back());
    },
    /**
     * Go forward, showing warning if there are unsaved changes
     */
    forward: () => {
      confirmNavigation(() => router.forward());
    },
    /**
     * Access the underlying router for operations that shouldn't warn
     */
    unsafe: router,
    /**
     * Refresh the page (will trigger browser warning if dirty)
     */
    refresh: () => router.refresh(),
    /**
     * Prefetch a route (no warning needed)
     */
    prefetch: (url: string) => router.prefetch(url),
  };

  return safeRouter;
}

/**
 * useFormDirtyState - Utility hook for tracking form dirty state
 *
 * Provides a simple way to track if a form has been modified.
 *
 * @example
 * ```tsx
 * function EditForm() {
 *   const { isDirty, setIsDirty, markDirty, reset } = useFormDirtyState();
 *
 *   useUnsavedChanges({ isDirty });
 *
 *   const handleSave = async () => {
 *     await saveData();
 *     reset(); // Clear dirty state after save
 *   };
 *
 *   return (
 *     <form onChange={markDirty}>
 *       <input />
 *       <button onClick={handleSave}>Save</button>
 *     </form>
 *   );
 * }
 * ```
 */
export function useFormDirtyState(initialValue = false) {
  const [isDirty, setIsDirty] = useState(initialValue);

  const markDirty = useCallback(() => {
    setIsDirty(true);
  }, []);

  const reset = useCallback(() => {
    setIsDirty(false);
  }, []);

  return {
    isDirty,
    setIsDirty,
    markDirty,
    reset,
  };
}
