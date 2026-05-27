export interface CreateEnvelopeOpts {
  documentFileId: string;
  signers: {
    name: string;
    email: string;
    order: number;
  }[];
  subject: string;
  message?: string;
  expiryDays?: number;
  callbackUrl: string;
}

export interface EnvelopeSignerStatus {
  signerId: string;
  status: "pending" | "sent" | "viewed" | "signed" | "declined";
  signedAt?: string;
}

export interface EnvelopeStatus {
  envelopeId: string;
  status: "draft" | "sent" | "in_progress" | "completed" | "declined" | "expired";
  signers: EnvelopeSignerStatus[];
}

export interface UploadDocumentResult {
  fileId: string;
}

export interface CreateEnvelopeResult {
  envelopeId: string;
  // OpenSign should return the signer IDs it assigned, keyed by the order we sent.
  // Verify the exact shape against API v1.2 docs; populate openSignSignerId from this at creation.
  signers?: { email: string; signerId: string; order: number }[];
}

export type OpenSignError =
  | { retryable: true; status: 429 | 503; message: string }
  | { retryable: false; status: 400 | 401 | 404 | 422; message: string };

export interface OpenSignWebhookPayload {
  envelopeId: string;
  status: "completed" | "declined" | "expired";
  signers?: {
    signerId: string;
    status: string;
    signedAt?: string;
  }[];
}
