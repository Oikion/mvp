"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { createElement } from "react";
import * as e2ee from "@/lib/e2ee";
import type { PreKeyBundle, EncryptedDMPayload, EncryptedGroupPayload } from "@/lib/e2ee/types";

// ─── Types ────────────────────────────────────

interface E2EEState {
  /** Whether the user has completed E2EE setup (identity key exists on server) */
  isSetUp: boolean;
  /** Whether the PIN has been entered and KEK is in memory */
  isUnlocked: boolean;
  /** Loading during setup/unlock operations */
  isLoading: boolean;
  /** Last error message */
  error: string | null;
}

interface E2EEActions {
  /** First-time setup: generate keys, wrap with PIN, upload to server */
  setup: (pin: string) => Promise<void>;
  /** Unlock E2EE with PIN */
  unlock: (pin: string) => Promise<void>;
  /** Lock E2EE — clear all in-memory crypto state */
  lock: () => void;
  /** Encrypt a DM message */
  encryptDM: (conversationId: string, plaintext: string) => Promise<EncryptedDMPayload>;
  /** Decrypt a DM message */
  decryptDM: (conversationId: string, payload: EncryptedDMPayload) => Promise<string>;
  /** Encrypt a group/channel message */
  encryptGroup: (targetId: string, plaintext: string) => Promise<EncryptedGroupPayload>;
  /** Decrypt a group/channel message */
  decryptGroup: (sessionId: string, messageIndex: number, ciphertext: string, iv: string) => Promise<string>;
  /** Encrypt a file attachment */
  encryptFile: (file: Blob) => Promise<{ encryptedBlob: Blob; fileKey: string; iv: string }>;
  /** Decrypt a file attachment */
  decryptFile: (encryptedBlob: Blob, fileKey: string, iv: string) => Promise<Blob>;
  /** Check if group session needs rotation */
  needsGroupRotation: (targetId: string) => Promise<boolean>;
  /** Clear all E2EE data (logout) */
  clearAll: () => Promise<void>;
}

type E2EEContextValue = E2EEState & E2EEActions;

// ─── Context ──────────────────────────────────

const E2EEContext = createContext<E2EEContextValue | null>(null);

// ─── Provider ─────────────────────────────────

const MIN_PREKEY_COUNT = 5;
const PREKEY_REPLENISH_COUNT = 10;

export function E2EEProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<E2EEState>({
    isSetUp: false,
    isUnlocked: false,
    isLoading: true,
    error: null,
  });

  // Check if user has E2EE set up on mount
  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const res = await fetch("/api/e2ee/identity");
        const data = res.ok ? await res.json() : null;
        if (!cancelled) {
          setState((s) => ({
            ...s,
            isSetUp: data?.isSetUp === true,
            isLoading: false,
          }));
        }
      } catch {
        if (!cancelled) {
          setState((s) => ({ ...s, isLoading: false }));
        }
      }
    }
    check();
    return () => { cancelled = true; };
  }, []);

  // Auto-replenish one-time pre-keys when unlocked
  useEffect(() => {
    if (!state.isUnlocked) return;
    let cancelled = false;

    async function replenish() {
      try {
        const res = await fetch("/api/e2ee/prekeys/count");
        if (!res.ok || cancelled) return;
        const { count } = await res.json();
        if (count < MIN_PREKEY_COUNT) {
          const newKeys = await e2ee.generatePreKeys(PREKEY_REPLENISH_COUNT);
          await fetch("/api/e2ee/prekeys", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              preKeys: newKeys.map((k) => ({
                type: "ONE_TIME",
                publicKey: k.publicKey,
              })),
            }),
          });
        }
      } catch {
        // Silent — pre-key replenishment is best-effort
      }
    }
    replenish();
    return () => { cancelled = true; };
  }, [state.isUnlocked]);

  const setup = useCallback(async (pin: string) => {
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      // Fetch pepper from server
      const pepperRes = await fetch("/api/e2ee/pepper");
      if (!pepperRes.ok) throw new Error("Failed to fetch pepper");
      const { pepper } = await pepperRes.json();

      // Generate identity + pre-keys
      const result = await e2ee.setupIdentity(pin, pepper);

      // Upload to server
      const setupRes = await fetch("/api/e2ee/identity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicKey: result.publicKey,
          wrappedPrivateKey: result.wrappedPrivateKey,
          salt: result.salt,
          pbkdfIterations: 100_000,
          signedPreKey: result.signedPreKey,
          oneTimePreKeys: result.oneTimePreKeys.map((k) => k.publicKey),
        }),
      });
      if (!setupRes.ok) throw new Error("Failed to upload identity");

      setState((s) => ({ ...s, isSetUp: true, isLoading: false }));
    } catch (err) {
      setState((s) => ({
        ...s,
        isLoading: false,
        error: err instanceof Error ? err.message : "Setup failed",
      }));
      throw err;
    }
  }, []);

  const unlock = useCallback(async (pin: string) => {
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      // Fetch identity + pepper in parallel
      const [identityRes, pepperRes] = await Promise.all([
        fetch("/api/e2ee/identity"),
        fetch("/api/e2ee/pepper"),
      ]);
      if (!identityRes.ok) throw new Error("Failed to fetch identity");
      if (!pepperRes.ok) throw new Error("Failed to fetch pepper");

      const identity = await identityRes.json();
      const { pepper } = await pepperRes.json();

      await e2ee.unlock(
        identity.userId,
        pin,
        pepper,
        identity.wrappedPrivateKey,
        identity.salt,
        identity.publicKey,
      );

      setState((s) => ({ ...s, isUnlocked: true, isLoading: false }));
    } catch (err) {
      setState((s) => ({
        ...s,
        isLoading: false,
        error: err instanceof Error ? err.message : "Unlock failed",
      }));
      throw err;
    }
  }, []);

  const lockAction = useCallback(() => {
    e2ee.lock();
    setState((s) => ({ ...s, isUnlocked: false }));
  }, []);

  const encryptDM = useCallback(
    (conversationId: string, plaintext: string) => e2ee.encryptDM(conversationId, plaintext),
    [],
  );

  const decryptDM = useCallback(
    (conversationId: string, payload: EncryptedDMPayload) => e2ee.decryptDM(conversationId, payload),
    [],
  );

  const encryptGroup = useCallback(
    (targetId: string, plaintext: string) => e2ee.encryptGroup(targetId, plaintext),
    [],
  );

  const decryptGroup = useCallback(
    (sessionId: string, messageIndex: number, ciphertext: string, iv: string) =>
      e2ee.decryptGroup(sessionId, messageIndex, ciphertext, iv),
    [],
  );

  const encryptFile = useCallback(
    (file: Blob) => e2ee.encryptAttachment(file),
    [],
  );

  const decryptFile = useCallback(
    (encryptedBlob: Blob, fileKey: string, iv: string) =>
      e2ee.decryptAttachment(encryptedBlob, fileKey, iv),
    [],
  );

  const needsGroupRotation = useCallback(
    (targetId: string) => e2ee.needsGroupRotation(targetId),
    [],
  );

  const clearAll = useCallback(async () => {
    await e2ee.clearAll();
    setState({ isSetUp: false, isUnlocked: false, isLoading: false, error: null });
  }, []);

  const value: E2EEContextValue = {
    ...state,
    setup,
    unlock,
    lock: lockAction,
    encryptDM,
    decryptDM,
    encryptGroup,
    decryptGroup,
    encryptFile,
    decryptFile,
    needsGroupRotation,
    clearAll,
  };

  return createElement(E2EEContext.Provider, { value }, children);
}

// ─── Hook ─────────────────────────────────────

export function useE2EE(): E2EEContextValue {
  const ctx = useContext(E2EEContext);
  if (!ctx) {
    throw new Error("useE2EE must be used within an E2EEProvider");
  }
  return ctx;
}
