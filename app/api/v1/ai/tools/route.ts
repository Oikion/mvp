import { NextRequest } from "next/server";
import {
  withExternalApi,
  createApiSuccessResponse,
  ExternalApiContext,
} from "@/lib/external-api-middleware";
import { getToolsForScopes, toolsToGenericFormat } from "@/lib/ai-tools";

/**
 * GET /api/v1/ai/tools
 * List available AI tools for the authenticated API key
 * 
 * Returns tools that the API key has access to based on its scopes.
 * Each tool includes its name, description, parameters schema, and required scopes.
 */
export const GET = withExternalApi(
  async (req: NextRequest, context: ExternalApiContext) => {
    // Get tools available for this API key's scopes
    const tools = await getToolsForScopes(context.scopes);

    // Convert to generic format for API response
    const formattedTools = toolsToGenericFormat(tools);

    return createApiSuccessResponse(
      {
        tools: formattedTools,
        count: formattedTools.length,
      },
      200,
      {
        scopes: context.scopes,
        note: "Only tools matching your API key scopes are shown",
      }
    );
  },
  {
    // No specific scopes required - we filter tools based on what scopes the key has
    requiredScopes: [],
  }
);
