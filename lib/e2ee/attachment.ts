"use client";

import {
  generateRandomBytes,
  aesGcmEncrypt,
  aesGcmDecrypt,
  bufferToBase64,
  base64ToBuffer,
} from "./primitives";

export async function encryptAttachment(
  file: Blob
): Promise<{ encryptedBlob: Blob; fileKey: string; iv: string }> {
  const fileKey = generateRandomBytes(32);
  const plaintext = await file.arrayBuffer();
  const { ciphertext, iv } = await aesGcmEncrypt(plaintext, fileKey);
  return {
    encryptedBlob: new Blob([ciphertext], { type: "application/octet-stream" }),
    fileKey: bufferToBase64(fileKey),
    iv: bufferToBase64(iv),
  };
}

export async function decryptAttachment(
  encryptedBlob: Blob,
  fileKeyBase64: string,
  ivBase64: string
): Promise<Blob> {
  const ciphertext = await encryptedBlob.arrayBuffer();
  const fileKey = base64ToBuffer(fileKeyBase64);
  const iv = base64ToBuffer(ivBase64);
  const plaintext = await aesGcmDecrypt(ciphertext, fileKey, iv);
  return new Blob([plaintext]);
}
