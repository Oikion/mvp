"use client";

import {
  generateECDHKeyPair,
  deriveSharedSecret,
  hkdfDerive,
  hmacSign,
  aesGcmEncrypt,
  aesGcmDecrypt,
  exportPublicKey,
  importPublicKey,
  exportPrivateKey,
  importPrivateKey,
  bufferToBase64,
  base64ToBuffer,
  concatBuffers,
} from "./primitives";
import type { EncryptedDMPayload, RatchetHeader } from "./types";

const MAX_SKIP = 1000;
const RATCHET_INFO = new TextEncoder().encode("OikionRatchet");
const CHAIN_INFO = new TextEncoder().encode("OikionChain");

export class DoubleRatchet {
  private rootKey: ArrayBuffer;
  private sendChainKey: ArrayBuffer | null;
  private recvChainKey: ArrayBuffer | null;
  private sendDHKeyPair: CryptoKeyPair;
  private recvDHPublicKey: CryptoKey | null;
  private sendMsgNum: number;
  private recvMsgNum: number;
  private prevSendChainLen: number;
  private skippedKeys: Map<string, ArrayBuffer>;

  private constructor(
    rootKey: ArrayBuffer,
    sendChainKey: ArrayBuffer | null,
    recvChainKey: ArrayBuffer | null,
    sendDHKeyPair: CryptoKeyPair,
    recvDHPublicKey: CryptoKey | null,
    sendMsgNum: number,
    recvMsgNum: number,
    prevSendChainLen: number,
    skippedKeys: Map<string, ArrayBuffer>,
  ) {
    this.rootKey = rootKey;
    this.sendChainKey = sendChainKey;
    this.recvChainKey = recvChainKey;
    this.sendDHKeyPair = sendDHKeyPair;
    this.recvDHPublicKey = recvDHPublicKey;
    this.sendMsgNum = sendMsgNum;
    this.recvMsgNum = recvMsgNum;
    this.prevSendChainLen = prevSendChainLen;
    this.skippedKeys = skippedKeys;
  }

  // Alice (initiator) — knows Bob's public key from X3DH
  static async initSender(
    sharedSecret: ArrayBuffer,
    recipientPublicKey: CryptoKey,
  ): Promise<DoubleRatchet> {
    const sendDHKeyPair = await generateECDHKeyPair();
    const dhOutput = await deriveSharedSecret(sendDHKeyPair.privateKey, recipientPublicKey);
    const { rootKey, chainKey } = await kdfRatchetStep(sharedSecret, dhOutput);
    return new DoubleRatchet(
      rootKey, chainKey, null,
      sendDHKeyPair, recipientPublicKey,
      0, 0, 0,
      new Map(),
    );
  }

  // Bob (responder) — has his own key pair
  static async initReceiver(
    sharedSecret: ArrayBuffer,
    ownKeyPair: CryptoKeyPair,
  ): Promise<DoubleRatchet> {
    return new DoubleRatchet(
      sharedSecret, null, null,
      ownKeyPair, null,
      0, 0, 0,
      new Map(),
    );
  }

  async encrypt(plaintext: string): Promise<EncryptedDMPayload> {
    if (!this.sendChainKey) {
      throw new Error("Send chain not initialized — waiting for first received message");
    }
    const { chainKey, messageKey } = await kdfChainStep(this.sendChainKey);
    this.sendChainKey = chainKey;

    const header: RatchetHeader = {
      dhPublicKey: await exportPublicKey(this.sendDHKeyPair.publicKey),
      previousChainLength: this.prevSendChainLen,
      messageNumber: this.sendMsgNum,
    };
    this.sendMsgNum++;

    const plaintextBytes = new TextEncoder().encode(plaintext);
    const { ciphertext, iv } = await aesGcmEncrypt(plaintextBytes, messageKey);

    return {
      header,
      ciphertext: bufferToBase64(ciphertext),
      iv: bufferToBase64(iv),
    };
  }

  async decrypt(payload: EncryptedDMPayload): Promise<string> {
    const { header, ciphertext: ctBase64, iv: ivBase64 } = payload;
    const senderDHPub = await importPublicKey(header.dhPublicKey);

    // Check if we have a skipped key for this message
    const skipKey = `${header.dhPublicKey}:${header.messageNumber}`;
    const skippedMsgKey = this.skippedKeys.get(skipKey);
    if (skippedMsgKey) {
      this.skippedKeys.delete(skipKey);
      return decryptWithKey(skippedMsgKey, ctBase64, ivBase64);
    }

    // Check if this is a new DH ratchet step
    const currentRecvPub = this.recvDHPublicKey
      ? await exportPublicKey(this.recvDHPublicKey)
      : null;

    if (header.dhPublicKey !== currentRecvPub) {
      // Skip any remaining messages from the previous chain
      if (this.recvChainKey !== null) {
        await this.skipMessages(currentRecvPub!, this.recvMsgNum, header.previousChainLength);
      }
      // Perform DH ratchet
      await this.dhRatchet(senderDHPub, header.dhPublicKey);
    }

    // Skip messages in the current chain if needed
    await this.skipMessages(header.dhPublicKey, this.recvMsgNum, header.messageNumber);

    // Derive message key from current recv chain
    const { chainKey, messageKey } = await kdfChainStep(this.recvChainKey!);
    this.recvChainKey = chainKey;
    this.recvMsgNum++;

    return decryptWithKey(messageKey, ctBase64, ivBase64);
  }

  private async dhRatchet(senderPublicKey: CryptoKey, senderPubBase64: string): Promise<void> {
    this.recvDHPublicKey = senderPublicKey;
    this.recvMsgNum = 0;
    this.prevSendChainLen = this.sendMsgNum;
    this.sendMsgNum = 0;

    // Receive chain: DH with our current key pair
    const dhRecv = await deriveSharedSecret(this.sendDHKeyPair.privateKey, senderPublicKey);
    const recvResult = await kdfRatchetStep(this.rootKey, dhRecv);
    this.rootKey = recvResult.rootKey;
    this.recvChainKey = recvResult.chainKey;

    // Send chain: new DH key pair
    this.sendDHKeyPair = await generateECDHKeyPair();
    const dhSend = await deriveSharedSecret(this.sendDHKeyPair.privateKey, senderPublicKey);
    const sendResult = await kdfRatchetStep(this.rootKey, dhSend);
    this.rootKey = sendResult.rootKey;
    this.sendChainKey = sendResult.chainKey;
  }

  private async skipMessages(dhPubBase64: string, fromNum: number, untilNum: number): Promise<void> {
    if (untilNum - fromNum > MAX_SKIP) {
      throw new Error(`Too many skipped messages: ${untilNum - fromNum}`);
    }
    let chainKey = this.recvChainKey;
    if (!chainKey) return;

    for (let i = fromNum; i < untilNum; i++) {
      const result = await kdfChainStep(chainKey);
      chainKey = result.chainKey;
      this.skippedKeys.set(`${dhPubBase64}:${i}`, result.messageKey);
    }
    this.recvChainKey = chainKey;
    this.recvMsgNum = untilNum;
  }

  async serialize(): Promise<string> {
    const skippedObj: Record<string, string> = {};
    for (const [key, val] of this.skippedKeys) {
      skippedObj[key] = bufferToBase64(val);
    }
    return JSON.stringify({
      rootKey: bufferToBase64(this.rootKey),
      sendChainKey: this.sendChainKey ? bufferToBase64(this.sendChainKey) : null,
      recvChainKey: this.recvChainKey ? bufferToBase64(this.recvChainKey) : null,
      sendDHPublic: await exportPublicKey(this.sendDHKeyPair.publicKey),
      sendDHPrivate: await exportPrivateKey(this.sendDHKeyPair.privateKey),
      recvDHPublic: this.recvDHPublicKey ? await exportPublicKey(this.recvDHPublicKey) : null,
      sendMsgNum: this.sendMsgNum,
      recvMsgNum: this.recvMsgNum,
      prevSendChainLen: this.prevSendChainLen,
      skippedKeys: skippedObj,
    });
  }

  static async deserialize(data: string): Promise<DoubleRatchet> {
    const parsed = JSON.parse(data);
    const sendPub = await importPublicKey(parsed.sendDHPublic);
    const sendPriv = await importPrivateKey(parsed.sendDHPrivate);
    const recvPub = parsed.recvDHPublic ? await importPublicKey(parsed.recvDHPublic) : null;

    const skippedKeys = new Map<string, ArrayBuffer>();
    for (const [key, val] of Object.entries(parsed.skippedKeys)) {
      skippedKeys.set(key, base64ToBuffer(val as string));
    }

    return new DoubleRatchet(
      base64ToBuffer(parsed.rootKey),
      parsed.sendChainKey ? base64ToBuffer(parsed.sendChainKey) : null,
      parsed.recvChainKey ? base64ToBuffer(parsed.recvChainKey) : null,
      { publicKey: sendPub, privateKey: sendPriv } as CryptoKeyPair,
      recvPub,
      parsed.sendMsgNum,
      parsed.recvMsgNum,
      parsed.prevSendChainLen,
      skippedKeys,
    );
  }
}

// ─── KDF Helpers ───────────────────────────

async function kdfRatchetStep(
  rootKey: ArrayBuffer,
  dhOutput: ArrayBuffer,
): Promise<{ rootKey: ArrayBuffer; chainKey: ArrayBuffer }> {
  const input = concatBuffers(rootKey, dhOutput);
  const derived = await hkdfDerive(input, new ArrayBuffer(32), RATCHET_INFO, 64);
  return {
    rootKey: derived.slice(0, 32),
    chainKey: derived.slice(32, 64),
  };
}

async function kdfChainStep(
  chainKey: ArrayBuffer,
): Promise<{ chainKey: ArrayBuffer; messageKey: ArrayBuffer }> {
  const msgKeyInput = new Uint8Array([0x01]);
  const chainKeyInput = new Uint8Array([0x02]);
  const messageKey = await hmacSign(chainKey, msgKeyInput.buffer);
  const newChainKey = await hmacSign(chainKey, chainKeyInput.buffer);
  return {
    chainKey: newChainKey,
    messageKey: messageKey.slice(0, 32),
  };
}

async function decryptWithKey(
  messageKey: ArrayBuffer,
  ctBase64: string,
  ivBase64: string,
): Promise<string> {
  const ciphertext = base64ToBuffer(ctBase64);
  const iv = base64ToBuffer(ivBase64);
  const plaintext = await aesGcmDecrypt(ciphertext, messageKey, iv);
  return new TextDecoder().decode(plaintext);
}
