/**
 * Portal Worker - K8s Job for XE.gr publishing
 * 
 * Handles XE.gr Bulk Import Tool (BIT) operations:
 * - Generates XML package from properties
 * - Creates ZIP with images
 * - Uploads to XE.gr API
 */

import { pino } from 'pino';
import { XMLBuilder } from 'fast-xml-parser';
import JSZip from 'jszip';
import IORedis from 'ioredis';
import { PrismaClient } from '@prisma/client';

// ===========================================
// Types
// ===========================================

interface PortalPublishPayload {
  type: 'portal-publish-xe';
  action: 'add' | 'remove';
  propertyIds: string[];
  skipAssets?: boolean;
}

interface PortalPublishResult {
  type: 'portal-publish-xe';
  action: 'add' | 'remove';
  totalProperties: number;
  successCount: number;
  failedCount: number;
  portalResponse?: unknown;
  duration: number;
}

// ===========================================
// Logger
// ===========================================

const logger = pino({
  name: 'portal-worker',
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production' 
    ? { target: 'pino-pretty' } 
    : undefined
});

// ===========================================
// Clients
// ===========================================

const prisma = new PrismaClient();

// XE.gr Configuration
const XE_BASE_URL = process.env.XE_GR_BASE_URL || 'http://import.xe.gr';
const XE_USERNAME = process.env.XE_GR_USERNAME;
const XE_PASSWORD = process.env.XE_GR_PASSWORD;
const XE_AUTHTOKEN = process.env.XE_GR_AUTHTOKEN;

// ===========================================
// Environment & Context
// ===========================================

function getJobContext(): { 
  jobId: string; 
  organizationId: string; 
  payload: PortalPublishPayload;
  callbackUrl?: string;
  redisUrl?: string;
} {
  const jobId = process.env.JOB_ID;
  const organizationId = process.env.ORGANIZATION_ID;
  const payloadStr = process.env.PAYLOAD;

  if (!jobId || !organizationId || !payloadStr) {
    throw new Error('Missing required environment variables: JOB_ID, ORGANIZATION_ID, PAYLOAD');
  }

  let payload: PortalPublishPayload;
  try {
    payload = JSON.parse(payloadStr);
  } catch {
    throw new Error('Failed to parse PAYLOAD environment variable');
  }

  return {
    jobId,
    organizationId,
    payload,
    callbackUrl: process.env.CALLBACK_URL,
    redisUrl: process.env.REDIS_URL,
  };
}

// ===========================================
// Progress Reporter
// ===========================================

class ProgressReporter {
  private jobId: string;
  private callbackUrl?: string;
  private redis?: IORedis;
  private lastProgress = 0;
  private callbackSecret?: string;

  constructor(jobId: string, callbackUrl?: string, redisUrl?: string) {
    this.jobId = jobId;
    this.callbackUrl = callbackUrl;
    this.callbackSecret = process.env.WORKER_CALLBACK_SECRET || process.env.CRON_SECRET;

    if (redisUrl) {
      this.redis = new IORedis(redisUrl, { maxRetriesPerRequest: 3 });
    }
  }

  async progress(progress: number, message?: string): Promise<void> {
    const clamped = Math.min(100, Math.max(0, progress));
    if (clamped <= this.lastProgress && clamped < 100) return;
    this.lastProgress = clamped;

    logger.info({ progress: clamped, message }, 'Progress update');

    if (this.redis) {
      try {
        await this.redis.hset(`job:${this.jobId}`, 'progress', clamped.toString(), 'message', message || '');
      } catch (err) {
        logger.warn({ error: err }, 'Failed to update Redis');
      }
    }

    if (this.callbackUrl) {
      try {
        await this.sendCallback('job.progress', { progress: clamped, message });
      } catch (err) {
        logger.warn({ error: err }, 'Failed to send progress callback');
      }
    }
  }

  async complete(result: PortalPublishResult): Promise<void> {
    logger.info({ result }, 'Job completed');

    if (this.callbackUrl) {
      try {
        await this.sendCallback('job.completed', { result });
      } catch (err) {
        logger.error({ error: err }, 'Failed to send completion callback');
      }
    }

    await this.cleanup();
  }

  async fail(errorMessage: string): Promise<void> {
    logger.error({ errorMessage }, 'Job failed');

    if (this.callbackUrl) {
      try {
        await this.sendCallback('job.failed', { errorMessage });
      } catch (err) {
        logger.error({ error: err }, 'Failed to send failure callback');
      }
    }

    await this.cleanup();
  }

  private async sendCallback(event: string, data: Record<string, unknown>): Promise<void> {
    if (!this.callbackUrl) return;

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.callbackSecret) {
      headers['Authorization'] = `Bearer ${this.callbackSecret}`;
    }

    await fetch(this.callbackUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        event,
        jobId: this.jobId,
        timestamp: new Date().toISOString(),
        data,
      }),
    });
  }

  private async cleanup(): Promise<void> {
    if (this.redis) {
      try { await this.redis.quit(); } catch { /* ignore */ }
    }
  }
}

// ===========================================
// XE.gr Package Builder
// ===========================================

function generatePackageId(organizationId: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  const orgShort = organizationId.slice(0, 8).toUpperCase();
  return `OIKION-${orgShort}-${timestamp}-${random}`;
}

async function buildAddPackage(
  properties: any[],
  organizationId: string,
  skipAssets: boolean
): Promise<{ xml: string; images: Map<string, Buffer> }> {
  const packageId = generatePackageId(organizationId);
  const images = new Map<string, Buffer>();

  const items = await Promise.all(properties.map(async (prop, index) => {
    // Collect images if not skipping
    const propImages: string[] = [];
    if (!skipAssets && prop.images && Array.isArray(prop.images)) {
      for (let i = 0; i < Math.min(prop.images.length, 10); i++) {
        const imageUrl = prop.images[i];
        try {
          const response = await fetch(imageUrl);
          if (response.ok) {
            const buffer = Buffer.from(await response.arrayBuffer());
            const filename = `${prop.id}_${i}.jpg`;
            images.set(filename, buffer);
            propImages.push(filename);
          }
        } catch {
          logger.warn({ imageUrl }, 'Failed to fetch image');
        }
      }
    }

    return {
      'Item.itemId': prop.friendlyId || prop.id,
      'Item.type': mapPropertyType(prop.propertyType),
      'Item.subtype': prop.propertySubtype || undefined,
      'Item.availability': prop.transactionType === 'RENT' ? 'rent' : 'sale',
      'Item.price': prop.price?.toString(),
      'Item.size': prop.size?.toString(),
      'Item.rooms': prop.bedrooms?.toString(),
      'Item.bathrooms': prop.bathrooms?.toString(),
      'Item.floor': prop.floor?.toString(),
      'Item.yearBuilt': prop.yearBuilt?.toString(),
      'Item.title': prop.title || `${prop.propertyType} in ${prop.city}`,
      'Item.description': prop.description,
      'Item.address.street': prop.address,
      'Item.address.city': prop.city,
      'Item.address.area': prop.area,
      'Item.address.postalCode': prop.postalCode,
      'Item.geo.latitude': prop.latitude?.toString(),
      'Item.geo.longitude': prop.longitude?.toString(),
      'Item.images': propImages.length > 0 ? propImages.join(',') : undefined,
    };
  }));

  const packageData = {
    'Package.xeAuthToken': XE_AUTHTOKEN,
    'Package.schemaVersion': '1.1',
    'Package.id': packageId,
    'Package.timestamp': new Date().toISOString(),
    'Package.crmProviderCode': 'OIKION_CRM',
    'Package.skipAssets': skipAssets ? 'true' : undefined,
    Item: items,
  };

  const builder = new XMLBuilder({
    ignoreAttributes: false,
    format: true,
    suppressEmptyNode: true,
  });

  const xml = builder.build({ AddItemsRequest: packageData });
  return { xml, images };
}

function mapPropertyType(type: string): string {
  const mapping: Record<string, string> = {
    'APARTMENT': 'apartment',
    'HOUSE': 'house',
    'MAISONETTE': 'maisonette',
    'STUDIO': 'studio',
    'LAND': 'land',
    'COMMERCIAL': 'commercial',
    'OFFICE': 'office',
    'WAREHOUSE': 'warehouse',
    'PARKING': 'parking',
  };
  return mapping[type] || 'other';
}

async function createZipPackage(
  xml: string,
  images: Map<string, Buffer>
): Promise<Buffer> {
  const zip = new JSZip();
  
  zip.file('package.xml', xml);
  
  if (images.size > 0) {
    const imagesFolder = zip.folder('images');
    for (const [filename, buffer] of images) {
      imagesFolder?.file(filename, buffer);
    }
  }

  return await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

// ===========================================
// XE.gr API
// ===========================================

async function uploadToXeGr(
  action: 'add' | 'remove',
  zipBuffer: Buffer
): Promise<{ ok: boolean; status: number; body: unknown }> {
  if (!XE_USERNAME || !XE_PASSWORD) {
    throw new Error('XE_GR_USERNAME and XE_GR_PASSWORD are required');
  }

  const endpoint = action === 'add' 
    ? `${XE_BASE_URL}/api/bit/v1/import/items/add`
    : `${XE_BASE_URL}/api/bit/v1/import/items/remove`;

  const formData = new FormData();
  formData.append('file', new Blob([zipBuffer], { type: 'application/zip' }), 'package.zip');

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${XE_USERNAME}:${XE_PASSWORD}`).toString('base64'),
    },
    body: formData,
  });

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = await response.text();
  }

  return {
    ok: response.ok,
    status: response.status,
    body,
  };
}

// ===========================================
// Main Job Runner
// ===========================================

async function runJob(): Promise<void> {
  const startTime = Date.now();
  const context = getJobContext();
  const { jobId, organizationId, payload, callbackUrl, redisUrl } = context;

  logger.info({ 
    jobId, 
    organizationId, 
    action: payload.action,
    propertyCount: payload.propertyIds.length 
  }, 'Starting Portal Publishing job');

  const reporter = new ProgressReporter(jobId, callbackUrl, redisUrl);

  try {
    // Validate XE credentials
    if (!XE_USERNAME || !XE_PASSWORD || !XE_AUTHTOKEN) {
      throw new Error('XE.gr credentials not configured');
    }

    await reporter.progress(5, 'Fetching properties...');

    // Get properties
    const properties = await prisma.properties.findMany({
      where: {
        organizationId,
        id: { in: payload.propertyIds },
      },
    });

    if (properties.length === 0) {
      throw new Error('No properties found to publish');
    }

    const totalProperties = properties.length;

    await reporter.progress(10, `Building package for ${totalProperties} properties...`);

    // Build XML package
    const { xml, images } = await buildAddPackage(
      properties,
      organizationId,
      payload.skipAssets || false
    );

    await reporter.progress(40, `Creating ZIP (${images.size} images)...`);

    // Create ZIP
    const zipBuffer = await createZipPackage(xml, images);

    await reporter.progress(60, 'Uploading to XE.gr...');

    // Upload to XE.gr
    const uploadResult = await uploadToXeGr(payload.action, zipBuffer);

    await reporter.progress(90, 'Processing response...');

    // Update property XE publishing status
    if (uploadResult.ok) {
      await prisma.properties.updateMany({
        where: { id: { in: payload.propertyIds } },
        data: {
          xePublishedAt: payload.action === 'add' ? new Date() : null,
          xePublishStatus: payload.action === 'add' ? 'PUBLISHED' : 'UNPUBLISHED',
        },
      });
    }

    const duration = Date.now() - startTime;

    const result: PortalPublishResult = {
      type: 'portal-publish-xe',
      action: payload.action,
      totalProperties,
      successCount: uploadResult.ok ? totalProperties : 0,
      failedCount: uploadResult.ok ? 0 : totalProperties,
      portalResponse: uploadResult.body,
      duration,
    };

    if (uploadResult.ok) {
      await reporter.complete(result);
      logger.info({ duration, totalProperties }, 'Job completed successfully');
      process.exit(0);
    } else {
      throw new Error(`XE.gr upload failed: ${JSON.stringify(uploadResult.body)}`);
    }

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.fatal({ error: errorMsg }, 'Job failed');

    await reporter.fail(errorMsg);
    await prisma.$disconnect();
    process.exit(1);
  }
}

// ===========================================
// Entry Point
// ===========================================

runJob().catch((error) => {
  logger.fatal({ error }, 'Unhandled error in job runner');
  process.exit(1);
});
