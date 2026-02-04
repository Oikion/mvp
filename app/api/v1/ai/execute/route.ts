import { NextRequest } from "next/server";
import {
  withExternalApi,
  createApiSuccessResponse,
  createApiErrorResponse,
  ExternalApiContext,
} from "@/lib/external-api-middleware";
import {
  executeTool,
  isToolAvailableForScopes,
  getEnabledToolByName,
} from "@/lib/ai-tools";

/**
 * POST /api/v1/ai/execute
 * Execute an AI tool
 * 
 * Request body:
 * {
 *   "tool": "list_properties",
 *   "input": { "status": "AVAILABLE", "limit": 10 }
 * }
 * 
 * The API key must have all required scopes for the tool.
 */
export const POST = withExternalApi(
  async (req: NextRequest, context: ExternalApiContext) => {
    const body = await req.json();
    const { tool: toolName, input } = body;

    // Validate required fields
    if (!toolName || typeof toolName !== "string") {
      return createApiErrorResponse(
        "Tool name is required. Provide 'tool' in request body.",
        400
      );
    }

    if (input !== undefined && typeof input !== "object") {
      return createApiErrorResponse(
        "Input must be an object if provided",
        400
      );
    }

    // Check if tool exists and is enabled
    const tool = await getEnabledToolByName(toolName);
    if (!tool) {
      return createApiErrorResponse(
        `Tool "${toolName}" not found or is disabled`,
        404
      );
    }

    // Check if API key has required scopes
    const hasAccess = await isToolAvailableForScopes(toolName, context.scopes);
    if (!hasAccess) {
      return createApiErrorResponse(
        `Insufficient permissions. Tool "${toolName}" requires scopes: ${tool.requiredScopes.join(", ")}`,
        403
      );
    }

    // Execute the tool
    const result = await executeTool(toolName, input || {}, {
      organizationId: context.organizationId,
      apiKeyId: context.apiKeyId,
      source: "EXTERNAL_API",
    });

    if (!result.success) {
      return createApiErrorResponse(
        result.error || "Tool execution failed",
        result.statusCode
      );
    }

    return createApiSuccessResponse(
      {
        tool: toolName,
        result: result.data,
      },
      200,
      {
        durationMs: result.durationMs,
      }
    );
  },
  {
    // No specific scopes required at route level - we check per-tool
    requiredScopes: [],
  }
);
