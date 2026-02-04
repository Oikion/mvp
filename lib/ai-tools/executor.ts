// @ts-nocheck
// TODO: Fix type errors
/**
 * AI Tools Executor
 * 
 * Executes AI tools with validation, error handling, and logging.
 * 
 * Supports three execution modes:
 * 1. INTERNAL_ACTION - Direct function calls via AI tool registry (fastest, recommended)
 * 2. API_ROUTE - HTTP calls to internal API routes (legacy, has HTTPS issues in dev)
 * 3. EXTERNAL_URL - HTTP calls to external webhooks
 */

import { prismadb } from "@/lib/prisma";
import type { AiTool, AiToolExecutionSource } from "@prisma/client";
import { getEnabledToolByName } from "./registry";
import { validateInput } from "./schema";
import { getToolFunction, type AIToolResponse } from "@/actions/ai/tools";

export interface ToolExecutionContext {
  organizationId?: string;
  userId?: string;
  apiKeyId?: string;
  source: AiToolExecutionSource;
  testMode?: boolean; // When true, internal APIs should return mock data
}

export interface ToolExecutionResult {
  success: boolean;
  data?: unknown;
  error?: string;
  statusCode: number;
  durationMs: number;
}

/**
 * Execute an AI tool by name
 */
export async function executeTool(
  toolName: string,
  input: Record<string, unknown>,
  context: ToolExecutionContext
): Promise<ToolExecutionResult> {
  const startTime = Date.now();
  let tool: AiTool | null = null;

  try {
    // Get the tool
    tool = await getEnabledToolByName(toolName);

    if (!tool) {
      return {
        success: false,
        error: `Tool "${toolName}" not found or is disabled`,
        statusCode: 404,
        durationMs: Date.now() - startTime,
      };
    }

    // Validate input against schema
    const validation = validateInput(tool.parameters as Record<string, unknown>, input);
    if (!validation.valid) {
      const errorMessage = validation.errors?.join("; ") || "Invalid input";
      
      // Log the failed execution
      await logExecution(tool.id, context, input, null, 400, errorMessage, startTime);
      
      return {
        success: false,
        error: errorMessage,
        statusCode: 400,
        durationMs: Date.now() - startTime,
      };
    }

    // Execute based on endpoint type
    let result: ToolExecutionResult;

    switch (tool.endpointType) {
      case "INTERNAL_ACTION":
        result = await executeInternalAction(tool, input, context);
        break;
      case "API_ROUTE":
        result = await executeApiRoute(tool, input, context);
        break;
      case "EXTERNAL_URL":
        result = await executeExternalUrl(tool, input, context);
        break;
      default:
        result = {
          success: false,
          error: `Unknown endpoint type: ${tool.endpointType}`,
          statusCode: 500,
          durationMs: Date.now() - startTime,
        };
    }

    // Log the execution
    await logExecution(
      tool.id,
      context,
      input,
      result.data,
      result.statusCode,
      result.error || null,
      startTime
    );

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Tool execution failed";
    const durationMs = Date.now() - startTime;

    // Log the failed execution if we have a tool
    if (tool) {
      await logExecution(tool.id, context, input, null, 500, errorMessage, startTime);
    }

    return {
      success: false,
      error: errorMessage,
      statusCode: 500,
      durationMs,
    };
  }
}

/**
 * Execute an internal server action
 * 
 * Execution strategy:
 * 1. First, try to find the tool in the AI tool registry (direct function call)
 * 2. If not found, fall back to dynamic import (legacy support)
 */
async function executeInternalAction(
  tool: AiTool,
  input: Record<string, unknown>,
  context: ToolExecutionContext
): Promise<ToolExecutionResult> {
  const startTime = Date.now();

  try {
    // Strategy 1: Try the AI tool registry first (recommended, fastest)
    const registeredFn = getToolFunction(tool.name);
    
    if (registeredFn) {
      console.log(`[AI_EXECUTOR] Using direct function call for "${tool.name}"`);
      
      // Call the registered function with input and context
      const result = await registeredFn({
        ...input,
        _toolContext: context,
      }) as AIToolResponse;

      // Handle the standardized AIToolResponse format
      if (result && typeof result === "object" && "success" in result) {
        return {
          success: result.success,
          data: result.data,
          error: result.error,
          statusCode: result.success ? 200 : 400,
          durationMs: Date.now() - startTime,
        };
      }

      // If result doesn't follow AIToolResponse format, wrap it
      return {
        success: true,
        data: result,
        statusCode: 200,
        durationMs: Date.now() - startTime,
      };
    }

    // Strategy 2: Fall back to dynamic import (legacy support)
    // The endpointPath should be like "crm/clients/get-clients"
    console.log(`[AI_EXECUTOR] Using dynamic import for "${tool.name}" (${tool.endpointPath})`);
    
    const actionModule = await import(`@/actions/${tool.endpointPath}`);
    
    // Find the default export or the first function
    const actionFn = actionModule.default || Object.values(actionModule)[0];
    
    if (typeof actionFn !== "function") {
      return {
        success: false,
        error: `Action "${tool.endpointPath}" does not export a function`,
        statusCode: 500,
        durationMs: Date.now() - startTime,
      };
    }

    // Execute the action with context
    const result = await actionFn({
      ...input,
      _toolContext: context,
    });

    return {
      success: true,
      data: result,
      statusCode: 200,
      durationMs: Date.now() - startTime,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Action execution failed";
    console.error(`[AI_EXECUTOR] Error executing "${tool.name}":`, errorMessage);
    return {
      success: false,
      error: errorMessage,
      statusCode: 500,
      durationMs: Date.now() - startTime,
    };
  }
}

/**
 * Get the base URL for internal API calls
 * 
 * For internal server-to-server API calls, we need to call the Next.js server directly.
 * 
 * Priority:
 * 1. INTERNAL_API_URL (explicit internal URL for server-to-server calls)
 * 2. Default to HTTP localhost - even in development, internal calls should use HTTP
 *    to avoid self-signed certificate issues with HTTPS
 * 
 * Note: NEXT_PUBLIC_APP_URL is intentionally NOT used here because it may be HTTPS
 * which causes issues with self-signed certificates for server-to-server calls.
 */
function getInternalApiBaseUrl(): string {
  // Prefer explicit internal API URL for server-to-server calls
  if (process.env.INTERNAL_API_URL) {
    return process.env.INTERNAL_API_URL;
  }
  
  // Use HTTP for internal server-to-server calls to avoid SSL certificate issues
  // Next.js accepts both HTTP and HTTPS requests even when running with --experimental-https
  const port = process.env.PORT || "3000";
  return `http://localhost:${port}`;
}

/**
 * Execute an internal API route
 */
async function executeApiRoute(
  tool: AiTool,
  input: Record<string, unknown>,
  context: ToolExecutionContext
): Promise<ToolExecutionResult> {
  const startTime = Date.now();

  try {
    // Build the URL for internal API call
    const baseUrl = getInternalApiBaseUrl();
    const url = new URL(tool.endpointPath, baseUrl);

    // For GET requests, add input as query params
    if (tool.httpMethod === "GET") {
      for (const [key, value] of Object.entries(input)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    // Make the request with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      // Build fetch options
      const fetchOptions: RequestInit & { dispatcher?: unknown } = {
        method: tool.httpMethod,
        headers: {
          "Content-Type": "application/json",
          // Pass context as internal headers
          "X-Tool-Context-Org": context.organizationId || "",
          "X-Tool-Context-User": context.userId || "",
          "X-Tool-Context-Source": context.source,
          "X-Tool-Context-Test-Mode": context.testMode ? "true" : "false",
        },
        body: tool.httpMethod !== "GET" ? JSON.stringify(input) : undefined,
        signal: controller.signal,
      };

      // In development with HTTPS, we need to handle self-signed certificates
      // The global NODE_TLS_REJECT_UNAUTHORIZED=0 is set at app startup for dev
      const response = await fetch(url.toString(), fetchOptions);

      clearTimeout(timeoutId);

      let data: unknown;
      const contentType = response.headers.get("content-type");
      
      if (contentType?.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = { message: text };
      }

      return {
        success: response.ok,
        data: response.ok ? data : undefined,
        error: !response.ok ? ((data as Record<string, unknown>)?.error as string || `API request failed with status ${response.status}`) : undefined,
        statusCode: response.status,
        durationMs: Date.now() - startTime,
      };
    } catch (fetchError) {
      clearTimeout(timeoutId);
      throw fetchError;
    }
  } catch (error) {
    const errorMessage = error instanceof Error 
      ? (error.name === "AbortError" 
        ? "Request timeout - API call took too long" 
        : `API request failed: ${error.message}`)
      : "API request failed";
    
    console.error("[EXECUTE_API_ROUTE]", {
      tool: tool.name,
      endpoint: tool.endpointPath,
      error: errorMessage,
    });
    
    return {
      success: false,
      error: errorMessage,
      statusCode: 500,
      durationMs: Date.now() - startTime,
    };
  }
}

/**
 * Execute an external URL
 */
async function executeExternalUrl(
  tool: AiTool,
  input: Record<string, unknown>,
  context: ToolExecutionContext
): Promise<ToolExecutionResult> {
  const startTime = Date.now();

  try {
    const url = new URL(tool.endpointPath);

    // For GET requests, add input as query params
    if (tool.httpMethod === "GET") {
      for (const [key, value] of Object.entries(input)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    const response = await fetch(url.toString(), {
      method: tool.httpMethod,
      headers: {
        "Content-Type": "application/json",
      },
      body: tool.httpMethod !== "GET" ? JSON.stringify(input) : undefined,
    });

    let data: unknown;
    const contentType = response.headers.get("content-type");
    
    if (contentType?.includes("application/json")) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    return {
      success: response.ok,
      data: response.ok ? data : undefined,
      error: !response.ok ? "External API request failed" : undefined,
      statusCode: response.status,
      durationMs: Date.now() - startTime,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "External request failed";
    return {
      success: false,
      error: errorMessage,
      statusCode: 500,
      durationMs: Date.now() - startTime,
    };
  }
}

/**
 * Log a tool execution
 */
async function logExecution(
  toolId: string,
  context: ToolExecutionContext,
  input: Record<string, unknown>,
  output: unknown,
  statusCode: number,
  errorMessage: string | null,
  startTime: number
): Promise<void> {
  try {
    await prismadb.aiToolExecution.create({
      data: {
        toolId,
        organizationId: context.organizationId || null,
        userId: context.userId || null,
        apiKeyId: context.apiKeyId || null,
        input,
        output: output ? JSON.parse(JSON.stringify(output)) : null,
        statusCode,
        errorMessage,
        durationMs: Date.now() - startTime,
        source: context.source,
      },
    });
  } catch (error) {
    // Log but don't fail the execution
    console.error("[LOG_TOOL_EXECUTION]", error);
  }
}

/**
 * Execute a tool for admin testing
 * @param testMode - When true (default), internal APIs will return mock data
 */
export async function executeToolForTesting(
  toolName: string,
  input: Record<string, unknown>,
  adminUserId: string,
  organizationId?: string,
  testMode: boolean = true
): Promise<ToolExecutionResult> {
  return executeTool(toolName, input, {
    userId: adminUserId,
    organizationId,
    source: "ADMIN_TEST",
    testMode,
  });
}
