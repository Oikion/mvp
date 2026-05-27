import type {
  CreateEnvelopeOpts,
  CreateEnvelopeResult,
  EnvelopeStatus,
  OpenSignError,
  UploadDocumentResult,
} from "./types";

function getConfig() {
  const apiUrl = process.env.OPENSIGN_API_URL;
  const apiKey = process.env.OPENSIGN_API_KEY;
  if (!apiUrl || !apiKey) {
    throw new Error("[OPENSIGN_CLIENT] OPENSIGN_API_URL or OPENSIGN_API_KEY is not set");
  }
  return { apiUrl, apiKey };
}

async function openSignFetch<T>(
  path: string,
  init: RequestInit,
): Promise<T> {
  const { apiUrl, apiKey } = getConfig();
  const res = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Unknown error" }));
    const retryable = res.status === 429 || res.status === 503;
    const err: OpenSignError = {
      retryable: retryable as never,
      status: res.status as never,
      message: body?.error ?? String(res.status),
    };
    throw err;
  }

  return res.json() as Promise<T>;
}

async function openSignFetchBinary(path: string): Promise<Buffer> {
  const { apiUrl, apiKey } = getConfig();
  const res = await fetch(`${apiUrl}${path}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    const retryable = res.status === 429 || res.status === 503;
    const err: OpenSignError = {
      retryable: retryable as never,
      status: res.status as never,
      message: String(res.status),
    };
    throw err;
  }
  return Buffer.from(await res.arrayBuffer());
}

export const openSignClient = {
  async uploadDocument(
    buffer: Buffer,
    fileName: string,
  ): Promise<UploadDocumentResult> {
    // TODO: verify exact endpoint + multipart format against OpenSign v1.2 docs
    const form = new FormData();
    form.append("file", new Blob([buffer], { type: "application/pdf" }), fileName);
    const { apiUrl, apiKey } = getConfig();
    const res = await fetch(`${apiUrl}/documents/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
    if (!res.ok) {
      const retryable = res.status === 429 || res.status === 503;
      throw { retryable, status: res.status, message: String(res.status) } as OpenSignError;
    }
    return res.json() as Promise<UploadDocumentResult>;
  },

  async createEnvelope(opts: CreateEnvelopeOpts): Promise<CreateEnvelopeResult> {
    // TODO: verify exact endpoint + payload shape against OpenSign v1.2 docs
    return openSignFetch<CreateEnvelopeResult>("/envelopes", {
      method: "POST",
      body: JSON.stringify(opts),
    });
  },

  async getEnvelopeStatus(envelopeId: string): Promise<EnvelopeStatus> {
    // TODO: verify exact endpoint against OpenSign v1.2 docs
    return openSignFetch<EnvelopeStatus>(`/envelopes/${envelopeId}`, {
      method: "GET",
    });
  },

  async getSignedDocument(envelopeId: string): Promise<Buffer> {
    // TODO: verify exact endpoint against OpenSign v1.2 docs
    return openSignFetchBinary(`/envelopes/${envelopeId}/download`);
  },

  async cancelEnvelope(envelopeId: string): Promise<void> {
    // TODO: verify exact endpoint against OpenSign v1.2 docs
    await openSignFetch<void>(`/envelopes/${envelopeId}/cancel`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  },
};
