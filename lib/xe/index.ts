/**
 * XE.gr Portal Publishing Module
 *
 * Exports all XE-related functionality for property syndication.
 */

// Client
export { XeClient, createXeClientFromIntegration, validateXeCredentials } from "./xe-client";

// Property Mapper
export {
  mapPropertyToXeItem,
  mapPropertiesToXeItems,
  mapPropertyTypeToXe,
  mapTransactionTypeToXe,
  mapImagesToXeAssets,
  mapFloorToXeLevel,
  formatPhoneForXe,
  generateXeRefId,
  validatePropertyForXe,
  type PropertyWithExtras,
} from "./property-mapper";
