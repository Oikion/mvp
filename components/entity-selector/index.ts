/**
 * Entity Selector Components
 * 
 * Unified entity selection system for Clients, Properties, Documents, and Events.
 */

export { UnifiedEntitySelector } from "./UnifiedEntitySelector";
export type { UnifiedEntitySelectorProps } from "./UnifiedEntitySelector";

// Specialized wrapper components (backwards compatible)
export { ClientSelector } from "./ClientSelector";
export { SingleClientSelector } from "./ClientSelector";
export { PropertySelector } from "./PropertySelector";
export { DocumentSelector } from "./DocumentSelector";
export { EventSelector } from "./EventSelector";
// v2.0 replacements — use these in new code
export { ContactSelector, SingleContactSelector } from "./ContactSelector";
export { RequestSelector } from "./RequestSelector";

// Re-export types from hook
export type {
  EntityType,
  EntitySearchResult,
} from "@/hooks/swr/useUnifiedEntitySearch";
