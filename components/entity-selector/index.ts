/**
 * Entity Selector Components
 * 
 * Unified entity selection system for Clients, Properties, Documents, and Events.
 */

export { UnifiedEntitySelector } from "./UnifiedEntitySelector";
export type { UnifiedEntitySelectorProps } from "./UnifiedEntitySelector";

// Specialized wrapper components (backwards compatible)
export { ClientSelector } from "./ClientSelector";
export { PropertySelector } from "./PropertySelector";
export { DocumentSelector } from "./DocumentSelector";
export { EventSelector } from "./EventSelector";

// Re-export types from hook
export type {
  EntityType,
  EntitySearchResult,
} from "@/hooks/swr/useUnifiedEntitySearch";
