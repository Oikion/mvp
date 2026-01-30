/**
 * N8N Integration Actions
 *
 * Server actions for managing n8n workflow assignments and execution.
 */

// Agent-facing actions
export {
  getN8nIntegrationStatus,
  getMyN8nWorkflows,
  runMyN8nWorkflow,
  type ActionResult,
  type N8nWorkflowInfo,
  type N8nIntegrationStatus,
} from "./agent-workflows";

// Admin configuration actions
export {
  getN8nConfig,
  saveN8nConfig,
  toggleN8nConfig,
  deleteN8nConfig,
  testN8nConnection,
  listAvailableWorkflows,
  getWorkflowAssignments,
  assignWorkflowToAgent,
  removeWorkflowAssignment,
  toggleWorkflowAssignment,
  getN8nStats,
  type N8nConfigInput,
  type N8nConfigData,
  type WorkflowAssignment,
} from "./admin-config";
