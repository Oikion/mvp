const DEFAULT_BASE_URL = "http://import.xe.gr";
const MAX_ZIP_BYTES = 50 * 1024 * 1024;
const ALLOWED_ZIP_TYPES = new Set([
  "application/zip",
  "application/x-zip-compressed",
  "multipart/x-zip",
]);

export type XeGrPublishAction = "add" | "remove";

export interface XeGrPublishResult {
  ok: boolean;
  status: number;
  body: string;
  headers: Record<string, string>;
}

interface XeGrConfig {
  baseUrl: string;
  username: string;
  password: string;
  authToken?: string;
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, "");
}

function getXeGrConfig(): XeGrConfig {
  const username = process.env.XE_GR_USERNAME;
  const password = process.env.XE_GR_PASSWORD;
  const baseUrl = process.env.XE_GR_BASE_URL || DEFAULT_BASE_URL;
  const authToken = process.env.XE_GR_AUTHTOKEN;

  if (!username || !password) {
    throw new Error("XE_GR_USERNAME and XE_GR_PASSWORD must be configured");
  }

  return {
    baseUrl: normalizeBaseUrl(baseUrl),
    username,
    password,
    authToken: authToken?.trim() || undefined,
  };
}

function validateZipFile(file: File) {
  if (!file) {
    throw new Error("Zip file is required");
  }

  if (file.size > MAX_ZIP_BYTES) {
    throw new Error(`Zip file exceeds ${MAX_ZIP_BYTES / (1024 * 1024)}MB limit`);
  }

  if (file.type && !ALLOWED_ZIP_TYPES.has(file.type)) {
    throw new Error("Invalid file type. Expected a zip file");
  }
}

function getXeGrEndpoint(action: XeGrPublishAction) {
  const { baseUrl } = getXeGrConfig();
  return `${baseUrl}/request/${action}`;
}

export async function forwardXeGrPackage(
  action: XeGrPublishAction,
  file: File
): Promise<XeGrPublishResult> {
  validateZipFile(file);

  const { username, password, authToken } = getXeGrConfig();
  const endpoint = getXeGrEndpoint(action);

  const formData = new FormData();
  formData.append("username", username);
  formData.append("password", password);
  if (authToken) formData.append("authtoken", authToken);
  formData.append("file", file, file.name || "xe-gr-package.zip");

  const response = await fetch(endpoint, {
    method: "POST",
    body: formData,
  });

  const body = await response.text();
  const headers = Object.fromEntries(response.headers.entries());

  return {
    ok: response.ok,
    status: response.status,
    body,
    headers,
  };
}
