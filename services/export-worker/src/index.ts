/**
 * Export Worker - K8s Job for bulk data exports
 * 
 * Generates Excel, CSV, or PDF exports asynchronously.
 * Uploads to storage and optionally sends download link via email.
 */

import { pino } from 'pino';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import IORedis from 'ioredis';
import { PrismaClient } from '@prisma/client';
import { Resend } from 'resend';
import { Readable } from 'stream';

// ===========================================
// Types
// ===========================================

interface BulkExportPayload {
  type: 'bulk-export';
  exportType: 'crm' | 'mls' | 'reports' | 'calendar';
  format: 'xlsx' | 'xls' | 'csv' | 'pdf' | 'xml';
  filters?: Record<string, unknown>;
  locale?: 'en' | 'el';
  sendEmail?: boolean;
  recipientEmail?: string;
}

interface BulkExportResult {
  type: 'bulk-export';
  exportType: string;
  format: string;
  rowCount: number;
  fileUrl?: string;
  fileSize?: number;
  expiresAt?: Date;
  duration: number;
}

// ===========================================
// Logger
// ===========================================

const logger = pino({
  name: 'export-worker',
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production' 
    ? { target: 'pino-pretty' } 
    : undefined
});

// ===========================================
// Clients
// ===========================================

const prisma = new PrismaClient();
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// ===========================================
// Environment & Context
// ===========================================

function getJobContext(): { 
  jobId: string; 
  organizationId: string; 
  payload: BulkExportPayload;
  callbackUrl?: string;
  redisUrl?: string;
} {
  const jobId = process.env.JOB_ID;
  const organizationId = process.env.ORGANIZATION_ID;
  const payloadStr = process.env.PAYLOAD;

  if (!jobId || !organizationId || !payloadStr) {
    throw new Error('Missing required environment variables: JOB_ID, ORGANIZATION_ID, PAYLOAD');
  }

  let payload: BulkExportPayload;
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

  async complete(result: BulkExportResult): Promise<void> {
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
// Data Fetchers
// ===========================================

async function fetchCRMData(organizationId: string, filters?: Record<string, unknown>) {
  const where: any = { organizationId };
  
  if (filters?.status) {
    where.client_status = filters.status;
  }
  if (filters?.search) {
    where.OR = [
      { client_name: { contains: filters.search as string, mode: 'insensitive' } },
      { primary_email: { contains: filters.search as string, mode: 'insensitive' } },
    ];
  }

  return prisma.clients.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
}

async function fetchMLSData(organizationId: string, filters?: Record<string, unknown>) {
  const where: any = { organizationId };
  
  if (filters?.status) {
    where.property_status = filters.status;
  }
  if (filters?.type) {
    where.propertyType = filters.type;
  }

  return prisma.properties.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
}

// ===========================================
// Export Generators
// ===========================================

async function generateExcelExport(
  data: any[],
  exportType: string,
  format: 'xlsx' | 'xls' | 'csv'
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(exportType.toUpperCase());

  if (data.length === 0) {
    worksheet.addRow(['No data to export']);
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  // Get column headers from first row
  const headers = Object.keys(data[0]).filter(
    key => !key.startsWith('_') && key !== 'password'
  );

  // Add header row with styling
  const headerRow = worksheet.addRow(headers.map(h => formatHeader(h)));
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE9E9E9' },
  };

  // Add data rows
  for (const row of data) {
    const values = headers.map(h => {
      const value = row[h];
      if (value instanceof Date) return value.toISOString();
      if (typeof value === 'object') return JSON.stringify(value);
      return value;
    });
    worksheet.addRow(values);
  }

  // Auto-fit columns
  worksheet.columns.forEach(column => {
    let maxLength = 10;
    column.eachCell?.({ includeEmpty: true }, cell => {
      const length = cell.value ? cell.value.toString().length : 10;
      maxLength = Math.max(maxLength, length);
    });
    column.width = Math.min(maxLength + 2, 50);
  });

  if (format === 'csv') {
    return Buffer.from(await workbook.csv.writeBuffer());
  }

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

function formatHeader(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

async function generatePDFExport(
  data: any[],
  exportType: string,
  locale: 'en' | 'el'
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ margin: 50 });

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Title
    doc.fontSize(20).text(
      locale === 'el' 
        ? `Εξαγωγή ${exportType.toUpperCase()}` 
        : `${exportType.toUpperCase()} Export`,
      { align: 'center' }
    );
    doc.moveDown();

    // Date
    doc.fontSize(10).text(
      `${locale === 'el' ? 'Ημερομηνία' : 'Date'}: ${new Date().toLocaleDateString(locale === 'el' ? 'el-GR' : 'en-US')}`,
      { align: 'right' }
    );
    doc.moveDown();

    // Stats
    doc.fontSize(12).text(
      `${locale === 'el' ? 'Σύνολο εγγραφών' : 'Total Records'}: ${data.length}`
    );
    doc.moveDown(2);

    // Table-like output
    if (data.length > 0) {
      const headers = Object.keys(data[0]).filter(
        key => !key.startsWith('_') && key !== 'password'
      ).slice(0, 5); // Limit columns for PDF

      doc.fontSize(10);

      for (let i = 0; i < Math.min(data.length, 100); i++) {
        const row = data[i];
        doc.font('Helvetica-Bold').text(`#${i + 1}`, { continued: false });
        
        for (const header of headers) {
          let value = row[header];
          if (value instanceof Date) value = value.toLocaleDateString();
          if (typeof value === 'object') value = JSON.stringify(value);
          
          doc.font('Helvetica')
            .text(`${formatHeader(header)}: ${value || '-'}`, { indent: 20 });
        }
        
        doc.moveDown();

        // Add page break if needed
        if (doc.y > 700) {
          doc.addPage();
        }
      }

      if (data.length > 100) {
        doc.moveDown();
        doc.text(
          locale === 'el' 
            ? `... και ${data.length - 100} ακόμη εγγραφές` 
            : `... and ${data.length - 100} more records`
        );
      }
    }

    doc.end();
  });
}

// ===========================================
// Storage & Email
// ===========================================

async function uploadToStorage(
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<{ url: string; expiresAt: Date }> {
  // For now, store in database as base64 (can be replaced with S3/DO Spaces)
  // This is a simplified implementation
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  
  // In production, upload to object storage and return URL
  // For now, we'll return a data URL (not ideal for large files)
  const base64 = buffer.toString('base64');
  const dataUrl = `data:${contentType};base64,${base64}`;
  
  logger.info({ filename, size: buffer.length }, 'File generated');
  
  return {
    url: dataUrl,
    expiresAt,
  };
}

async function sendDownloadEmail(
  email: string,
  downloadUrl: string,
  exportType: string,
  locale: 'en' | 'el'
): Promise<void> {
  if (!resend) {
    logger.warn('Resend not configured, skipping email');
    return;
  }

  await resend.emails.send({
    from: process.env.EMAIL_FROM || 'exports@oikion.com',
    to: email,
    subject: locale === 'el' 
      ? `Η εξαγωγή ${exportType} είναι έτοιμη`
      : `Your ${exportType} export is ready`,
    html: `
      <p>${locale === 'el' ? 'Η εξαγωγή δεδομένων ολοκληρώθηκε.' : 'Your data export is complete.'}</p>
      <p><a href="${downloadUrl}">${locale === 'el' ? 'Κατεβάστε το αρχείο' : 'Download your file'}</a></p>
      <p>${locale === 'el' ? 'Ο σύνδεσμος λήγει σε 7 ημέρες.' : 'This link expires in 7 days.'}</p>
    `,
  });
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
    exportType: payload.exportType,
    format: payload.format,
  }, 'Starting Export job');

  const reporter = new ProgressReporter(jobId, callbackUrl, redisUrl);

  try {
    await reporter.progress(5, 'Fetching data...');

    // Fetch data based on export type
    let data: any[];
    switch (payload.exportType) {
      case 'crm':
        data = await fetchCRMData(organizationId, payload.filters);
        break;
      case 'mls':
        data = await fetchMLSData(organizationId, payload.filters);
        break;
      default:
        throw new Error(`Unsupported export type: ${payload.exportType}`);
    }

    logger.info({ rowCount: data.length }, 'Data fetched');
    await reporter.progress(30, `Found ${data.length} records...`);

    // Generate export file
    let buffer: Buffer;
    let contentType: string;
    let extension: string;

    switch (payload.format) {
      case 'xlsx':
      case 'xls':
        buffer = await generateExcelExport(data, payload.exportType, payload.format);
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        extension = payload.format;
        break;
      case 'csv':
        buffer = await generateExcelExport(data, payload.exportType, 'csv');
        contentType = 'text/csv';
        extension = 'csv';
        break;
      case 'pdf':
        buffer = await generatePDFExport(data, payload.exportType, payload.locale || 'en');
        contentType = 'application/pdf';
        extension = 'pdf';
        break;
      default:
        throw new Error(`Unsupported format: ${payload.format}`);
    }

    await reporter.progress(70, 'Uploading file...');

    // Upload to storage
    const filename = `${payload.exportType}-export-${Date.now()}.${extension}`;
    const { url, expiresAt } = await uploadToStorage(buffer, filename, contentType);

    await reporter.progress(90, 'Finalizing...');

    // Send email if requested
    if (payload.sendEmail && payload.recipientEmail) {
      await sendDownloadEmail(
        payload.recipientEmail,
        url,
        payload.exportType,
        payload.locale || 'en'
      );
    }

    const duration = Date.now() - startTime;

    const result: BulkExportResult = {
      type: 'bulk-export',
      exportType: payload.exportType,
      format: payload.format,
      rowCount: data.length,
      fileUrl: url,
      fileSize: buffer.length,
      expiresAt,
      duration,
    };

    await reporter.complete(result);
    await prisma.$disconnect();

    logger.info({ duration, rowCount: data.length }, 'Job completed successfully');
    process.exit(0);

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
