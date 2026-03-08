import { describe, it, expect } from "vitest";
import { webcrypto } from "node:crypto";
if (!globalThis.crypto) (globalThis as any).crypto = webcrypto;

import { encryptAttachment, decryptAttachment } from "@/lib/e2ee/attachment";

describe("Attachment E2EE", () => {
  it("encrypts and decrypts a file round-trip", async () => {
    const content = new TextEncoder().encode("file content here");
    const blob = new Blob([content], { type: "text/plain" });

    const { encryptedBlob, fileKey, iv } = await encryptAttachment(blob);
    expect(encryptedBlob.size).toBeGreaterThan(0);
    expect(fileKey).toBeTruthy();

    const decrypted = await decryptAttachment(encryptedBlob, fileKey, iv);
    const text = await decrypted.text();
    expect(text).toBe("file content here");
  });

  it("produces different ciphertext for same file", async () => {
    const blob = new Blob(["same content"], { type: "text/plain" });
    const e1 = await encryptAttachment(blob);
    const e2 = await encryptAttachment(blob);
    expect(e1.fileKey).not.toBe(e2.fileKey);
  });
});
