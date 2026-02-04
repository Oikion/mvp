/**
 * AI Tool Actions Index
 *
 * Central export for all AI tool actions.
 * These functions are designed to be called directly from the AI tool executor
 * without HTTP overhead.
 */

// Types
export * from "./types";

// Calendar tools
export {
  getUpcomingEvents,
  listEvents,
  createEvent,
  createReminder,
  findAvailableSlots,
} from "./calendar";

// CRM tools
export {
  listClients,
  getClientDetails,
  createClient,
  updateClientPreferences,
  searchClientsSemantic,
  listTasks,
  createTask,
} from "./crm";

// MLS tools
export {
  listProperties,
  getPropertyDetails,
  createProperty,
  searchPropertiesSemantic,
} from "./mls";

// Document tools
export {
  listDocuments,
  getDocumentDetails,
  analyzeDocument,
  chatWithDocument,
} from "./documents";

// Message tools
export {
  getRecentConversations,
  draftMessageResponse,
  sendMessage,
} from "./messages";

/**
 * Tool function registry
 *
 * Maps tool names to their implementation functions.
 * Used by the executor for dynamic dispatch.
 */
import {
  getUpcomingEvents,
  listEvents,
  createEvent,
  createReminder,
  findAvailableSlots,
} from "./calendar";

import {
  listClients,
  getClientDetails,
  createClient,
  updateClientPreferences,
  searchClientsSemantic,
  listTasks,
  createTask,
} from "./crm";

import {
  listProperties,
  getPropertyDetails,
  createProperty,
  searchPropertiesSemantic,
} from "./mls";

import {
  listDocuments,
  getDocumentDetails,
  analyzeDocument,
  chatWithDocument,
} from "./documents";

import {
  getRecentConversations,
  draftMessageResponse,
  sendMessage,
} from "./messages";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AIToolFunction = (input: any) => Promise<any>;

export const AI_TOOL_REGISTRY: Record<string, AIToolFunction> = {
  // Calendar
  get_upcoming_events: getUpcomingEvents,
  list_events: listEvents,
  create_event: createEvent,
  create_reminder: createReminder,
  find_available_slots: findAvailableSlots,

  // CRM - Clients
  list_clients: listClients,
  get_client_details: getClientDetails,
  create_client: createClient,
  update_client_preferences: updateClientPreferences,
  search_clients_semantic: searchClientsSemantic,

  // CRM - Tasks
  list_tasks: listTasks,
  create_task: createTask,

  // MLS - Properties
  list_properties: listProperties,
  get_property_details: getPropertyDetails,
  create_property: createProperty,
  search_properties_semantic: searchPropertiesSemantic,

  // Documents
  list_documents: listDocuments,
  get_document_details: getDocumentDetails,
  analyze_document: analyzeDocument,
  chat_with_document: chatWithDocument,

  // Messages
  get_recent_conversations: getRecentConversations,
  draft_message_response: draftMessageResponse,
  send_message: sendMessage,
};

/**
 * Get a tool function by name
 */
export function getToolFunction(toolName: string): AIToolFunction | undefined {
  return AI_TOOL_REGISTRY[toolName];
}

/**
 * Check if a tool exists in the registry
 */
export function isToolRegistered(toolName: string): boolean {
  return toolName in AI_TOOL_REGISTRY;
}

/**
 * Get all registered tool names
 */
export function getRegisteredToolNames(): string[] {
  return Object.keys(AI_TOOL_REGISTRY);
}
