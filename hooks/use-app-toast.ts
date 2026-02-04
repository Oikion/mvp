"use client";

import { useTranslations } from "next-intl";
import { toast as sonnerToast } from "sonner";
import { useCallback } from "react";

/**
 * Toast translation keys from common.json
 * Add new keys here as they are added to the translation files
 */
export type ToastKey =
  | "success"
  | "error"
  | "warning"
  | "settingsSaved"
  | "settingsFailed"
  | "updateSuccess"
  | "updateFailed"
  | "deleteSuccess"
  | "deleteFailed"
  | "createSuccess"
  | "createFailed"
  | "loadFailed"
  | "networkError"
  | "sessionExpired"
  | "permissionDenied"
  | "linkCopied"
  | "copiedToClipboard"
  | "shareSuccess"
  | "shareFailed"
  | "uploadSuccess"
  | "uploadFailed"
  | "connectionSuccess"
  | "connectionFailed"
  | "eventDeleted"
  | "eventDeleteFailed"
  | "commentAdded"
  | "commentDeleted"
  | "commentFailed"
  | "linkEntitiesFailed"
  | "unlinkSuccess"
  | "unlinkFailed"
  | "statusUpdated"
  | "statusUpdateFailed"
  | "priceUpdated"
  | "priceUpdateFailed"
  | "sharingEnabled"
  | "shareSettingsUpdated"
  | "messageSent"
  | "responseReceived"
  | "noApiKey"
  | "privacyUpdated"
  | "privacyFailed"
  | "notificationSettingsLoaded"
  | "notificationSettingsFailed"
  | "notificationSettingsSaved"
  | "notificationSettingsSaveFailed";

export interface ToastOptions {
  /**
   * Description shown below the title
   */
  description?: string;
  /**
   * Duration in milliseconds. Default: 4000
   */
  duration?: number;
  /**
   * Action button configuration
   */
  action?: {
    label: string;
    onClick: () => void;
  };
  /**
   * Called when toast is dismissed
   */
  onDismiss?: () => void;
  /**
   * Called when action button is clicked
   */
  onAutoClose?: () => void;
}

/**
 * Unified toast hook using Sonner with translation support
 *
 * @example
 * ```tsx
 * const { toast } = useAppToast();
 *
 * // Using translation keys
 * toast.success("updateSuccess");
 * toast.error("deleteFailed");
 *
 * // With custom message
 * toast.success("Custom success message", { isTranslationKey: false });
 *
 * // With description
 * toast.success("createSuccess", { description: "Property was created" });
 * ```
 */
export function useAppToast() {
  const t = useTranslations("toast");

  /**
   * Get translated message or return raw message
   */
  const getMessage = useCallback(
    (message: string, isTranslationKey: boolean = true): string => {
      if (!isTranslationKey) {
        return message;
      }
      try {
        return t(message as ToastKey);
      } catch {
        // Fallback to raw message if translation key not found
        return message;
      }
    },
    [t]
  );

  /**
   * Show a success toast
   */
  const success = useCallback(
    (
      message: ToastKey | string,
      options?: ToastOptions & { isTranslationKey?: boolean }
    ) => {
      const { isTranslationKey = true, ...toastOptions } = options ?? {};
      return sonnerToast.success(getMessage(message, isTranslationKey), {
        description: toastOptions.description,
        duration: toastOptions.duration,
        action: toastOptions.action
          ? {
              label: toastOptions.action.label,
              onClick: toastOptions.action.onClick,
            }
          : undefined,
        onDismiss: toastOptions.onDismiss,
        onAutoClose: toastOptions.onAutoClose,
      });
    },
    [getMessage]
  );

  /**
   * Show an error toast
   */
  const error = useCallback(
    (
      message: ToastKey | string,
      options?: ToastOptions & { isTranslationKey?: boolean }
    ) => {
      const { isTranslationKey = true, ...toastOptions } = options ?? {};
      return sonnerToast.error(getMessage(message, isTranslationKey), {
        description: toastOptions.description,
        duration: toastOptions.duration ?? 6000, // Longer duration for errors
        action: toastOptions.action
          ? {
              label: toastOptions.action.label,
              onClick: toastOptions.action.onClick,
            }
          : undefined,
        onDismiss: toastOptions.onDismiss,
        onAutoClose: toastOptions.onAutoClose,
      });
    },
    [getMessage]
  );

  /**
   * Show a warning toast
   */
  const warning = useCallback(
    (
      message: ToastKey | string,
      options?: ToastOptions & { isTranslationKey?: boolean }
    ) => {
      const { isTranslationKey = true, ...toastOptions } = options ?? {};
      return sonnerToast.warning(getMessage(message, isTranslationKey), {
        description: toastOptions.description,
        duration: toastOptions.duration ?? 5000,
        action: toastOptions.action
          ? {
              label: toastOptions.action.label,
              onClick: toastOptions.action.onClick,
            }
          : undefined,
        onDismiss: toastOptions.onDismiss,
        onAutoClose: toastOptions.onAutoClose,
      });
    },
    [getMessage]
  );

  /**
   * Show an info toast
   */
  const info = useCallback(
    (
      message: ToastKey | string,
      options?: ToastOptions & { isTranslationKey?: boolean }
    ) => {
      const { isTranslationKey = true, ...toastOptions } = options ?? {};
      return sonnerToast.info(getMessage(message, isTranslationKey), {
        description: toastOptions.description,
        duration: toastOptions.duration,
        action: toastOptions.action
          ? {
              label: toastOptions.action.label,
              onClick: toastOptions.action.onClick,
            }
          : undefined,
        onDismiss: toastOptions.onDismiss,
        onAutoClose: toastOptions.onAutoClose,
      });
    },
    [getMessage]
  );

  /**
   * Show a loading toast that can be updated
   */
  const loading = useCallback(
    (message: string, options?: { description?: string }) => {
      return sonnerToast.loading(message, {
        description: options?.description,
      });
    },
    []
  );

  /**
   * Show a promise toast that auto-updates based on promise state
   */
  const promise = useCallback(
    <T>(
      promiseOrFunction: Promise<T> | (() => Promise<T>),
      options: {
        loading: string;
        success: ToastKey | string | ((data: T) => string);
        error: ToastKey | string | ((error: Error) => string);
        isTranslationKey?: boolean;
      }
    ) => {
      const { isTranslationKey = true } = options;

      return sonnerToast.promise(promiseOrFunction, {
        loading: options.loading,
        success: (data) => {
          if (typeof options.success === "function") {
            return options.success(data);
          }
          return getMessage(options.success, isTranslationKey);
        },
        error: (err) => {
          if (typeof options.error === "function") {
            return options.error(err);
          }
          return getMessage(options.error, isTranslationKey);
        },
      });
    },
    [getMessage]
  );

  /**
   * Dismiss a toast by ID or dismiss all toasts
   */
  const dismiss = useCallback((toastId?: string | number) => {
    sonnerToast.dismiss(toastId);
  }, []);

  return {
    toast: {
      success,
      error,
      warning,
      info,
      loading,
      promise,
      dismiss,
      /**
       * Direct access to sonner for advanced use cases
       */
      raw: sonnerToast,
    },
  };
}

/**
 * Non-hook version for use in non-component contexts (server actions, etc.)
 * Note: This doesn't use translations - use raw messages
 */
export const appToast = {
  success: (message: string, options?: Omit<ToastOptions, "action">) =>
    sonnerToast.success(message, options),
  error: (message: string, options?: Omit<ToastOptions, "action">) =>
    sonnerToast.error(message, { ...options, duration: options?.duration ?? 6000 }),
  warning: (message: string, options?: Omit<ToastOptions, "action">) =>
    sonnerToast.warning(message, { ...options, duration: options?.duration ?? 5000 }),
  info: (message: string, options?: Omit<ToastOptions, "action">) =>
    sonnerToast.info(message, options),
  loading: (message: string, options?: { description?: string }) =>
    sonnerToast.loading(message, options),
  dismiss: (toastId?: string | number) => sonnerToast.dismiss(toastId),
  raw: sonnerToast,
};
