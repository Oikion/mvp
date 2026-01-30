"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * AriaLive - Accessible live region for dynamic content announcements
 *
 * ARIA live regions announce content changes to screen readers without
 * requiring focus. Essential for:
 * - Loading states
 * - Form validation errors
 * - Toast-like notifications
 * - Real-time updates
 *
 * @example
 * ```tsx
 * // Announce loading state changes
 * <AriaLive>
 *   {isLoading ? "Loading properties..." : "Properties loaded"}
 * </AriaLive>
 *
 * // Announce form errors (assertive for immediate attention)
 * <AriaLive politeness="assertive">
 *   {errors.email && "Email is required"}
 * </AriaLive>
 *
 * // Status region for background updates
 * <AriaLiveStatus>
 *   {connectionStatus === "offline" && "You are offline"}
 * </AriaLiveStatus>
 * ```
 */

export type AriaPoliteness = "polite" | "assertive" | "off";

export interface AriaLiveProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * How urgently the screen reader should announce changes
   * - polite: Waits for user to finish current task (default)
   * - assertive: Interrupts immediately (use sparingly)
   * - off: Disables announcements
   */
  politeness?: AriaPoliteness;
  /**
   * Whether changes should be atomic (announce entire region)
   * @default true
   */
  atomic?: boolean;
  /**
   * What types of changes to announce
   * - additions: New content added
   * - removals: Content removed
   * - text: Text changes
   * - all: All changes
   * @default "additions text"
   */
  relevant?: "additions" | "removals" | "text" | "all" | "additions text" | "additions removals";
  /**
   * Visually hidden (screen reader only)
   * @default false
   */
  visuallyHidden?: boolean;
}

export function AriaLive({
  children,
  politeness = "polite",
  atomic = true,
  relevant = "additions text",
  visuallyHidden = false,
  className,
  ...props
}: Readonly<AriaLiveProps>) {
  return (
    <output
      aria-live={politeness}
      aria-atomic={atomic}
      aria-relevant={relevant}
      className={cn(
        visuallyHidden && "sr-only",
        className
      )}
      {...props}
    >
      {children}
    </output>
  );
}

/**
 * AriaLiveStatus - Visually hidden status announcements
 *
 * Pre-configured for common status updates that should be
 * announced but not visible.
 *
 * @example
 * ```tsx
 * <AriaLiveStatus>
 *   {itemCount} items selected
 * </AriaLiveStatus>
 * ```
 */
export function AriaLiveStatus({
  children,
  className,
  ...props
}: Readonly<Omit<AriaLiveProps, "visuallyHidden" | "politeness">>) {
  return (
    <AriaLive
      politeness="polite"
      visuallyHidden
      className={className}
      {...props}
    >
      {children}
    </AriaLive>
  );
}

/**
 * AriaLiveAlert - Assertive announcements for critical updates
 *
 * Use for errors or time-sensitive information that requires
 * immediate attention.
 *
 * @example
 * ```tsx
 * <AriaLiveAlert>
 *   {submitError && "Failed to save. Please try again."}
 * </AriaLiveAlert>
 * ```
 */
export function AriaLiveAlert({
  children,
  className,
  ...props
}: Readonly<Omit<AriaLiveProps, "politeness">>) {
  return (
    <AriaLive
      role="alert"
      politeness="assertive"
      className={className}
      {...props}
    >
      {children}
    </AriaLive>
  );
}

/**
 * useAriaAnnounce - Hook for programmatic announcements
 *
 * Creates a live region and provides a function to announce messages.
 * Useful when you need to announce something that isn't rendered in JSX.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { announce, LiveRegion } = useAriaAnnounce();
 *
 *   const handleSave = async () => {
 *     await saveData();
 *     announce("Changes saved successfully");
 *   };
 *
 *   return (
 *     <>
 *       <button onClick={handleSave}>Save</button>
 *       <LiveRegion />
 *     </>
 *   );
 * }
 * ```
 */
export function useAriaAnnounce(options?: {
  politeness?: AriaPoliteness;
  clearDelay?: number;
}) {
  const { politeness = "polite", clearDelay = 5000 } = options ?? {};
  const [message, setMessage] = React.useState<string | null>(null);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const announce = React.useCallback(
    (text: string) => {
      // Clear any pending timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set the message
      setMessage(text);

      // Clear after delay
      timeoutRef.current = setTimeout(() => {
        setMessage(null);
      }, clearDelay);
    },
    [clearDelay]
  );

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Live region component
  const LiveRegion = React.useCallback(
    () => (
      <AriaLive politeness={politeness} visuallyHidden>
        {message}
      </AriaLive>
    ),
    [message, politeness]
  );

  return {
    announce,
    message,
    LiveRegion,
  };
}

/**
 * AriaLiveLog - Append-only log of announcements
 *
 * Use for chat messages, notifications lists, or activity feeds
 * where each new item should be announced.
 *
 * @example
 * ```tsx
 * <AriaLiveLog>
 *   {messages.map(msg => (
 *     <div key={msg.id}>{msg.text}</div>
 *   ))}
 * </AriaLiveLog>
 * ```
 */
export function AriaLiveLog({
  children,
  className,
  ...props
}: Readonly<Omit<AriaLiveProps, "relevant" | "atomic">>) {
  return (
    <AriaLive
      relevant="additions"
      atomic={false}
      className={className}
      {...props}
    >
      {children}
    </AriaLive>
  );
}

/**
 * AriaLiveContext - Context for global announcements
 */
interface AriaLiveContextValue {
  announce: (message: string, politeness?: AriaPoliteness) => void;
}

const AriaLiveContext = React.createContext<AriaLiveContextValue | null>(null);

/**
 * useAriaLive - Hook to access global announcement function
 *
 * @example
 * ```tsx
 * function SaveButton() {
 *   const { announce } = useAriaLive();
 *
 *   const handleSave = async () => {
 *     await saveData();
 *     announce("Changes saved successfully");
 *   };
 *
 *   return <button onClick={handleSave}>Save</button>;
 * }
 * ```
 */
export function useAriaLive() {
  const context = React.useContext(AriaLiveContext);
  if (!context) {
    throw new Error("useAriaLive must be used within an AriaLiveProvider");
  }
  return context;
}

/**
 * AriaLiveProvider - Global provider for screen reader announcements
 *
 * Wrap your app with this provider to enable global announcements
 * from any component using the useAriaLive hook.
 *
 * @example
 * ```tsx
 * <AriaLiveProvider>
 *   <App />
 * </AriaLiveProvider>
 * ```
 */
interface AriaLiveProviderProps {
  children: React.ReactNode;
  /** Time in ms before clearing the announcement */
  clearDelay?: number;
}

export function AriaLiveProvider({
  children,
  clearDelay = 5000,
}: Readonly<AriaLiveProviderProps>) {
  const [message, setMessage] = React.useState<string | null>(null);
  const [currentPoliteness, setCurrentPoliteness] = React.useState<AriaPoliteness>("polite");
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const announce = React.useCallback(
    (text: string, politeness: AriaPoliteness = "polite") => {
      // Clear any pending timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set the message and politeness
      setMessage(text);
      setCurrentPoliteness(politeness);

      // Clear after delay
      timeoutRef.current = setTimeout(() => {
        setMessage(null);
      }, clearDelay);
    },
    [clearDelay]
  );

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const value = React.useMemo(() => ({ announce }), [announce]);

  return (
    <AriaLiveContext.Provider value={value}>
      {children}
      <AriaLive politeness={currentPoliteness} visuallyHidden>
        {message}
      </AriaLive>
    </AriaLiveContext.Provider>
  );
}

export default AriaLive;
