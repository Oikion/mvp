import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { webcrypto } from "node:crypto";
if (!globalThis.crypto) (globalThis as any).crypto = webcrypto;

import { generateRandomBytes } from "@/lib/e2ee/primitives";
import {
  encryptEntityComment,
  decryptEntityComment,
  initEntitySession,
  importEntitySession,
  clearEntitySessionCaches,
} from "@/lib/e2ee/entity-comments";
import { closeDB } from "@/lib/e2ee/session-store";

describe("Entity Comments E2EE", () => {
  let kek: ArrayBuffer;

  beforeEach(async () => {
    // Fresh KEK and clean state for each test
    kek = generateRandomBytes(32);
    clearEntitySessionCaches();
    await closeDB();
  });

  it("encrypts and decrypts a comment round-trip", async () => {
    // Initialize the outbound session (simulates the first user who creates the entity session)
    const { sessionExport } = await initEntitySession("CONTACT", "client-abc", kek);

    // Import the same session as an inbound (simulates a member receiving the share)
    await importEntitySession(sessionExport, kek);

    // Encrypt
    const encResult = await encryptEntityComment("CONTACT", "client-abc", "Hello E2EE!", kek);
    expect(encResult.ok).toBe(true);
    if (!encResult.ok) return; // type narrowing

    const { content, entitySessionId, messageIndex } = encResult;
    expect(content).toContain(":"); // iv:ciphertext format

    // Decrypt
    const plaintext = await decryptEntityComment(entitySessionId, messageIndex, content, kek);
    expect(plaintext).toBe("Hello E2EE!");
  });

  it("throws for malformed encrypted content (no colon separator)", async () => {
    const { sessionExport } = await initEntitySession("PROPERTY", "prop-xyz", kek);
    await importEntitySession(sessionExport, kek);

    // A well-formed encrypt to get the sessionId and messageIndex
    const encResult = await encryptEntityComment("PROPERTY", "prop-xyz", "Test", kek);
    expect(encResult.ok).toBe(true);
    if (!encResult.ok) return;

    // Attempt decryption with content that has no colon
    await expect(
      decryptEntityComment(encResult.entitySessionId, encResult.messageIndex, "nocolomnseparat", kek)
    ).rejects.toThrow("Invalid encrypted content format");
  });

  it("returns needsInit when no outbound session exists", async () => {
    const result = await encryptEntityComment("REQUEST", "request-999", "Test", kek);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect("needsInit" in result).toBe(true);
    }
  });

  it("returns needsRotation when session has exhausted its message budget", async () => {
    // Create a session with maxMessages=1 by going through the Megolm layer directly
    // Entity-comments doesn't expose maxMessages, so we create the session, encrypt once to exhaust it
    const { sessionExport } = await initEntitySession("TASK", "task-001", kek);
    await importEntitySession(sessionExport, kek);

    // Use the internal Megolm API to create a near-exhausted outbound session,
    // then encrypt until rotation is signaled.
    // Since entity-comments uses DEFAULT_MAX_MESSAGES (100), we indirectly verify
    // the rotation path by constructing the scenario at the Megolm level and re-importing.
    // Here we just verify that the "needsRotation" path can be reached.
    // (Full rotation testing is covered in megolm.test.ts)
    const { MegolmOutbound } = await import("@/lib/e2ee/megolm");
    const { storeEntityMegolmOutbound } = await import("@/lib/e2ee/session-store");

    // Replace the stored session with one that has already hit the message limit
    const exhausted = await MegolmOutbound.create("entity:TASK:task-001", 0);
    await storeEntityMegolmOutbound("TASK", "task-001", exhausted.serialize(), kek);
    clearEntitySessionCaches(); // clear memory cache so the store is re-read

    const result = await encryptEntityComment("TASK", "task-001", "Should rotate", kek);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect("needsRotation" in result).toBe(true);
    }
  });

  it("encrypts multiple comments in sequence with correct message indices", async () => {
    const { sessionExport } = await initEntitySession("CONTACT", "client-multi", kek);
    await importEntitySession(sessionExport, kek);

    const e0 = await encryptEntityComment("CONTACT", "client-multi", "First", kek);
    const e1 = await encryptEntityComment("CONTACT", "client-multi", "Second", kek);
    const e2 = await encryptEntityComment("CONTACT", "client-multi", "Third", kek);

    expect(e0.ok && e0.messageIndex).toBe(0);
    expect(e1.ok && e1.messageIndex).toBe(1);
    expect(e2.ok && e2.messageIndex).toBe(2);

    // Decrypt all three
    if (e0.ok && e1.ok && e2.ok) {
      expect(await decryptEntityComment(e0.entitySessionId, e0.messageIndex, e0.content, kek)).toBe("First");
      expect(await decryptEntityComment(e1.entitySessionId, e1.messageIndex, e1.content, kek)).toBe("Second");
      expect(await decryptEntityComment(e2.entitySessionId, e2.messageIndex, e2.content, kek)).toBe("Third");
    }
  });
});
