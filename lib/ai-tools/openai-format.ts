/**
 * Convert AI tools to OpenAI function calling format
 */

import type { AiTool } from "@prisma/client";

/**
 * OpenAI function tool format
 */
export interface OpenAIFunctionTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

/**
 * Convert a single AI tool to OpenAI function format
 */
export function toolToOpenAIFormat(tool: AiTool): OpenAIFunctionTool {
  return {
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters as Record<string, unknown>,
    },
  };
}

/**
 * Convert multiple AI tools to OpenAI function format
 */
export function toolsToOpenAIFormat(tools: AiTool[]): OpenAIFunctionTool[] {
  return tools.map(toolToOpenAIFormat);
}

/**
 * OpenAI Assistants tool format (slightly different from chat completion)
 */
export interface OpenAIAssistantTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
    strict?: boolean;
  };
}

/**
 * Convert tools to OpenAI Assistants format
 */
export function toolsToAssistantsFormat(tools: AiTool[]): OpenAIAssistantTool[] {
  return tools.map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters as Record<string, unknown>,
      strict: true, // Enable structured outputs
    },
  }));
}

/**
 * Anthropic Claude tool format
 */
export interface ClaudeTool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

/**
 * Convert tools to Anthropic Claude format
 */
export function toolsToClaudeFormat(tools: AiTool[]): ClaudeTool[] {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.parameters as Record<string, unknown>,
  }));
}

/**
 * MCP (Model Context Protocol) tool format
 */
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

/**
 * Convert tools to MCP format
 */
export function toolsToMCPFormat(tools: AiTool[]): MCPTool[] {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.parameters as Record<string, unknown>,
  }));
}

/**
 * Generic tool format for API responses
 */
export interface GenericToolFormat {
  name: string;
  displayName: string;
  description: string;
  category: string;
  parameters: Record<string, unknown>;
  requiredScopes: string[];
}

/**
 * Convert tools to generic API format
 */
export function toolsToGenericFormat(tools: AiTool[]): GenericToolFormat[] {
  return tools.map((tool) => ({
    name: tool.name,
    displayName: tool.displayName,
    description: tool.description,
    category: tool.category,
    parameters: tool.parameters as Record<string, unknown>,
    requiredScopes: tool.requiredScopes,
  }));
}

/**
 * Generate a natural language summary of available tools for system prompts
 * This helps the AI understand what tools are available and when to use them
 */
export function toolsToPromptContext(tools: AiTool[]): string {
  if (tools.length === 0) {
    return "";
  }

  // Group tools by category
  const toolsByCategory: Record<string, AiTool[]> = {};
  for (const tool of tools) {
    const category = tool.category || "other";
    if (!toolsByCategory[category]) {
      toolsByCategory[category] = [];
    }
    toolsByCategory[category].push(tool);
  }

  const sections: string[] = [
    "\n--- AVAILABLE TOOLS ---",
    "You have access to the following tools to help users. ALWAYS use the appropriate tool when the user asks to perform an action.\n",
  ];

  // Category display names
  const categoryNames: Record<string, string> = {
    crm: "CRM (Client Management)",
    mls: "MLS (Property Listings)",
    calendar: "Calendar & Scheduling",
    documents: "Documents",
    messages: "Messaging",
    matchmaking: "Matchmaking",
    market_intelligence: "Market Intelligence",
    connections: "Connections & Social",
    other: "Other Tools",
  };

  for (const [category, categoryTools] of Object.entries(toolsByCategory)) {
    const categoryName = categoryNames[category] || category.charAt(0).toUpperCase() + category.slice(1);
    sections.push(`**${categoryName}:**`);
    
    for (const tool of categoryTools) {
      // Get parameter info
      const params = tool.parameters as Record<string, unknown>;
      const properties = params?.properties as Record<string, { description?: string }> | undefined;
      const required = params?.required as string[] | undefined;
      
      let paramHint = "";
      if (properties && Object.keys(properties).length > 0) {
        const paramList = Object.entries(properties)
          .slice(0, 3) // Show max 3 params
          .map(([name, prop]) => {
            const isRequired = required?.includes(name);
            return `${name}${isRequired ? "*" : ""}`;
          })
          .join(", ");
        
        const moreParams = Object.keys(properties).length > 3 
          ? ` (+${Object.keys(properties).length - 3} more)` 
          : "";
        
        paramHint = ` [params: ${paramList}${moreParams}]`;
      }
      
      sections.push(`- **${tool.name}**: ${tool.description}${paramHint}`);
    }
    sections.push(""); // Empty line between categories
  }

  sections.push("--- END AVAILABLE TOOLS ---\n");
  sections.push("CRITICAL INSTRUCTIONS FOR TOOL USAGE:");
  sections.push("1. When the user asks to CREATE, ADD, or MAKE something → USE the create/add tool immediately");
  sections.push("2. When the user asks to FIND, SEARCH, LIST, or GET something → USE the appropriate list/search tool");
  sections.push("3. When the user asks about their SCHEDULE or CALENDAR → USE calendar tools");
  sections.push("4. When the user MENTIONS a person by name (e.g., '@Aggelos Karatza' or 'Aggelos') → USE list_clients with search parameter to find them");
  sections.push("5. ALWAYS extract relevant details from user messages and pass them as tool parameters");
  sections.push("6. If a tool call fails, tell the user what went wrong and suggest alternatives");
  sections.push("");

  return sections.join("\n");
}
