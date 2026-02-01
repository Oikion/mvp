// AI Tools Library
// Core functionality for AI tool management and execution

// Registry - Load and cache tools
export {
  getEnabledTools,
  getEnabledToolsByCategory,
  getToolByName,
  getEnabledToolByName,
  getToolsForScopes,
  isToolAvailableForScopes,
  getToolCategoriesWithCounts,
  invalidateToolsCache,
  TOOLS_CACHE_TAG,
} from "./registry";

// Executor - Execute tools with validation and logging
export {
  executeTool,
  executeToolForTesting,
  type ToolExecutionContext,
  type ToolExecutionResult,
} from "./executor";

// Schema - JSON Schema validation
export {
  validateInput,
  validateSchema,
  generateDefaultValue,
  getPropertyDescriptions,
  getRequiredFields,
  getPropertyTypes,
  type ValidationResult,
} from "./schema";

// OpenAI Format - Convert tools to various AI formats
export {
  toolToOpenAIFormat,
  toolsToOpenAIFormat,
  toolsToAssistantsFormat,
  toolsToClaudeFormat,
  toolsToMCPFormat,
  toolsToGenericFormat,
  toolsToPromptContext,
  type OpenAIFunctionTool,
  type OpenAIAssistantTool,
  type ClaudeTool,
  type MCPTool,
  type GenericToolFormat,
} from "./openai-format";

// Templates - Pre-defined tool templates
export {
  TOOL_TEMPLATES,
  getTemplateCategories,
  getTemplatesByCategory,
  getTemplateById,
  type ToolTemplate,
} from "./templates";
