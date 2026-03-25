"use client";

// ─── Key Types ─────────────────────────────

export interface IdentityKeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

export interface ExportedIdentityKey {
  publicKey: string;       // Base64 ECDH P-256 SPKI
  wrappedPrivateKey: string; // Base64 AES-256-GCM(PKCS8, KEK)
  salt: string;            // Hex PBKDF2 salt
  pbkdfIterations: number;
}

export interface PreKeyBundle {
  identityKey: string;      // Base64 ECDH P-256 SPKI public key
  signedPreKey: string;     // Base64 ECDH P-256 SPKI public key
  signature: string;        // Base64 Ed25519 signature over signedPreKey bytes
  signingPublicKey?: string; // Base64 Ed25519 SPKI public key (null for legacy users)
  oneTimePreKey?: string;   // Base64 public key (may be exhausted)
  oneTimePreKeyId?: string;
}

// ─── Double Ratchet (1:1 DMs) ──────────────

export interface DoubleRatchetState {
  conversationId: string;
  rootKey: ArrayBuffer;
  sendChainKey: ArrayBuffer;
  recvChainKey: ArrayBuffer | null;
  sendDHKeyPair: CryptoKeyPair;
  recvDHPublicKey: CryptoKey | null;
  sendMessageNumber: number;
  recvMessageNumber: number;
  previousSendChainLength: number;
  skippedKeys: Record<string, ArrayBuffer>; // "dhPub:msgNum" → msgKey
}

export interface RatchetHeader {
  dhPublicKey: string;     // Base64 sender's current DH public key
  previousChainLength: number;
  messageNumber: number;
}

export interface EncryptedDMPayload {
  header: RatchetHeader;
  ciphertext: string;      // Base64 AES-256-GCM ciphertext
  iv: string;              // Base64 IV
}

// ─── Megolm (Groups & Channels) ────────────

export interface MegolmOutboundSession {
  sessionId: string;
  targetId: string;        // conversationId or channelId
  ratchetKey: ArrayBuffer;
  messageIndex: number;
}

export interface MegolmInboundSession {
  sessionId: string;
  targetId: string;
  ratchetKey: ArrayBuffer;  // Key at startingIndex
  startingIndex: number;
  currentIndex: number;
}

export interface EncryptedGroupPayload {
  sessionId: string;
  messageIndex: number;
  ciphertext: string;      // Base64
  iv: string;              // Base64
}

// ─── Attachment ────────────────────────────

export interface EncryptedAttachment {
  encryptedBlob: Blob;
  fileKey: string;         // Base64 AES-256 key
  iv: string;              // Base64 IV
}

export interface AttachmentMetadata {
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileKey: string;
  iv: string;
  url: string;
}

// ─── Session Store ─────────────────────────

export interface E2EESessionState {
  isSetUp: boolean;
  isUnlocked: boolean;
  userId: string | null;
}

// ─── API Request/Response ──────────────────

export interface SetupE2EERequest {
  publicKey: string;
  wrappedPrivateKey: string;
  salt: string;
  pbkdfIterations: number;
  signedPreKey: {
    publicKey: string;
    signature: string;
  };
  oneTimePreKeys: string[];
}

export interface GroupSessionShare {
  userId: string;
  ephemeralPublicKey: string;   // Base64 ECDH P-256 SPKI — ephemeral key for ECIES
  encryptedSessionExport: string; // Base64 AES-256-GCM ciphertext of session export
  iv: string;                   // Base64 AES-256-GCM IV
  startingIndex: number;
}

export interface GroupSessionCreateRequest {
  conversationId?: string;
  channelId?: string;
  shares: GroupSessionShare[];
}
