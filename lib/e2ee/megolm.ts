"use client";

import {
  generateRandomBytes,
  hmacSign,
  sha256,
  aesGcmEncrypt,
  aesGcmDecrypt,
  bufferToBase64,
  base64ToBuffer,
} from "./primitives";

const DEFAULT_MAX_MESSAGES = 100;

interface MegolmSessionExport {
  sessionId: string;
  targetId: string;
  ratchetKey: string;      // Base64
  messageIndex: number;
}

interface MegolmEncryptedPayload {
  sessionId: string;
  messageIndex: number;
  ciphertext: string;      // Base64
  iv: string;              // Base64
}

export class MegolmOutbound {
  private constructor(
    public readonly sessionId: string,
    public readonly targetId: string,
    private ratchetKey: ArrayBuffer,
    private messageIndex: number,
    private maxMessages: number,
  ) {}

  static async create(targetId: string, maxMessages = DEFAULT_MAX_MESSAGES): Promise<MegolmOutbound> {
    const sessionId = crypto.randomUUID();
    const ratchetKey = generateRandomBytes(32);
    return new MegolmOutbound(sessionId, targetId, ratchetKey, 0, maxMessages);
  }

  async encrypt(plaintext: string): Promise<MegolmEncryptedPayload> {
    const msgKey = await hmacSign(
      this.ratchetKey,
      new Uint8Array(new Uint32Array([this.messageIndex]).buffer)
    );
    const plaintextBytes = new TextEncoder().encode(plaintext);
    const { ciphertext, iv } = await aesGcmEncrypt(plaintextBytes, msgKey.slice(0, 32));
    const index = this.messageIndex;
    // Ratchet forward
    this.ratchetKey = await sha256(new Uint8Array(this.ratchetKey));
    this.messageIndex++;
    return {
      sessionId: this.sessionId,
      messageIndex: index,
      ciphertext: bufferToBase64(ciphertext),
      iv: bufferToBase64(iv),
    };
  }

  needsRotation(): boolean {
    return this.messageIndex >= this.maxMessages;
  }

  exportSession(): MegolmSessionExport {
    return {
      sessionId: this.sessionId,
      targetId: this.targetId,
      ratchetKey: bufferToBase64(this.ratchetKey),
      messageIndex: this.messageIndex,
    };
  }

  serialize(): string {
    return JSON.stringify({
      sessionId: this.sessionId,
      targetId: this.targetId,
      ratchetKey: bufferToBase64(this.ratchetKey),
      messageIndex: this.messageIndex,
      maxMessages: this.maxMessages,
    });
  }

  static deserialize(data: string): MegolmOutbound {
    const parsed = JSON.parse(data);
    return new MegolmOutbound(
      parsed.sessionId,
      parsed.targetId,
      base64ToBuffer(parsed.ratchetKey),
      parsed.messageIndex,
      parsed.maxMessages ?? DEFAULT_MAX_MESSAGES,
    );
  }
}

export class MegolmInbound {
  private constructor(
    public readonly sessionId: string,
    public readonly targetId: string,
    private ratchetKey: ArrayBuffer,
    private currentIndex: number,
  ) {}

  static fromExport(exported: MegolmSessionExport): MegolmInbound {
    return new MegolmInbound(
      exported.sessionId,
      exported.targetId,
      base64ToBuffer(exported.ratchetKey),
      exported.messageIndex,
    );
  }

  async decrypt(messageIndex: number, ciphertextBase64: string, ivBase64: string): Promise<string> {
    if (messageIndex < this.currentIndex) {
      throw new Error(`Cannot decrypt past message (index ${messageIndex} < current ${this.currentIndex})`);
    }
    // Fast-forward ratchet to target index
    let key = new Uint8Array(this.ratchetKey);
    let idx = this.currentIndex;
    while (idx < messageIndex) {
      key = new Uint8Array(await sha256(key));
      idx++;
    }
    // Derive message key at target index
    const msgKey = await hmacSign(
      key.buffer,
      new Uint8Array(new Uint32Array([messageIndex]).buffer)
    );
    const ciphertext = base64ToBuffer(ciphertextBase64);
    const iv = base64ToBuffer(ivBase64);
    const plaintext = await aesGcmDecrypt(ciphertext, msgKey.slice(0, 32), iv);
    // Advance our state past the decrypted message
    if (messageIndex >= this.currentIndex) {
      this.ratchetKey = await sha256(key);
      this.currentIndex = messageIndex + 1;
    }
    return new TextDecoder().decode(plaintext);
  }

  serialize(): string {
    return JSON.stringify({
      sessionId: this.sessionId,
      targetId: this.targetId,
      ratchetKey: bufferToBase64(this.ratchetKey),
      currentIndex: this.currentIndex,
    });
  }

  static deserialize(data: string): MegolmInbound {
    const parsed = JSON.parse(data);
    return new MegolmInbound(
      parsed.sessionId,
      parsed.targetId,
      base64ToBuffer(parsed.ratchetKey),
      parsed.currentIndex,
    );
  }
}
