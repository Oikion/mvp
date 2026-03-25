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

// L-4: Raised from 100 to 1000 to reduce session rotation frequency.
// At 100 messages, active channels rotated every few hours — each rotation requires
// re-distributing the session to all members. 1000 is a reasonable balance between
// forward secrecy window and operational overhead for a business chat tool.
const DEFAULT_MAX_MESSAGES = 1000;
const MAX_SKIP_MEGOLM = 100; // Max skipped keys cached to bound memory usage

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
  private readonly skippedKeys = new Map<number, ArrayBuffer>();

  private constructor(
    public readonly sessionId: string,
    public readonly targetId: string,
    private ratchetKey: ArrayBuffer,
    private _currentIndex: number,
    skippedEntries?: Array<[number, string]>,
  ) {
    if (skippedEntries) {
      for (const [idx, keyB64] of skippedEntries) {
        this.skippedKeys.set(idx, base64ToBuffer(keyB64));
      }
    }
  }

  /** Current ratchet index (read-only). */
  get currentIndex(): number {
    return this._currentIndex;
  }

  static fromExport(exported: MegolmSessionExport): MegolmInbound {
    return new MegolmInbound(
      exported.sessionId,
      exported.targetId,
      base64ToBuffer(exported.ratchetKey),
      exported.messageIndex,
    );
  }

  async decrypt(messageIndex: number, ciphertextBase64: string, ivBase64: string): Promise<string> {
    let msgKey: ArrayBuffer;

    if (messageIndex < this._currentIndex) {
      // Check if we cached this key while fast-forwarding past it
      const cached = this.skippedKeys.get(messageIndex);
      if (!cached) {
        throw new Error(`Cannot decrypt past message (index ${messageIndex} < current ${this._currentIndex})`);
      }
      this.skippedKeys.delete(messageIndex);
      msgKey = cached;
    } else {
      // Fast-forward ratchet, caching intermediate keys for future out-of-order messages
      if (messageIndex - this._currentIndex > MAX_SKIP_MEGOLM) {
        throw new Error(`Too many skipped messages (${messageIndex - this._currentIndex} > ${MAX_SKIP_MEGOLM})`);
      }
      let key = new Uint8Array(this.ratchetKey);
      let idx = this._currentIndex;
      while (idx < messageIndex) {
        // Cache this key in case a message at this index arrives later
        const skippedMsgKey = await hmacSign(
          key.buffer,
          new Uint8Array(new Uint32Array([idx]).buffer)
        );
        this.skippedKeys.set(idx, skippedMsgKey.slice(0, 32));
        key = new Uint8Array(await sha256(key));
        idx++;
      }
      // Derive message key at the target index
      msgKey = (await hmacSign(
        key.buffer,
        new Uint8Array(new Uint32Array([messageIndex]).buffer)
      )).slice(0, 32);
      // Advance ratchet state past the decrypted message
      this.ratchetKey = await sha256(key);
      this._currentIndex = messageIndex + 1;
    }

    const ciphertext = base64ToBuffer(ciphertextBase64);
    const iv = base64ToBuffer(ivBase64);
    const plaintext = await aesGcmDecrypt(ciphertext, msgKey, iv);
    return new TextDecoder().decode(plaintext);
  }

  serialize(): string {
    return JSON.stringify({
      sessionId: this.sessionId,
      targetId: this.targetId,
      ratchetKey: bufferToBase64(this.ratchetKey),
      currentIndex: this._currentIndex,
      skippedKeys: Array.from(this.skippedKeys.entries()).map(
        ([idx, key]) => [idx, bufferToBase64(key)]
      ),
    });
  }

  static deserialize(data: string): MegolmInbound {
    const parsed = JSON.parse(data);
    return new MegolmInbound(
      parsed.sessionId,
      parsed.targetId,
      base64ToBuffer(parsed.ratchetKey),
      parsed.currentIndex,
      parsed.skippedKeys ?? [],
    );
  }
}
