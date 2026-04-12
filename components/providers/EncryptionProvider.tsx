"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import {
  deriveKEK,
  base64ToSalt,
  unwrapKey,
  encryptField,
  decryptField,
  encryptJSON,
  decryptJSON,
  isEncrypted,
} from "@/lib/crypto";
import { getUserWrappedKey, getOrganizationEncryptionStatus } from "@/actions/encryption";

// =============================================================================
// Types
// =============================================================================

interface EncryptionContextValue {
  /** Whether encryption is enabled for the organization */
  isEnabled: boolean;
  /** Whether the user has been granted encryption access */
  hasAccess: boolean;
  /** Whether the encryption key is currently unlocked */
  isUnlocked: boolean;
  /** Whether we're currently loading encryption status */
  isLoading: boolean;
  /** Error message if any operation failed */
  error: string | null;
  /** Unlock the encryption key with a passphrase */
  unlock: (passphrase: string) => Promise<boolean>;
  /** Lock the encryption key (clear from memory) */
  lock: () => void;
  /** Encrypt a string field */
  encrypt: (plaintext: string) => Promise<string>;
  /** Decrypt a string field */
  decrypt: (ciphertext: string) => Promise<string>;
  /** Encrypt a JSON object */
  encryptObject: <T>(obj: T) => Promise<string>;
  /** Decrypt a JSON object */
  decryptObject: <T>(ciphertext: string) => Promise<T>;
  /** Check if a value is encrypted */
  isFieldEncrypted: (value: string | null | undefined) => boolean;
  /** Remaining time before auto-lock (seconds) */
  remainingTime: number | null;
  /** Reset the idle timer */
  resetIdleTimer: () => void;
  /** Refresh encryption status from server */
  refreshStatus: () => Promise<void>;
}

const EncryptionContext = createContext<EncryptionContextValue | null>(null);

// =============================================================================
// Constants
// =============================================================================

const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

// =============================================================================
// Provider Component
// =============================================================================

interface EncryptionProviderProps {
  children: ReactNode;
}

export function EncryptionProvider({ children }: EncryptionProviderProps) {
  // State
  const [isEnabled, setIsEnabled] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [remainingTime, setRemainingTime] = useState<number | null>(null);

  // Refs for the encryption key (never stored in state to avoid React DevTools exposure)
  const omk = useRef<CryptoKey | null>(null);
  const wrappedKeyData = useRef<{ wrappedKey: string; salt: string } | null>(null);

  // Idle timer refs
  const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // =============================================================================
  // Idle Timer Management
  // =============================================================================

  const clearTimers = useCallback(() => {
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
      idleTimeoutRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setRemainingTime(null);
  }, []);

  const lock = useCallback(() => {
    omk.current = null;
    setIsUnlocked(false);
    setError(null);
    clearTimers();
  }, [clearTimers]);

  const startIdleTimer = useCallback(() => {
    clearTimers();
    lastActivityRef.current = Date.now();

    // Set up countdown interval
    countdownIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      const remaining = Math.max(0, IDLE_TIMEOUT_MS - elapsed);
      setRemainingTime(Math.ceil(remaining / 1000));

      if (remaining <= 0) {
        lock();
      }
    }, 1000);

    // Set up auto-lock timeout
    idleTimeoutRef.current = setTimeout(() => {
      lock();
    }, IDLE_TIMEOUT_MS);
  }, [clearTimers, lock]);

  const resetIdleTimer = useCallback(() => {
    if (isUnlocked) {
      lastActivityRef.current = Date.now();
      startIdleTimer();
    }
  }, [isUnlocked, startIdleTimer]);

  // =============================================================================
  // Encryption Status
  // =============================================================================

  const refreshStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      const statusResult = await getOrganizationEncryptionStatus();
      
      if (statusResult.success && statusResult.data) {
        setIsEnabled(statusResult.data.isEnabled);
        setHasAccess(statusResult.data.userHasAccess);
      }

      // Get user's wrapped key if they have access
      if (statusResult.success && statusResult.data?.userHasAccess) {
        const keyResult = await getUserWrappedKey();
        if (keyResult.success && keyResult.data) {
          wrappedKeyData.current = {
            wrappedKey: keyResult.data.wrappedKey,
            salt: keyResult.data.salt,
          };
        }
      }
    } catch (err) {
      console.error("[EncryptionProvider] Failed to refresh status:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  // =============================================================================
  // Unlock / Lock
  // =============================================================================

  const unlock = useCallback(async (passphrase: string): Promise<boolean> => {
    if (!wrappedKeyData.current) {
      setError("No encryption key available");
      return false;
    }

    try {
      setError(null);

      // Derive KEK from passphrase
      const salt = base64ToSalt(wrappedKeyData.current.salt);
      const kek = await deriveKEK(passphrase, salt);

      // Unwrap OMK
      const unwrappedOMK = await unwrapKey(wrappedKeyData.current.wrappedKey, kek);

      // Store in ref (not state)
      omk.current = unwrappedOMK;
      setIsUnlocked(true);

      // Start idle timer
      startIdleTimer();

      return true;
    } catch (err) {
      console.error("[EncryptionProvider] Failed to unlock:", err);
      setError("Invalid passphrase");
      return false;
    }
  }, [startIdleTimer]);

  // =============================================================================
  // Encrypt / Decrypt Functions
  // =============================================================================

  const encrypt = useCallback(async (plaintext: string): Promise<string> => {
    if (!omk.current) {
      throw new Error("Encryption not unlocked");
    }
    return encryptField(plaintext, omk.current);
  }, []);

  const decrypt = useCallback(async (ciphertext: string): Promise<string> => {
    if (!omk.current) {
      throw new Error("Encryption not unlocked");
    }
    return decryptField(ciphertext, omk.current);
  }, []);

  const encryptObject = useCallback(async <T,>(obj: T): Promise<string> => {
    if (!omk.current) {
      throw new Error("Encryption not unlocked");
    }
    return encryptJSON(obj, omk.current);
  }, []);

  const decryptObject = useCallback(async <T,>(ciphertext: string): Promise<T> => {
    if (!omk.current) {
      throw new Error("Encryption not unlocked");
    }
    return decryptJSON<T>(ciphertext, omk.current);
  }, []);

  const isFieldEncrypted = useCallback((value: string | null | undefined): boolean => {
    return isEncrypted(value);
  }, []);

  // =============================================================================
  // Cleanup on unmount
  // =============================================================================

  useEffect(() => {
    return () => {
      clearTimers();
      omk.current = null;
    };
  }, [clearTimers]);

  // =============================================================================
  // Context Value
  // =============================================================================

  const value: EncryptionContextValue = {
    isEnabled,
    hasAccess,
    isUnlocked,
    isLoading,
    error,
    unlock,
    lock,
    encrypt,
    decrypt,
    encryptObject,
    decryptObject,
    isFieldEncrypted,
    remainingTime,
    resetIdleTimer,
    refreshStatus,
  };

  return (
    <EncryptionContext.Provider value={value}>
      {children}
    </EncryptionContext.Provider>
  );
}

// =============================================================================
// Hook
// =============================================================================

export function useEncryption(): EncryptionContextValue {
  const context = useContext(EncryptionContext);
  if (!context) {
    throw new Error("useEncryption must be used within an EncryptionProvider");
  }
  return context;
}

/**
 * Hook to check if encryption is available without throwing
 */
export function useEncryptionStatus() {
  const context = useContext(EncryptionContext);
  return {
    isAvailable: !!context,
    isEnabled: context?.isEnabled ?? false,
    isUnlocked: context?.isUnlocked ?? false,
    hasAccess: context?.hasAccess ?? false,
    isLoading: context?.isLoading ?? true,
  };
}
