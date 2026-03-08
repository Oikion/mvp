import { describe, it, expect } from "vitest";
import { webcrypto } from "node:crypto";
if (!globalThis.crypto) (globalThis as any).crypto = webcrypto;

import { MegolmOutbound, MegolmInbound } from "@/lib/e2ee/megolm";

describe("Megolm", () => {
  it("encrypts and decrypts a message", async () => {
    const outbound = await MegolmOutbound.create("conv-1");
    const sessionExport = outbound.exportSession();
    const inbound = MegolmInbound.fromExport(sessionExport);

    const encrypted = await outbound.encrypt("Hello group!");
    const decrypted = await inbound.decrypt(encrypted.messageIndex, encrypted.ciphertext, encrypted.iv);
    expect(decrypted).toBe("Hello group!");
  });

  it("ratchets forward correctly", async () => {
    const outbound = await MegolmOutbound.create("conv-1");
    const sessionExport = outbound.exportSession();
    const inbound = MegolmInbound.fromExport(sessionExport);

    const e1 = await outbound.encrypt("Msg 1");
    const e2 = await outbound.encrypt("Msg 2");
    const e3 = await outbound.encrypt("Msg 3");

    expect(e1.messageIndex).toBe(0);
    expect(e2.messageIndex).toBe(1);
    expect(e3.messageIndex).toBe(2);

    expect(await inbound.decrypt(e1.messageIndex, e1.ciphertext, e1.iv)).toBe("Msg 1");
    expect(await inbound.decrypt(e2.messageIndex, e2.ciphertext, e2.iv)).toBe("Msg 2");
    expect(await inbound.decrypt(e3.messageIndex, e3.ciphertext, e3.iv)).toBe("Msg 3");
  });

  it("inbound can fast-forward to skip missed messages", async () => {
    const outbound = await MegolmOutbound.create("conv-1");
    const sessionExport = outbound.exportSession();
    const inbound = MegolmInbound.fromExport(sessionExport);

    await outbound.encrypt("Skip 1");
    await outbound.encrypt("Skip 2");
    const e3 = await outbound.encrypt("Read this");

    // Inbound fast-forwards from index 0 to index 2
    expect(await inbound.decrypt(e3.messageIndex, e3.ciphertext, e3.iv)).toBe("Read this");
  });

  it("cannot decrypt with wrong session", async () => {
    const outbound1 = await MegolmOutbound.create("conv-1");
    const outbound2 = await MegolmOutbound.create("conv-2");
    const inbound2 = MegolmInbound.fromExport(outbound2.exportSession());

    const encrypted = await outbound1.encrypt("Secret");
    await expect(
      inbound2.decrypt(encrypted.messageIndex, encrypted.ciphertext, encrypted.iv)
    ).rejects.toThrow();
  });

  it("supports late-joiner with startingIndex", async () => {
    const outbound = await MegolmOutbound.create("conv-1");
    await outbound.encrypt("Before join 1");
    await outbound.encrypt("Before join 2");

    // Late joiner gets session at current index (2)
    const lateExport = outbound.exportSession();
    const lateInbound = MegolmInbound.fromExport(lateExport);

    const e3 = await outbound.encrypt("After join");
    expect(await lateInbound.decrypt(e3.messageIndex, e3.ciphertext, e3.iv)).toBe("After join");
  });

  it("signals when rotation is needed", async () => {
    const outbound = await MegolmOutbound.create("conv-1", 3); // max 3 messages
    await outbound.encrypt("1");
    await outbound.encrypt("2");
    await outbound.encrypt("3");
    expect(outbound.needsRotation()).toBe(true);
  });

  it("serializes and deserializes outbound session", async () => {
    const outbound = await MegolmOutbound.create("conv-1");
    await outbound.encrypt("Before");
    const serialized = outbound.serialize();
    const restored = MegolmOutbound.deserialize(serialized);
    const e2 = await restored.encrypt("After");
    expect(e2.messageIndex).toBe(1);
  });
});
