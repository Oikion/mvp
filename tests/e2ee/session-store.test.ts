import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { generateRandomBytes } from "@/lib/e2ee/primitives";
import {
  storeIdentityKey,
  getIdentityKey,
  storeRatchetSession,
  getRatchetSession,
  deleteRatchetSession,
  storeMegolmOutbound,
  getMegolmOutbound,
  deleteMegolmOutbound,
  storeMegolmInbound,
  getMegolmInbound,
  deleteMegolmInbound,
  getBackupVersion,
  setBackupVersion,
  deleteBackupVersion,
  clearAllSessions,
  closeDB,
} from "@/lib/e2ee/session-store";

describe("E2EE Session Store", () => {
  let kek: ArrayBuffer;

  beforeEach(async () => {
    // Fresh KEK for each test
    kek = generateRandomBytes(32);
    // Close DB to reset between tests (fake-indexeddb keeps state in memory)
    await closeDB();
  });

  describe("Identity key", () => {
    it("stores and retrieves identity key", async () => {
      const userId = "user_123";
      const serialized = JSON.stringify({ privateKey: "base64privkey", publicKey: "base64pubkey" });
      await storeIdentityKey(userId, serialized, kek);
      const retrieved = await getIdentityKey(userId, kek);
      expect(retrieved).toBe(serialized);
    });

    it("returns null for missing identity key", async () => {
      const retrieved = await getIdentityKey("nonexistent", kek);
      expect(retrieved).toBeNull();
    });

    it("fails to decrypt with wrong KEK", async () => {
      const userId = "user_456";
      await storeIdentityKey(userId, "secret-data", kek);
      const wrongKek = generateRandomBytes(32);
      await expect(getIdentityKey(userId, wrongKek)).rejects.toThrow();
    });
  });

  describe("Double Ratchet sessions", () => {
    it("stores and retrieves ratchet session", async () => {
      const convId = "conv_abc";
      const serialized = '{"rootKey":"...","sendChainKey":"..."}';
      await storeRatchetSession(convId, serialized, kek);
      const retrieved = await getRatchetSession(convId, kek);
      expect(retrieved).toBe(serialized);
    });

    it("overwrites existing session on re-store", async () => {
      const convId = "conv_xyz";
      await storeRatchetSession(convId, "version1", kek);
      await storeRatchetSession(convId, "version2", kek);
      const retrieved = await getRatchetSession(convId, kek);
      expect(retrieved).toBe("version2");
    });

    it("deletes ratchet session", async () => {
      const convId = "conv_del";
      await storeRatchetSession(convId, "data", kek);
      await deleteRatchetSession(convId);
      const retrieved = await getRatchetSession(convId, kek);
      expect(retrieved).toBeNull();
    });
  });

  describe("Megolm outbound sessions", () => {
    it("stores and retrieves outbound session", async () => {
      const targetId = "channel_001";
      const serialized = '{"sessionId":"s1","ratchetKey":"..."}';
      await storeMegolmOutbound(targetId, serialized, kek);
      const retrieved = await getMegolmOutbound(targetId, kek);
      expect(retrieved).toBe(serialized);
    });

    it("deletes outbound session", async () => {
      const targetId = "channel_del";
      await storeMegolmOutbound(targetId, "data", kek);
      await deleteMegolmOutbound(targetId);
      const retrieved = await getMegolmOutbound(targetId, kek);
      expect(retrieved).toBeNull();
    });
  });

  describe("Megolm inbound sessions", () => {
    it("stores and retrieves inbound session", async () => {
      const sessionId = "sess_001";
      const serialized = '{"startingIndex":0,"ratchetKey":"..."}';
      await storeMegolmInbound(sessionId, serialized, kek);
      const retrieved = await getMegolmInbound(sessionId, kek);
      expect(retrieved).toBe(serialized);
    });

    it("deletes inbound session", async () => {
      const sessionId = "sess_del";
      await storeMegolmInbound(sessionId, "data", kek);
      await deleteMegolmInbound(sessionId);
      const retrieved = await getMegolmInbound(sessionId, kek);
      expect(retrieved).toBeNull();
    });
  });

  describe("clearAllSessions", () => {
    it("clears all stores", async () => {
      await storeIdentityKey("u1", "id-data", kek);
      await storeRatchetSession("c1", "ratchet-data", kek);
      await storeMegolmOutbound("t1", "out-data", kek);
      await storeMegolmInbound("s1", "in-data", kek);

      await clearAllSessions();

      expect(await getIdentityKey("u1", kek)).toBeNull();
      expect(await getRatchetSession("c1", kek)).toBeNull();
      expect(await getMegolmOutbound("t1", kek)).toBeNull();
      expect(await getMegolmInbound("s1", kek)).toBeNull();
    });
  });

  describe("Backup version tracking", () => {
    it("stores and retrieves a backup version (round-trip)", async () => {
      await setBackupVersion("ratchet:conv_abc", 7);
      const version = await getBackupVersion("ratchet:conv_abc");
      expect(version).toBe(7);
    });

    it("returns 0 for a key with no recorded backup", async () => {
      const version = await getBackupVersion("ratchet:nonexistent");
      expect(version).toBe(0);
    });

    it("overwrites an existing version with a newer one", async () => {
      await setBackupVersion("megolm-out:channel_001", 3);
      await setBackupVersion("megolm-out:channel_001", 5);
      const version = await getBackupVersion("megolm-out:channel_001");
      expect(version).toBe(5);
    });

    it("deleteBackupVersion removes the entry (returns 0 after)", async () => {
      await setBackupVersion("identity:user_123", 2);
      await deleteBackupVersion("identity:user_123");
      const version = await getBackupVersion("identity:user_123");
      expect(version).toBe(0);
    });

    it("clearAllSessions also clears backup versions", async () => {
      await setBackupVersion("ratchet:conv_xyz", 10);
      await setBackupVersion("megolm-out:channel_999", 4);

      await clearAllSessions();

      expect(await getBackupVersion("ratchet:conv_xyz")).toBe(0);
      expect(await getBackupVersion("megolm-out:channel_999")).toBe(0);
    });
  });
});
