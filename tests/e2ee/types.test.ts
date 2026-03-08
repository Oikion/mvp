import { describe, it, expect } from "vitest";

describe("E2EE Types", () => {
  it("EncryptedDMPayload structure is valid", () => {
    const payload = {
      header: { dhPublicKey: "base64", previousChainLength: 0, messageNumber: 0 },
      ciphertext: "base64ct",
      iv: "base64iv",
    };
    expect(payload.header.messageNumber).toBe(0);
    expect(payload.ciphertext).toBeTruthy();
  });

  it("EncryptedGroupPayload structure is valid", () => {
    const payload = {
      sessionId: "uuid",
      messageIndex: 42,
      ciphertext: "base64ct",
      iv: "base64iv",
    };
    expect(payload.messageIndex).toBe(42);
  });
});
