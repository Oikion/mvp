/**
 * XE.gr Bulk Import Tool (BIT) API Client
 *
 * Handles XML generation, ZIP packaging, and API submission for XE.gr portal.
 * Supports both environment-based and database-stored credentials.
 */

import { XMLBuilder } from "fast-xml-parser";
import JSZip from "jszip";
import type {
  XeAddItemsRequest,
  XeRemoveItemsRequest,
  XeItem,
  XePolicy,
  XeClientConfig,
  XeApiResponse,
  XeBuildPackageOptions,
} from "@/types/xe-api";

// ============================================
// CONSTANTS
// ============================================

const DEFAULT_BASE_URL = "http://import.xe.gr";
const MAX_ZIP_BYTES = 50 * 1024 * 1024; // 50MB limit

// ============================================
// CLIENT CLASS
// ============================================

export class XeClient {
  private config: XeClientConfig;
  private baseUrl: string;

  constructor(config: XeClientConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || DEFAULT_BASE_URL;
  }

  /**
   * Create client from environment variables
   */
  static fromEnv(): XeClient {
    const username = process.env.XE_GR_USERNAME;
    const password = process.env.XE_GR_PASSWORD;
    const authToken = process.env.XE_GR_AUTHTOKEN;
    const baseUrl = process.env.XE_GR_BASE_URL;

    if (!username || !password || !authToken) {
      throw new Error(
        "XE_GR_USERNAME, XE_GR_PASSWORD, and XE_GR_AUTHTOKEN must be configured"
      );
    }

    return new XeClient({
      username,
      password,
      authToken,
      baseUrl: baseUrl || DEFAULT_BASE_URL,
    });
  }

  /**
   * Generate a unique package ID
   */
  static generatePackageId(organizationId: string, prefix = "OIKION"): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const orgShort = organizationId.slice(0, 8).toUpperCase();
    return `${prefix}-${orgShort}-${timestamp}-${random}`;
  }

  /**
   * Build AddItemsRequest object
   */
  buildAddItemsRequest(
    items: XeItem[],
    options: XeBuildPackageOptions
  ): XeAddItemsRequest {
    const packageId = XeClient.generatePackageId(
      options.organizationId,
      "OIKION"
    );

    return {
      "Package.xeAuthToken": this.config.authToken,
      "Package.schemaVersion": "1.1",
      "Package.id": packageId,
      "Package.timestamp": new Date().toISOString(),
      "Package.storeId": this.config.storeId,
      "Package.trademark": options.trademark || this.config.trademark,
      "Package.skipAssets": options.skipAssets ? "true" : undefined,
      "Package.crmProviderCode":
        this.config.crmProviderCode || "OIKION_CRM",
      "Package.policy": options.policy,
      Item: items,
    };
  }

  /**
   * Build RemoveItemsRequest object
   */
  buildRemoveItemsRequest(
    refIds: Array<{ type: XeItem["@type"]; refId: string }>,
    organizationId: string
  ): XeRemoveItemsRequest {
    const packageId = XeClient.generatePackageId(organizationId, "OIKION-DEL");

    return {
      "Package.xeAuthToken": this.config.authToken,
      "Package.schemaVersion": "1.1",
      "Package.id": packageId,
      "Package.timestamp": new Date().toISOString(),
      "Package.storeId": this.config.storeId,
      "Package.trademark": this.config.trademark,
      Item: refIds.map((item) => ({
        "@type": item.type,
        "@refId": item.refId,
      })),
    };
  }

  /**
   * Build XML from request object
   */
  buildXml(request: XeAddItemsRequest | XeRemoveItemsRequest): string {
    const builder = new XMLBuilder({
      ignoreAttributes: false,
      attributeNamePrefix: "@",
      format: true,
      indentBy: "  ",
      suppressEmptyNode: true,
      suppressBooleanAttributes: false,
    });

    // Determine root element name based on request type
    const isAddRequest = "Item" in request && request.Item.length > 0 && 
      "Item.ownerId" in (request.Item[0] as XeItem);
    const rootKey = isAddRequest ? "AddItemsRequest" : "RemoveItemsRequest";

    // Transform request to XML-friendly structure
    const xmlObj = this.transformRequestForXml(request, rootKey);

    const xmlContent = builder.build(xmlObj);
    return `<?xml version="1.0" encoding="UTF-8"?>\n${xmlContent}`;
  }

  /**
   * Transform request object to XML-friendly format
   */
  private transformRequestForXml(
    request: XeAddItemsRequest | XeRemoveItemsRequest,
    rootKey: string
  ): Record<string, unknown> {
    // Create a clean object for XML generation
    const cleanRequest: Record<string, unknown> = {};

    // Copy package-level attributes
    for (const [key, value] of Object.entries(request)) {
      if (key === "Item") continue;
      if (value !== undefined && value !== null) {
        cleanRequest[key] = value;
      }
    }

    // Transform items
    if ("Item" in request && Array.isArray(request.Item)) {
      cleanRequest.Item = request.Item.map((item) =>
        this.transformItemForXml(item)
      );
    }

    return { [rootKey]: cleanRequest };
  }

  /**
   * Transform a single item for XML generation
   */
  private transformItemForXml(
    item: XeItem | Pick<XeItem, "@type" | "@refId">
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(item)) {
      if (value === undefined || value === null) continue;

      // Handle nested structures
      if (key === "Item.otherPhones" && typeof value === "object") {
        result[key] = value;
      } else if (key === "Field" && Array.isArray(value)) {
        // Transform Field array
        result.Field = value.map((field: { Name: string; Value: string }) => ({
          "@Name": field.Name,
          "#text": field.Value,
        }));
      } else if (key === "Asset" && Array.isArray(value)) {
        // Transform Asset array
        result.Asset = value.map((asset) => {
          const assetObj: Record<string, unknown> = {};
          for (const [assetKey, assetValue] of Object.entries(asset)) {
            if (assetValue !== undefined && assetValue !== null) {
              // Convert Asset.xxx keys to @xxx attributes
              if (assetKey.startsWith("Asset.")) {
                assetObj["@" + assetKey.replace("Asset.", "")] = assetValue;
              } else {
                assetObj[assetKey] = assetValue;
              }
            }
          }
          return assetObj;
        });
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Create ZIP package with XML and optional assets
   */
  async createZipPackage(xml: string): Promise<Buffer> {
    const zip = new JSZip();

    // Add the XML file
    zip.file("request.xml", xml);

    // Generate ZIP buffer
    const buffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });

    // Check size limit
    if (buffer.length > MAX_ZIP_BYTES) {
      throw new Error(
        `ZIP package exceeds ${MAX_ZIP_BYTES / (1024 * 1024)}MB limit`
      );
    }

    return buffer;
  }

  /**
   * Submit package to XE add endpoint
   */
  async addItems(request: XeAddItemsRequest): Promise<XeApiResponse> {
    const xml = this.buildXml(request);
    const zipBuffer = await this.createZipPackage(xml);
    return this.submitPackage(`${this.baseUrl}/request/add`, zipBuffer, request["Package.id"]);
  }

  /**
   * Submit package to XE remove endpoint
   */
  async removeItems(request: XeRemoveItemsRequest): Promise<XeApiResponse> {
    const xml = this.buildXml(request);
    const zipBuffer = await this.createZipPackage(xml);
    return this.submitPackage(`${this.baseUrl}/request/remove`, zipBuffer, request["Package.id"]);
  }

  /**
   * Submit ZIP package to XE API
   */
  private async submitPackage(
    endpoint: string,
    zipBuffer: Buffer,
    packageId: string
  ): Promise<XeApiResponse> {
    try {
      // Create form data using native FormData
      const formData = new FormData();
      formData.append("username", this.config.username);
      formData.append("password", this.config.password);

      // Create a Blob from the buffer and append as file
      // Convert Buffer to Uint8Array for proper Blob construction
      const uint8Array = new Uint8Array(zipBuffer);
      const blob = new Blob([uint8Array], { type: "application/zip" });
      formData.append("file", blob, "package.zip");

      // Submit to XE
      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      const responseText = await response.text();
      const headers = Object.fromEntries(response.headers.entries());

      return {
        success: response.ok,
        packageId,
        message: responseText,
        statusCode: response.status,
        headers,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error occurred";
      console.error("[XE_CLIENT] Submit error:", error);

      return {
        success: false,
        packageId,
        message: `Failed to submit package: ${message}`,
        statusCode: 0,
      };
    }
  }

  /**
   * Sync properties to XE (convenience method)
   */
  async syncProperties(
    items: XeItem[],
    options: XeBuildPackageOptions
  ): Promise<XeApiResponse> {
    if (items.length === 0) {
      return {
        success: false,
        packageId: "",
        message: "No items to sync",
      };
    }

    const request = this.buildAddItemsRequest(items, options);
    return this.addItems(request);
  }

  /**
   * Remove properties from XE (convenience method)
   */
  async removeProperties(
    refIds: Array<{ type: XeItem["@type"]; refId: string }>,
    organizationId: string
  ): Promise<XeApiResponse> {
    if (refIds.length === 0) {
      return {
        success: false,
        packageId: "",
        message: "No items to remove",
      };
    }

    const request = this.buildRemoveItemsRequest(refIds, organizationId);
    return this.removeItems(request);
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Create XE client from database integration settings
 */
export function createXeClientFromIntegration(integration: {
  username: string;
  password: string;
  authToken: string;
  trademark?: string | null;
}): XeClient {
  return new XeClient({
    username: integration.username,
    password: integration.password,
    authToken: integration.authToken,
    trademark: integration.trademark || undefined,
    baseUrl: process.env.XE_GR_BASE_URL || DEFAULT_BASE_URL,
  });
}

/**
 * Validate XE credentials by making a test request
 */
export async function validateXeCredentials(config: XeClientConfig): Promise<{
  valid: boolean;
  message: string;
}> {
  try {
    // We can't really validate without making a real request
    // Just check that all required fields are present
    if (!config.username || !config.password || !config.authToken) {
      return {
        valid: false,
        message: "Missing required credentials (username, password, or authToken)",
      };
    }

    // Check format of auth token (basic validation)
    if (config.authToken.length < 10) {
      return {
        valid: false,
        message: "Auth token appears to be invalid (too short)",
      };
    }

    return {
      valid: true,
      message: "Credentials format appears valid",
    };
  } catch (error) {
    return {
      valid: false,
      message: error instanceof Error ? error.message : "Validation failed",
    };
  }
}

// Re-export for convenience
export { XeClient as default };
