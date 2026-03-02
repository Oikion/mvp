"use client";

import { useEffect, useRef, useCallback, useState } from "react";

interface UseIdleTimerOptions {
  /** Timeout duration in milliseconds (default: 5 minutes) */
  timeout?: number;
  /** Callback when idle timeout is reached */
  onIdle: () => void;
  /** Callback when user becomes active after being idle */
  onActive?: () => void;
  /** Warning threshold in milliseconds before timeout (default: 60 seconds) */
  warningThreshold?: number;
  /** Callback when warning threshold is reached */
  onWarning?: (remainingMs: number) => void;
  /** Whether the timer is enabled (default: true) */
  enabled?: boolean;
  /** Events to listen for activity (default: mouse, keyboard, touch) */
  events?: string[];
}

interface UseIdleTimerResult {
  /** Whether the user is currently idle */
  isIdle: boolean;
  /** Whether we're in the warning period */
  isWarning: boolean;
  /** Remaining time in milliseconds (null if not active) */
  remainingTime: number | null;
  /** Reset the timer */
  reset: () => void;
  /** Pause the timer */
  pause: () => void;
  /** Resume the timer */
  resume: () => void;
  /** Whether the timer is paused */
  isPaused: boolean;
}

const DEFAULT_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "touchstart",
  "scroll",
  "wheel",
];

const DEFAULT_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const DEFAULT_WARNING_THRESHOLD = 60 * 1000; // 1 minute

/**
 * Hook for detecting user inactivity and triggering callbacks
 * 
 * @example
 * ```tsx
 * const { isIdle, remainingTime, reset } = useIdleTimer({
 *   timeout: 5 * 60 * 1000, // 5 minutes
 *   onIdle: () => lockEncryption(),
 *   onWarning: (remaining) => showWarning(remaining),
 *   warningThreshold: 60 * 1000, // 1 minute warning
 * });
 * ```
 */
export function useIdleTimer({
  timeout = DEFAULT_TIMEOUT,
  onIdle,
  onActive,
  warningThreshold = DEFAULT_WARNING_THRESHOLD,
  onWarning,
  enabled = true,
  events = DEFAULT_EVENTS,
}: UseIdleTimerOptions): UseIdleTimerResult {
  const [isIdle, setIsIdle] = useState(false);
  const [isWarning, setIsWarning] = useState(false);
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const wasWarningRef = useRef(false);

  // Clear all timers
  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  // Start the countdown interval for remaining time updates
  const startCountdown = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    countdownIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      const remaining = Math.max(0, timeout - elapsed);
      setRemainingTime(remaining);

      // Check warning threshold
      if (remaining <= warningThreshold && !wasWarningRef.current) {
        wasWarningRef.current = true;
        setIsWarning(true);
        onWarning?.(remaining);
      }

      // Update warning callback periodically
      if (remaining <= warningThreshold && remaining > 0) {
        onWarning?.(remaining);
      }

      if (remaining <= 0) {
        clearTimers();
        setIsIdle(true);
        onIdle();
      }
    }, 1000);
  }, [timeout, warningThreshold, onIdle, onWarning, clearTimers]);

  // Start the idle timer
  const startTimer = useCallback(() => {
    if (isPaused || !enabled) return;

    clearTimers();
    lastActivityRef.current = Date.now();
    setRemainingTime(timeout);
    setIsWarning(false);
    wasWarningRef.current = false;

    // Set up warning timeout
    if (warningThreshold > 0) {
      warningTimeoutRef.current = setTimeout(() => {
        setIsWarning(true);
        wasWarningRef.current = true;
        onWarning?.(warningThreshold);
      }, timeout - warningThreshold);
    }

    // Set up idle timeout
    timeoutRef.current = setTimeout(() => {
      clearTimers();
      setIsIdle(true);
      onIdle();
    }, timeout);

    // Start countdown for UI updates
    startCountdown();
  }, [timeout, warningThreshold, onIdle, onWarning, isPaused, enabled, clearTimers, startCountdown]);

  // Handle user activity
  const handleActivity = useCallback(() => {
    if (isPaused || !enabled) return;

    const wasIdle = isIdle;
    
    if (wasIdle) {
      setIsIdle(false);
      onActive?.();
    }

    startTimer();
  }, [isPaused, enabled, isIdle, onActive, startTimer]);

  // Reset the timer
  const reset = useCallback(() => {
    setIsIdle(false);
    setIsWarning(false);
    startTimer();
  }, [startTimer]);

  // Pause the timer
  const pause = useCallback(() => {
    setIsPaused(true);
    clearTimers();
    setRemainingTime(null);
  }, [clearTimers]);

  // Resume the timer
  const resume = useCallback(() => {
    setIsPaused(false);
    startTimer();
  }, [startTimer]);

  // Set up event listeners
  useEffect(() => {
    if (!enabled) {
      clearTimers();
      return;
    }

    // Add event listeners
    const handleEvent = () => handleActivity();

    events.forEach((event) => {
      document.addEventListener(event, handleEvent, { passive: true });
    });

    // Start initial timer
    startTimer();

    // Cleanup
    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleEvent);
      });
      clearTimers();
    };
  }, [enabled, events, handleActivity, startTimer, clearTimers]);

  return {
    isIdle,
    isWarning,
    remainingTime,
    reset,
    pause,
    resume,
    isPaused,
  };
}

/**
 * Format remaining time as MM:SS
 */
export function formatRemainingTime(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
