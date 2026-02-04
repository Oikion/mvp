/**
 * XE.gr Portal Integration Actions
 *
 * Server actions for managing XE.gr portal publishing configuration,
 * syncing properties, and viewing sync history.
 */

// Configuration actions
export {
  getXeIntegration,
  isXeIntegrationActive,
  saveXeIntegration,
  toggleXeIntegration,
  deleteXeIntegration,
  getXeAgentSettings,
  getXeAgentSettingsByUser,
  saveXeAgentSettings,
  deleteXeAgentSettings,
  // Self-service agent actions
  getMyXeAgentSettings,
  saveMyXeAgentSettings,
  getXeIntegrationStatus,
  type XeIntegrationInput,
  type XeAgentSettingsInput,
  type ActionResult,
} from "./configuration";

// Sync actions
export {
  syncPropertiesToXe,
  removePropertiesFromXe,
  getPropertyXeStatus,
  getPropertiesXeStatus,
  type SyncToXeInput,
  type RemoveFromXeInput,
  type SyncResult,
} from "./sync";

// History actions
export {
  getXeSyncHistory,
  getXeSyncHistoryDetail,
  getXeSyncStats,
  updateSyncStatus,
  retrySyncPackage,
  type SyncHistoryItem,
  type SyncHistoryDetail,
  type GetHistoryOptions,
} from "./history";
