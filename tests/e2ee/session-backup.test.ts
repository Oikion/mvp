import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Polyfill crypto for Node environment
import { webcrypto } from "node:crypto";
if (!globalThis.crypto) (globalThis as any).crypto = webcrypto;

// Mock session-store
vi.mock("@/lib/e2ee/session-store", () => ({
  storeRatchetSession: vi.fn().mockResolvedValue(undefined),
  storeMegolmOutbound: vi.fn().mockResolvedValue(undefined),
  storeMegolmInbound: vi.fn().mockResolvedValue(undefined),
  getBackupVersion: vi.fn().mockResolvedValue(0),
  setBackupVersion: vi.fn().mockResolvedValue(undefined),
}));

// Mock primitives to avoid real ECDH operations in Node test env
vi.mock("@/lib/e2ee/primitives", () => ({
  generateECDHKeyPair: vi.fn().mockResolvedValue({
    publicKey: { type: "public" },
    privateKey: { type: "private" },
  }),
  deriveSharedSecret: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
  hkdfDerive: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
  aesGcmEncrypt: vi.fn().mockImplementation(async (plaintext: BufferSource) => {
    // Just pass through the plaintext as "ciphertext" for testing
    const buf = plaintext instanceof ArrayBuffer
      ? plaintext
      : (plaintext as Uint8Array).buffer;
    return { ciphertext: buf, iv: new ArrayBuffer(12) };
  }),
  aesGcmDecrypt: vi.fn().mockImplementation(
    async (ciphertext: BufferSource) => {
      return ciphertext instanceof ArrayBuffer
        ? ciphertext
        : (ciphertext as Uint8Array).buffer;
    }
  ),
  exportPublicKey: vi.fn().mockResolvedValue("mock-eph-pub-key-base64"),
  importPublicKey: vi.fn().mockResolvedValue({ type: "public" }),
  bufferToBase64: vi.fn().mockImplementation((buf: ArrayBuffer) => {
    return Buffer.from(new Uint8Array(buf)).toString("base64");
  }),
  base64ToBuffer: vi.fn().mockImplementation((b64: string) => {
    const buf = Buffer.from(b64, "base64");
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  }),
}));

import {
  SessionBackupManager,
  eciesEncrypt,
  eciesDecrypt,
  type BackupManagerCallbacks,
} from "@/lib/e2ee/session-backup";
import {
  storeRatchetSession,
  storeMegolmOutbound,
  storeMegolmInbound,
  getBackupVersion,
  setBackupVersion,
} from "@/lib/e2ee/session-store";

// ─── Helpers ────────────────────────────────────

const mockPublicKey = { type: "public" } as unknown as CryptoKey;
const mockPrivateKey = { type: "private" } as unknown as CryptoKey;
const getPublicKey = vi.fn().mockResolvedValue(mockPublicKey);
const getPrivateKey = vi.fn().mockResolvedValue(mockPrivateKey);

function createManager(callbacks: BackupManagerCallbacks = {}): SessionBackupManager {
  return new SessionBackupManager(getPublicKey, getPrivateKey, callbacks);
}

// ─── Tests ──────────────────────────────────────

describe("SessionBackupManager", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();

    // Mock fetch
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        results: [{ sessionKey: "ratchet:conv_1", version: 1 }],
      }),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ─── markDirty + debounce ─────────────────────

  describe("markDirty", () => {
    it("adds entry to dirty map and increments dirtyCount", () => {
      const manager = createManager();
      expect(manager.dirtyCount).toBe(0);

      manager.markDirty("ratchet", "ratchet:conv_1", '{"state":"data"}');
      expect(manager.dirtyCount).toBe(1);

      manager.markDirty("megolm-out", "megolm-out:group_1", '{"state":"data2"}');
      expect(manager.dirtyCount).toBe(2);

      manager.destroy();
    });

    it("overwrites existing entry for same sessionKey", () => {
      const manager = createManager();

      manager.markDirty("ratchet", "ratchet:conv_1", '{"v":1}');
      manager.markDirty("ratchet", "ratchet:conv_1", '{"v":2}');
      expect(manager.dirtyCount).toBe(1);

      manager.destroy();
    });

    it("triggers flush after 5-second debounce", async () => {
      const manager = createManager();

      manager.markDirty("ratchet", "ratchet:conv_1", '{"state":"data"}');
      expect(fetch).not.toHaveBeenCalled();

      // Advance past debounce
      await vi.advanceTimersByTimeAsync(5_000);

      expect(fetch).toHaveBeenCalledWith("/api/e2ee/session-backups", expect.objectContaining({
        method: "POST",
      }));

      manager.destroy();
    });

    it("resets debounce timer on subsequent markDirty calls", async () => {
      const manager = createManager();

      manager.markDirty("ratchet", "ratchet:conv_1", '{"v":1}');

      // Advance 3 seconds — not enough to trigger
      await vi.advanceTimersByTimeAsync(3_000);
      expect(fetch).not.toHaveBeenCalled();

      // Mark dirty again — should reset timer
      manager.markDirty("ratchet", "ratchet:conv_1", '{"v":2}');

      // Advance another 3 seconds (6s total but only 3s since last markDirty)
      await vi.advanceTimersByTimeAsync(3_000);
      expect(fetch).not.toHaveBeenCalled();

      // Advance the remaining 2 seconds
      await vi.advanceTimersByTimeAsync(2_000);
      expect(fetch).toHaveBeenCalledTimes(1);

      manager.destroy();
    });
  });

  // ─── flush ────────────────────────────────────

  describe("flush", () => {
    it("sends correct batch structure to server", async () => {
      const manager = createManager();

      manager.markDirty("ratchet", "ratchet:conv_1", '{"ratchet":"state"}');
      manager.markDirty("megolm-out", "megolm-out:group_1", '{"megolm":"state"}');

      await manager.flush();

      expect(fetch).toHaveBeenCalledTimes(1);
      const [url, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toBe("/api/e2ee/session-backups");
      expect(options.method).toBe("POST");

      const body = JSON.parse(options.body);
      expect(body.backups).toHaveLength(2);
      expect(body.backups[0]).toEqual(expect.objectContaining({
        sessionKey: expect.any(String),
        sessionType: expect.any(String),
        eciesBlob: expect.any(String),
        ephemeralPubKey: expect.any(String),
        iv: expect.any(String),
      }));
    });

    it("updates backup versions after successful flush", async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          results: [
            { sessionKey: "ratchet:conv_1", version: 5 },
            { sessionKey: "megolm-out:group_1", version: 3 },
          ],
        }),
      });

      const manager = createManager();
      manager.markDirty("ratchet", "ratchet:conv_1", "data1");
      manager.markDirty("megolm-out", "megolm-out:group_1", "data2");

      await manager.flush();

      expect(setBackupVersion).toHaveBeenCalledWith("ratchet:conv_1", 5);
      expect(setBackupVersion).toHaveBeenCalledWith("megolm-out:group_1", 3);
    });

    it("resets consecutiveFailures on success", async () => {
      const manager = createManager();

      // Force a failure first
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: false, status: 500 });
      manager.markDirty("ratchet", "ratchet:conv_1", "data");
      await manager.flush();
      expect(manager.consecutiveFailures).toBe(1);

      // Now succeed
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          results: [{ sessionKey: "ratchet:conv_1", version: 1 }],
        }),
      });
      await manager.flush();
      expect(manager.consecutiveFailures).toBe(0);

      manager.destroy();
    });

    it("does nothing when dirty map is empty", async () => {
      const manager = createManager();
      await manager.flush();
      expect(fetch).not.toHaveBeenCalled();
      manager.destroy();
    });

    it("updates lastFlushedAt on success", async () => {
      const manager = createManager();
      expect(manager.lastFlushedAt).toBeNull();

      manager.markDirty("ratchet", "ratchet:conv_1", "data");
      await manager.flush();

      expect(manager.lastFlushedAt).toBeInstanceOf(Date);
      manager.destroy();
    });

    it("calls onSyncComplete callback on success", async () => {
      const onSyncComplete = vi.fn();
      const manager = createManager({ onSyncComplete });

      manager.markDirty("ratchet", "ratchet:conv_1", "data");
      await manager.flush();

      expect(onSyncComplete).toHaveBeenCalledTimes(1);
      manager.destroy();
    });
  });

  // ─── Consecutive failure counter ──────────────

  describe("consecutive failure counter", () => {
    it("increments on fetch error", async () => {
      const onFlushFailure = vi.fn();
      const manager = createManager({ onFlushFailure });

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, status: 500 });

      manager.markDirty("ratchet", "ratchet:conv_1", "data");
      await manager.flush();
      expect(manager.consecutiveFailures).toBe(1);
      expect(onFlushFailure).toHaveBeenCalledWith(1);

      // Flush again (entries re-added on failure)
      await manager.flush();
      expect(manager.consecutiveFailures).toBe(2);
      expect(onFlushFailure).toHaveBeenCalledWith(2);

      manager.destroy();
    });

    it("increments on network error (fetch throws)", async () => {
      const manager = createManager();

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Network error"));

      manager.markDirty("ratchet", "ratchet:conv_1", "data");
      await manager.flush();
      expect(manager.consecutiveFailures).toBe(1);

      manager.destroy();
    });

    it("re-adds failed entries to dirty map", async () => {
      const manager = createManager();

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, status: 500 });

      manager.markDirty("ratchet", "ratchet:conv_1", "data");
      expect(manager.dirtyCount).toBe(1);

      await manager.flush();
      // Entries should be re-added after failure
      expect(manager.dirtyCount).toBe(1);

      manager.destroy();
    });
  });

  // ─── flushOnUnload ────────────────────────────

  describe("flushOnUnload", () => {
    it("calls navigator.sendBeacon with correct URL", () => {
      const sendBeacon = vi.fn().mockReturnValue(true);
      Object.defineProperty(globalThis, "navigator", {
        value: { sendBeacon },
        writable: true,
        configurable: true,
      });

      const manager = createManager();
      manager.markDirty("ratchet", "ratchet:conv_1", "data");

      manager.flushOnUnload();

      expect(sendBeacon).toHaveBeenCalledTimes(1);
      expect(sendBeacon).toHaveBeenCalledWith(
        "/api/e2ee/session-backups/beacon",
        expect.any(Blob)
      );

      manager.destroy();
    });

    it("clears dirty map after sendBeacon", () => {
      const sendBeacon = vi.fn().mockReturnValue(true);
      Object.defineProperty(globalThis, "navigator", {
        value: { sendBeacon },
        writable: true,
        configurable: true,
      });

      const manager = createManager();
      manager.markDirty("ratchet", "ratchet:conv_1", "data");
      expect(manager.dirtyCount).toBe(1);

      manager.flushOnUnload();
      expect(manager.dirtyCount).toBe(0);

      manager.destroy();
    });

    it("does nothing when dirty map is empty", () => {
      const sendBeacon = vi.fn();
      Object.defineProperty(globalThis, "navigator", {
        value: { sendBeacon },
        writable: true,
        configurable: true,
      });

      const manager = createManager();
      manager.flushOnUnload();

      expect(sendBeacon).not.toHaveBeenCalled();
      manager.destroy();
    });
  });

  // ─── restoreAll ───────────────────────────────

  describe("restoreAll", () => {
    const mockKek = new ArrayBuffer(32);

    it("imports sessions when server version is newer", async () => {
      (getBackupVersion as ReturnType<typeof vi.fn>).mockResolvedValue(0);

      const ratchetState = '{"ratchet":"state"}';
      const megolmOutState = '{"megolm-out":"state"}';
      const megolmInState = '{"megolm-in":"state"}';

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          backups: [
            {
              sessionKey: "ratchet:conv_abc",
              sessionType: "ratchet",
              eciesBlob: Buffer.from(new TextEncoder().encode(ratchetState)).toString("base64"),
              ephemeralPubKey: "eph-key",
              iv: Buffer.from(new ArrayBuffer(12)).toString("base64"),
              version: 3,
            },
            {
              sessionKey: "megolm-out:group_xyz",
              sessionType: "megolm-out",
              eciesBlob: Buffer.from(new TextEncoder().encode(megolmOutState)).toString("base64"),
              ephemeralPubKey: "eph-key2",
              iv: Buffer.from(new ArrayBuffer(12)).toString("base64"),
              version: 2,
            },
            {
              sessionKey: "megolm-in:sess_123",
              sessionType: "megolm-in",
              eciesBlob: Buffer.from(new TextEncoder().encode(megolmInState)).toString("base64"),
              ephemeralPubKey: "eph-key3",
              iv: Buffer.from(new ArrayBuffer(12)).toString("base64"),
              version: 1,
            },
          ],
        }),
      });

      const manager = createManager();
      const result = await manager.restoreAll(mockKek);

      expect(result.restored).toBe(3);
      expect(result.skipped).toBe(0);
      expect(result.errors).toBe(0);

      // Verify correct store functions called with stripped keys
      expect(storeRatchetSession).toHaveBeenCalledWith("conv_abc", ratchetState, mockKek);
      expect(storeMegolmOutbound).toHaveBeenCalledWith("group_xyz", megolmOutState, mockKek);
      expect(storeMegolmInbound).toHaveBeenCalledWith("sess_123", megolmInState, mockKek);

      // Verify backup versions updated
      expect(setBackupVersion).toHaveBeenCalledWith("ratchet:conv_abc", 3);
      expect(setBackupVersion).toHaveBeenCalledWith("megolm-out:group_xyz", 2);
      expect(setBackupVersion).toHaveBeenCalledWith("megolm-in:sess_123", 1);

      manager.destroy();
    });

    it("skips sessions when local version >= server version", async () => {
      (getBackupVersion as ReturnType<typeof vi.fn>).mockResolvedValue(5);

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          backups: [
            {
              sessionKey: "ratchet:conv_1",
              sessionType: "ratchet",
              eciesBlob: Buffer.from("data").toString("base64"),
              ephemeralPubKey: "eph",
              iv: Buffer.from(new ArrayBuffer(12)).toString("base64"),
              version: 3,
            },
          ],
        }),
      });

      const manager = createManager();
      const result = await manager.restoreAll(mockKek);

      expect(result.restored).toBe(0);
      expect(result.skipped).toBe(1);
      expect(storeRatchetSession).not.toHaveBeenCalled();

      manager.destroy();
    });

    it("calls onConflictDetected when server has newer version for existing local backup", async () => {
      // Local version > 0 but < server version — conflict
      (getBackupVersion as ReturnType<typeof vi.fn>).mockResolvedValue(2);

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          backups: [
            {
              sessionKey: "ratchet:conv_1",
              sessionType: "ratchet",
              eciesBlob: Buffer.from(new TextEncoder().encode("newer-data")).toString("base64"),
              ephemeralPubKey: "eph",
              iv: Buffer.from(new ArrayBuffer(12)).toString("base64"),
              version: 5,
            },
          ],
        }),
      });

      const onConflictDetected = vi.fn();
      const manager = createManager({ onConflictDetected });
      await manager.restoreAll(mockKek);

      expect(onConflictDetected).toHaveBeenCalledTimes(1);
      manager.destroy();
    });

    it("calls onRestoreProgress during restore", async () => {
      (getBackupVersion as ReturnType<typeof vi.fn>).mockResolvedValue(0);

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          backups: [
            {
              sessionKey: "ratchet:conv_1",
              sessionType: "ratchet",
              eciesBlob: Buffer.from(new TextEncoder().encode("d1")).toString("base64"),
              ephemeralPubKey: "e",
              iv: Buffer.from(new ArrayBuffer(12)).toString("base64"),
              version: 1,
            },
            {
              sessionKey: "ratchet:conv_2",
              sessionType: "ratchet",
              eciesBlob: Buffer.from(new TextEncoder().encode("d2")).toString("base64"),
              ephemeralPubKey: "e",
              iv: Buffer.from(new ArrayBuffer(12)).toString("base64"),
              version: 1,
            },
          ],
        }),
      });

      const onRestoreProgress = vi.fn();
      const manager = createManager({ onRestoreProgress });
      await manager.restoreAll(mockKek);

      expect(onRestoreProgress).toHaveBeenCalledWith(1, 2);
      expect(onRestoreProgress).toHaveBeenCalledWith(2, 2);

      manager.destroy();
    });

    it("returns empty result when no backups exist", async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ backups: [] }),
      });

      const manager = createManager();
      const result = await manager.restoreAll(mockKek);

      expect(result).toEqual({ restored: 0, skipped: 0, errors: 0 });
      manager.destroy();
    });
  });

  // ─── clearAll ─────────────────────────────────

  describe("clearAll", () => {
    it("sends DELETE request to server", async () => {
      const manager = createManager();
      await manager.clearAll();

      expect(fetch).toHaveBeenCalledWith("/api/e2ee/session-backups", {
        method: "DELETE",
      });

      manager.destroy();
    });
  });

  // ─── destroy ──────────────────────────────────

  describe("destroy", () => {
    it("clears dirty map and cancels pending timer", () => {
      const manager = createManager();
      manager.markDirty("ratchet", "ratchet:conv_1", "data");
      expect(manager.dirtyCount).toBe(1);

      manager.destroy();
      expect(manager.dirtyCount).toBe(0);
    });
  });

  // ─── eciesEncrypt / eciesDecrypt ──────────────

  describe("ECIES helpers", () => {
    it("eciesEncrypt returns expected structure", async () => {
      const result = await eciesEncrypt("test plaintext", mockPublicKey);
      expect(result).toHaveProperty("eciesBlob");
      expect(result).toHaveProperty("ephemeralPubKey");
      expect(result).toHaveProperty("iv");
      expect(typeof result.eciesBlob).toBe("string");
      expect(typeof result.ephemeralPubKey).toBe("string");
      expect(typeof result.iv).toBe("string");
    });

    it("eciesDecrypt returns string", async () => {
      const plaintext = "hello world";
      const encrypted = await eciesEncrypt(plaintext, mockPublicKey);
      const decrypted = await eciesDecrypt(encrypted, mockPrivateKey);
      expect(typeof decrypted).toBe("string");
      // With mocked primitives, the round-trip should preserve content
      expect(decrypted).toBe(plaintext);
    });
  });
});
