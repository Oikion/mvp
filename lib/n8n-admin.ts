import { prismadb } from "@/lib/prisma";

export type N8nWorkflow = {
  id: string;
  name: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
};

function normalizeBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, "");
  // Throws if invalid, which we want (misconfig should be loud)
  // eslint-disable-next-line no-new
  new URL(trimmed);
  return trimmed;
}

export async function getActiveN8nConfig() {
  const n8nConfig = await prismadb.n8nConfig.findFirst({
    where: { isActive: true },
    orderBy: { updatedAt: "desc" },
  });
  return n8nConfig;
}

export function getN8nApiKey(): string {
  const key = process.env.N8N_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "Missing N8N_API_KEY. Create an API key in n8n (Settings → n8n API) and set N8N_API_KEY in the server environment."
    );
  }
  return key;
}

async function n8nFetchWithFallback(
  baseUrl: string,
  path: string,
  init: RequestInit
): Promise<Response> {
  const normalizedBase = normalizeBaseUrl(baseUrl);
  const candidates = [
    `${normalizedBase}/api/v1${path}`,
    `${normalizedBase}/rest${path}`,
  ];

  let lastRes: Response | null = null;
  for (const url of candidates) {
    const res = await fetch(url, init);
    lastRes = res;
    // If endpoint doesn't exist on this version, try the next one.
    if (res.status === 404) continue;
    return res;
  }
  // Fall back to the last response so callers can surface a useful error.
  return lastRes ?? new Response(null, { status: 500 });
}

export async function listN8nWorkflows(baseUrl: string): Promise<N8nWorkflow[]> {
  const apiKey = getN8nApiKey();
  const res = await n8nFetchWithFallback(baseUrl, "/workflows", {
    method: "GET",
    headers: {
      "Accept": "application/json",
      "X-N8N-API-KEY": apiKey,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`n8n workflows fetch failed (${res.status}): ${text || res.statusText}`);
  }

  const data = (await res.json()) as unknown;

  // Newer API commonly returns { data: [...] }
  const workflows = (data as any)?.data ?? data;
  if (!Array.isArray(workflows)) return [];

  return workflows.map((w: any) => ({
    id: String(w.id),
    name: String(w.name ?? "Untitled"),
    active: Boolean(w.active),
    createdAt: w.createdAt ? String(w.createdAt) : undefined,
    updatedAt: w.updatedAt ? String(w.updatedAt) : undefined,
  }));
}

export async function setN8nWorkflowActive(
  baseUrl: string,
  workflowId: string,
  active: boolean
): Promise<void> {
  const apiKey = getN8nApiKey();
  const res = await n8nFetchWithFallback(baseUrl, `/workflows/${encodeURIComponent(workflowId)}`, {
    method: "PATCH",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "X-N8N-API-KEY": apiKey,
    },
    body: JSON.stringify({ active }),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`n8n workflow update failed (${res.status}): ${text || res.statusText}`);
  }
}

export async function runN8nWorkflow(baseUrl: string, workflowId: string): Promise<unknown> {
  const apiKey = getN8nApiKey();

  // n8n versions differ here; try the most common "run" endpoint first.
  const res = await n8nFetchWithFallback(
    baseUrl,
    `/workflows/${encodeURIComponent(workflowId)}/run`,
    {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-N8N-API-KEY": apiKey,
      },
      body: JSON.stringify({}),
      cache: "no-store",
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `n8n workflow run failed (${res.status}): ${text || res.statusText}. If your n8n version doesn't support /workflows/:id/run, trigger via a Webhook node instead.`
    );
  }

  return await res.json().catch(() => ({}));
}

