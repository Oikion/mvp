/**
 * n8n Integration Helper Library
 * 
 * This module provides utilities for interacting with n8n workflows
 * and handling webhook communications.
 */

import { createHmac } from "crypto";

/**
 * n8n configuration
 */
export const N8N_CONFIG = {
  baseUrl: process.env.N8N_BASE_URL || "http://localhost:5678",
  webhookSecret: process.env.N8N_WEBHOOK_SECRET || "",
  allowedOrigins: (process.env.N8N_ALLOWED_ORIGINS || "http://localhost:3000").split(","),
};

/**
 * Verify n8n webhook signature
 */
export function verifyN8nWebhookSignature(
  payload: string,
  signature: string
): boolean {
  if (!N8N_CONFIG.webhookSecret) {
    // If no secret configured, skip verification (dev mode)
    console.warn("[N8N] Webhook secret not configured, skipping signature verification");
    return true;
  }

  const expectedSignature = createHmac("sha256", N8N_CONFIG.webhookSecret)
    .update(payload)
    .digest("hex");

  // Support both raw hex and prefixed formats
  return (
    signature === expectedSignature ||
    signature === `sha256=${expectedSignature}`
  );
}

/**
 * Create a signature for sending webhooks to n8n
 */
export function createN8nWebhookSignature(payload: string): string {
  if (!N8N_CONFIG.webhookSecret) {
    return "";
  }

  return `sha256=${createHmac("sha256", N8N_CONFIG.webhookSecret)
    .update(payload)
    .digest("hex")}`;
}

/**
 * Webhook event types that Oikion can receive from n8n
 */
export type N8nWebhookEvent =
  | "workflow.completed"
  | "workflow.error"
  | "content.created"
  | "content.published"
  | "metrics.sync"
  | "health.check";

/**
 * Webhook payload structure
 */
export interface N8nWebhookPayload {
  event: N8nWebhookEvent;
  organizationId?: string;
  workflowId?: string;
  executionId?: string;
  timestamp?: string;
  data?: Record<string, unknown>;
}

/**
 * Check if n8n instance is healthy
 */
export async function checkN8nHealth(): Promise<{
  healthy: boolean;
  status?: string;
  error?: string;
}> {
  try {
    const response = await fetch(`${N8N_CONFIG.baseUrl}/healthz`, {
      method: "GET",
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (response.ok) {
      return { healthy: true, status: "ok" };
    }

    return {
      healthy: false,
      status: `HTTP ${response.status}`,
      error: "Unhealthy response from n8n",
    };
  } catch (error) {
    return {
      healthy: false,
      status: "unreachable",
      error: error instanceof Error ? error.message : "Failed to connect to n8n",
    };
  }
}

/**
 * Trigger an n8n workflow via webhook
 */
export async function triggerN8nWorkflow(
  webhookPath: string,
  data: Record<string, unknown>
): Promise<{
  success: boolean;
  data?: unknown;
  error?: string;
}> {
  try {
    const url = `${N8N_CONFIG.baseUrl}/webhook/${webhookPath}`;
    const payload = JSON.stringify(data);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(N8N_CONFIG.webhookSecret && {
          "X-Webhook-Signature": createN8nWebhookSignature(payload),
        }),
      },
      body: payload,
    });

    const responseData = await response.json().catch(() => ({}));

    if (response.ok) {
      return { success: true, data: responseData };
    }

    return {
      success: false,
      error: responseData.message || `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to trigger workflow",
    };
  }
}

/**
 * Get frame-ancestors CSP header value for n8n embedding
 */
export function getN8nFrameAncestors(): string {
  return N8N_CONFIG.allowedOrigins.join(" ");
}

/**
 * n8n workflow status types
 */
export type WorkflowStatus = "active" | "inactive" | "error";

/**
 * Standard API scopes for n8n integration
 */
export const N8N_API_SCOPES = {
  BLOG: ["blog:read", "blog:write"],
  NEWSLETTER: ["newsletter:read", "newsletter:write", "newsletter:send"],
  SOCIAL: ["social:read", "social:write"],
  WEBHOOK: ["n8n:webhook"],
  ALL: [
    "blog:read",
    "blog:write",
    "newsletter:read",
    "newsletter:write",
    "newsletter:send",
    "social:read",
    "social:write",
    "n8n:webhook",
  ],
} as const;

/**
 * Check if all required scopes for n8n integration are present
 */
export function hasN8nScopes(
  scopes: string[],
  requiredScopes: readonly string[]
): boolean {
  return requiredScopes.every((scope) => scopes.includes(scope));
}
