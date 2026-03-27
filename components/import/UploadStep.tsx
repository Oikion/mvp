"use client";

import { useCallback, useState, useMemo } from "react";
import { useDropzone } from "react-dropzone";
import { Workbook, type Cell, type Worksheet } from "exceljs";
import { XMLParser } from "fast-xml-parser";
import { Upload, FileText, X, Download, AlertCircle, AlertTriangle, Info, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Link } from "@/navigation";
import { propertyImportFieldDefinitions } from "@/lib/import/property-import-schema";
import { clientImportFieldDefinitions } from "@/lib/import/client-import-schema";
import { mandateImportFieldDefinitions } from "@/lib/import/mandate-import-schema";

interface UploadStepProps {
  readonly dict: {
    readonly dropzone: string;
    readonly supportedFormats: string;
    readonly maxSize: string;
    readonly selectedFile: string;
    readonly removeFile: string;
    readonly downloadTemplate: string;
    readonly templateDescription: string;
  };
  readonly errorsDict: {
    readonly fileRequired: string;
    readonly invalidFileType: string;
    readonly fileTooLarge: string;
    readonly parseError: string;
    readonly noData: string;
  };
  readonly onFileUpload: (
    file: File,
    headers: string[],
    data: Record<string, unknown>[]
  ) => void;
  readonly onFileHash?: (hash: string) => void;
  readonly currentFile: File | null;
  readonly entityType: "client" | "property" | "mandate";
  readonly unifiedMode?: boolean;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_ROWS = 5000;
const ACCEPTED_FILE_TYPES = {
  "text/csv": [".csv"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "text/xml": [".xml"],
  "application/xml": [".xml"],
};

/** Shape of a parsed sheet used for multi-sheet selection UI */
interface SheetSummary {
  name: string;
  rowCount: number;
  sampleHeaders: string[];
  headers: string[];
  data: Record<string, unknown>[];
}

interface DedupInfo {
  id: string;
  date: string;
  filename: string;
  createdCount: number;
  status: string;
}

/**
 * Extract a primitive value from an ExcelJS CellValue.
 * Cells can contain formula objects, rich text, hyperlinks, etc.
 */
function getCellPrimitive(cell: Cell): unknown {
  const v = cell.value;
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v;
  if (typeof v !== "object") return v;
  // Formula cell: { formula, result }
  if ("result" in v) return (v as { result: unknown }).result ?? "";
  // Rich text cell: { richText: [{ text }] }
  if ("richText" in v) return (v as { richText: { text: string }[] }).richText.map(r => r.text).join("");
  // Hyperlink cell: { text, hyperlink }
  if ("text" in v) return (v as { text: string }).text;
  // Fallback for any remaining object shape — should not occur in practice
  return JSON.stringify(v);
}

/**
 * Parse a single worksheet into headers + data rows.
 */
function parseWorksheet(
  worksheet: Worksheet
): { headers: string[]; data: Record<string, unknown>[] } {
  if (!worksheet || worksheet.rowCount === 0) {
    return { headers: [], data: [] };
  }

  // First row is headers
  const headerRow = worksheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const raw = getCellPrimitive(cell);
    headers[colNumber - 1] = raw instanceof Date ? raw.toISOString() : String(raw ?? "");
  });

  // Remaining rows are data
  const data: Record<string, unknown>[] = [];
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return; // skip header
    const record: Record<string, unknown> = {};
    headers.forEach((header, index) => {
      const cell = row.getCell(index + 1);
      record[header] = getCellPrimitive(cell);
    });
    data.push(record);
  });

  return { headers: headers.filter(Boolean), data };
}

/**
 * Parse an XLSX buffer into headers + JSON rows using ExcelJS.
 * Returns single-sheet result; if multiple sheets exist, returns sheet summaries instead.
 */
async function parseXlsxBuffer(
  buffer: ArrayBuffer
): Promise<{ headers: string[]; data: Record<string, unknown>[]; sheets?: SheetSummary[] }> {
  const workbook = new Workbook();
  await workbook.xlsx.load(buffer);

  if (workbook.worksheets.length > 1) {
    // Build sheet summaries for picker UI
    const sheets: SheetSummary[] = workbook.worksheets.map((ws) => {
      const { headers, data } = parseWorksheet(ws);
      return {
        name: ws.name,
        rowCount: data.length,
        sampleHeaders: headers.slice(0, 3),
        headers,
        data,
      };
    });
    return { headers: [], data: [], sheets };
  }

  // Single sheet — existing behaviour
  const worksheet = workbook.worksheets[0];
  const result = parseWorksheet(worksheet);
  return { headers: result.headers, data: result.data };
}

/**
 * Build the per-sheet header map: original header name -> effective column name.
 * If the same header exists in a prior sheet, suffix with ` (SheetName)`.
 */
function buildSheetHeaderMap(
  sheet: SheetSummary,
  priorSheets: SheetSummary[]
): Record<string, string> {
  const priorHeaders = new Set(priorSheets.flatMap((s) => s.headers));
  const headerMap: Record<string, string> = {};
  const seenInSheet = new Set<string>();

  for (const h of sheet.headers) {
    if (seenInSheet.has(h)) continue;
    seenInSheet.add(h);
    headerMap[h] = priorHeaders.has(h) ? `${h} (${sheet.name})` : h;
  }

  return headerMap;
}

/**
 * Merge multiple selected sheets into a single headers + data set.
 * - Unions all column headers across sheets
 * - Suffixes duplicate column names with ` (SheetName)`
 * - Missing columns in a row get null
 * - Attaches _sourceSheet metadata to every row
 */
function buildGlobalHeaders(selected: SheetSummary[]): string[] {
  const globalHeaders: string[] = [];
  const headerSet = new Set<string>();

  for (const sheet of selected) {
    for (const h of sheet.headers) {
      if (headerSet.has(h)) {
        const suffixed = `${h} (${sheet.name})`;
        if (!headerSet.has(suffixed)) {
          globalHeaders.push(suffixed);
          headerSet.add(suffixed);
        }
      } else {
        globalHeaders.push(h);
        headerSet.add(h);
      }
    }
  }

  return globalHeaders;
}

function mergeSheets(
  selected: SheetSummary[]
): { headers: string[]; data: Record<string, unknown>[] } {
  if (selected.length === 0) return { headers: [], data: [] };

  const globalHeaders = buildGlobalHeaders(selected);
  const data: Record<string, unknown>[] = [];

  for (let i = 0; i < selected.length; i++) {
    const sheet = selected[i];
    const headerMap = buildSheetHeaderMap(sheet, selected.slice(0, i));

    for (const row of sheet.data) {
      // Pre-fill all columns with null
      const merged: Record<string, unknown> = Object.fromEntries(
        globalHeaders.map((gh) => [gh, null])
      );
      // Apply values from this row
      for (const [origH, value] of Object.entries(row)) {
        const effectiveH = headerMap[origH] ?? origH;
        if (effectiveH in merged) {
          merged[effectiveH] = value;
        }
      }
      merged["_sourceSheet"] = sheet.name;
      data.push(merged);
    }
  }

  return { headers: globalHeaders, data };
}

/**
 * Parse a CSV text string into headers + JSON rows.
 * Handles quoted fields with embedded commas, newlines, and escaped quotes.
 */
function parseCsvText(text: string): { headers: string[]; data: Record<string, unknown>[] } {
  // Strip BOM if present
  const content = text.replace(/^\ufeff/, "");
  const rows = parseCsvRows(content);

  if (rows.length === 0) return { headers: [], data: [] };

  const headers = rows[0];
  const data: Record<string, unknown>[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.every(cell => cell === "")) continue; // skip blank rows
    const record: Record<string, unknown> = {};
    headers.forEach((header, index) => {
      record[header] = row[index] ?? "";
    });
    data.push(record);
  }

  return { headers, data };
}

/**
 * RFC 4180-compliant CSV row parser.
 * Handles quoted fields containing commas, newlines, and doubled quotes.
 */
function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        field += ch;
        i++;
      }
    } else if (ch === '"') {
      inQuotes = true;
      i++;
    } else if (ch === ",") {
      row.push(field);
      field = "";
      i++;
    } else if (ch === "\r") {
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
      i++;
      if (i < text.length && text[i] === "\n") i++;
    } else if (ch === "\n") {
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
      i++;
    } else {
      field += ch;
      i++;
    }
  }

  // Last field/row
  if (field || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

/**
 * Compute SHA-256 hash of a File and return it as a lowercase hex string.
 */
async function computeFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

/** Curated ~25 columns for the unified template (most common from each entity). */
const UNIFIED_TEMPLATE_HEADERS = [
  // Client
  "client_name", "primary_phone", "primary_email", "client_type",
  // Property
  "property_name", "property_type", "transaction_type", "price",
  "address_street", "address_city", "municipality", "bedrooms", "bathrooms",
  "size_net_sqm",
  // Mandate
  "budget_min", "budget_max", "mandate_transaction_type",
  "mandate_municipality", "size_min_sqm", "size_max_sqm",
  "bedrooms_min", "bedrooms_max", "urgency", "timeline",
];

/**
 * Enum options per field key — used to add Excel data validation dropdowns to templates.
 */
const ENUM_FIELD_OPTIONS: Record<string, string[]> = {
  // Property
  property_type: ["RESIDENTIAL", "COMMERCIAL", "LAND", "RENTAL", "VACATION", "APARTMENT", "HOUSE", "MAISONETTE", "WAREHOUSE", "PARKING", "PLOT", "FARM", "INDUSTRIAL", "OTHER"],
  property_status: ["ACTIVE", "PENDING", "SOLD", "OFF_MARKET", "WITHDRAWN"],
  transaction_type: ["SALE", "RENTAL", "SHORT_TERM", "EXCHANGE", "AUCTION"],
  heating_type: ["AUTONOMOUS", "CENTRAL", "NATURAL_GAS", "HEAT_PUMP", "ELECTRIC", "NONE"],
  energy_cert_class: ["A_PLUS", "A", "B", "C", "D", "E", "F", "G", "H", "IN_PROGRESS"],
  condition: ["EXCELLENT", "VERY_GOOD", "GOOD", "NEEDS_RENOVATION"],
  furnished: ["NO", "PARTIALLY", "FULLY"],
  price_type: ["RENTAL", "SALE", "PER_ACRE", "PER_SQM"],
  legalization_status: ["LEGALIZED", "IN_PROGRESS", "UNDECLARED"],
  frontage_type: ["MAIN_ROAD", "SECONDARY_ROAD", "PEDESTRIAN", "CORNER", "SQUARE", "CUL_DE_SAC", "NONE"],
  address_privacy_level: ["EXACT", "PARTIAL", "HIDDEN"],
  visibility: ["HIDDEN", "PRIVATE", "SECURE", "PUBLIC"],
  // Client
  client_type: ["BUYER", "SELLER", "RENTER", "INVESTOR", "REFERRAL_PARTNER"],
  client_status: ["LEAD", "ACTIVE", "INACTIVE", "CONVERTED", "LOST"],
  person_type: ["INDIVIDUAL", "COMPANY", "INVESTOR", "BROKER"],
  lead_source: ["REFERRAL", "WEB", "PORTAL", "WALK_IN", "SOCIAL"],
  // Mandate
  status: ["DRAFT", "ACTIVE", "PAUSED", "FULFILLED", "EXPIRED", "CANCELLED"],
  urgency: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
  timeline: ["IMMEDIATE", "ONE_THREE_MONTHS", "THREE_SIX_MONTHS", "SIX_PLUS_MONTHS"],
  property_purpose: ["RESIDENTIAL", "COMMERCIAL", "LAND", "PARKING", "OTHER"],
};

/**
 * Field descriptions for the Instructions sheet — key → human-readable description.
 */
const FIELD_DESCRIPTIONS: Record<string, { label: string; required: boolean; description: string }> = {
  // Property
  property_name: { label: "Property Name", required: true, description: "Name or title of the property listing" },
  property_type: { label: "Property Type", required: false, description: "Type: APARTMENT, HOUSE, LAND, COMMERCIAL, etc." },
  transaction_type: { label: "Transaction Type", required: false, description: "SALE, RENTAL, SHORT_TERM, EXCHANGE, AUCTION" },
  price: { label: "Price (EUR)", required: false, description: "Asking price in Euros" },
  address_street: { label: "Street Address", required: false, description: "Street name and number" },
  address_city: { label: "City", required: false, description: "City or town name" },
  municipality: { label: "Municipality", required: false, description: "Municipality (Dimos)" },
  bedrooms: { label: "Bedrooms", required: false, description: "Number of bedrooms" },
  bathrooms: { label: "Bathrooms", required: false, description: "Number of bathrooms" },
  size_net_sqm: { label: "Net Size (sqm)", required: false, description: "Net area in square meters" },
  visibility: { label: "Visibility", required: false, description: "HIDDEN, PRIVATE, SECURE, or PUBLIC" },
  // Client
  client_name: { label: "Client Name", required: true, description: "Full name of the client" },
  primary_email: { label: "Email", required: false, description: "Primary email address" },
  primary_phone: { label: "Phone", required: false, description: "Primary phone number" },
  client_type: { label: "Client Type", required: false, description: "BUYER, SELLER, RENTER, INVESTOR, REFERRAL_PARTNER" },
  // Mandate
  title: { label: "Mandate Title", required: true, description: "Title or description of the mandate" },
  budget_min: { label: "Budget Min (EUR)", required: false, description: "Minimum budget in Euros" },
  budget_max: { label: "Budget Max (EUR)", required: false, description: "Maximum budget in Euros" },
  urgency: { label: "Urgency", required: false, description: "LOW, MEDIUM, HIGH, CRITICAL" },
  timeline: { label: "Timeline", required: false, description: "IMMEDIATE, ONE_THREE_MONTHS, THREE_SIX_MONTHS, SIX_PLUS_MONTHS" },
};

// ---------------------------------------------------------------------------
// Helpers extracted to reduce cognitive complexity of parseFile
// ---------------------------------------------------------------------------

function setMultiSheetState(
  result: NonNullable<Awaited<ReturnType<typeof parseXlsxBuffer>>>,
  file: File,
  setSheets: (s: SheetSummary[]) => void,
  setSelectedSheets: (s: Set<string>) => void,
  setPendingFile: (f: File) => void
): boolean {
  if (!result.sheets || result.sheets.length <= 1) return false;
  const defaultSelected = new Set(
    result.sheets.filter((s) => s.rowCount > 0).map((s) => s.name)
  );
  setSheets(result.sheets);
  setSelectedSheets(defaultSelected);
  setPendingFile(file);
  return true;
}

async function checkDedup(fileHash: string): Promise<DedupInfo | null> {
  const res = await fetch("/api/import/dedupe-check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileHash }),
  });
  if (!res.ok) return null;
  const dedup = await res.json();
  if (dedup.duplicate === true && dedup.previousImport) {
    return dedup.previousImport as DedupInfo;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function UploadStep({
  dict,
  errorsDict,
  onFileUpload,
  onFileHash,
  currentFile,
  entityType,
  unifiedMode,
}: UploadStepProps) {
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Multi-sheet picker state
  const [sheets, setSheets] = useState<SheetSummary[] | null>(null);
  const [selectedSheets, setSelectedSheets] = useState<Set<string>>(new Set());
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  // Dedup warning state
  const [dedupInfo, setDedupInfo] = useState<DedupInfo | null>(null);
  const [dedupDismissed, setDedupDismissed] = useState(false);

  const parseXmlFile = useCallback(
    async (file: File): Promise<{ headers: string[]; data: Record<string, unknown>[] } | null> => {
      const text = await file.text();
      const parser = new XMLParser({
        ignoreAttributes: true,
        parseTagValue: false,
        trimValues: true,
      });

      const parsed = parser.parse(text);

      const rootKey = Object.keys(parsed).find(
        (key) => key !== "?xml" && typeof parsed[key] === "object"
      );
      if (!rootKey) return null;

      const rootElement = parsed[rootKey];
      let dataArray: Record<string, unknown>[];

      if (Array.isArray(rootElement)) {
        dataArray = rootElement;
      } else if (typeof rootElement === "object") {
        const childKey = Object.keys(rootElement).find((key) => {
          const child = rootElement[key];
          return Array.isArray(child) || typeof child === "object";
        });
        if (!childKey) return null;
        const childData = rootElement[childKey];
        dataArray = Array.isArray(childData) ? childData : [childData];
      } else {
        return null;
      }

      if (dataArray.length === 0) return null;

      // Extract all unique headers from all records
      const headersSet = new Set<string>();
      dataArray.forEach((item) => {
        if (typeof item === "object" && item !== null) {
          Object.keys(item).forEach((key) => headersSet.add(key));
        }
      });

      const headers = Array.from(headersSet);

      const normalizedData = dataArray.map((item) => {
        const normalized: Record<string, unknown> = {};
        headers.forEach((key) => {
          normalized[key] =
            item && typeof item === "object" && key in item
              ? (item as Record<string, unknown>)[key]
              : "";
        });
        return normalized;
      });

      return { headers, data: normalizedData };
    },
    []
  );

  /** Called when user confirms sheet selection in the multi-sheet picker */
  const handleSheetContinue = useCallback(() => {
    if (!sheets || !pendingFile) return;

    const selected = sheets.filter((s) => selectedSheets.has(s.name));
    if (selected.length === 0) return;

    const { headers, data } = mergeSheets(selected);

    if (data.length === 0) {
      setError(errorsDict.noData);
      setSheets(null);
      setPendingFile(null);
      return;
    }

    setSheets(null);
    setPendingFile(null);
    onFileUpload(pendingFile, headers, data);
  }, [sheets, pendingFile, selectedSheets, errorsDict, onFileUpload]);

  const parseFile = useCallback(
    async (file: File) => {
      setIsProcessing(true);
      setError(null);
      setDedupInfo(null);
      setDedupDismissed(false);
      setSheets(null);
      setPendingFile(null);

      try {
        // Feature 2: SHA-256 hash
        const fileHash = await computeFileHash(file);
        onFileHash?.(fileHash);

        // Feature 3: Dedup check (non-blocking — failure must not block import)
        try {
          const info = await checkDedup(fileHash);
          if (info) setDedupInfo(info);
        } catch {
          console.warn("[UploadStep] Dedup check failed, continuing");
        }

        await parseAndUpload(file);
      } catch (err) {
        console.error("File parse error:", err);
        setError(errorsDict.parseError);
      } finally {
        setIsProcessing(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onFileUpload, onFileHash, errorsDict, parseXmlFile]
  );

  /** Parses the file by type and calls onFileUpload or shows multi-sheet picker. */
  const parseAndUpload = useCallback(
    async (file: File) => {
      const lower = file.name.toLowerCase();
      const isXml = lower.endsWith(".xml");
      const isCsv = lower.endsWith(".csv");

      if (isXml) {
        const result = await parseXmlFile(file);
        if (!result || result.data.length === 0) {
          setError(errorsDict.noData);
          return;
        }
        onFileUpload(file, result.headers, result.data);
        return;
      }

      if (isCsv) {
        const text = await file.text();
        const result = parseCsvText(text);
        if (result.data.length === 0) {
          setError(errorsDict.noData);
          return;
        }
        onFileUpload(file, result.headers, result.data);
        return;
      }

      // XLSX
      const buffer = await file.arrayBuffer();
      const result = await parseXlsxBuffer(buffer);

      // Feature 1: Multi-sheet detection
      const showingPicker = setMultiSheetState(
        result,
        file,
        setSheets,
        setSelectedSheets,
        setPendingFile
      );
      if (showingPicker) {
        setIsProcessing(false);
        return;
      }

      if (result.data.length === 0) {
        setError(errorsDict.noData);
        return;
      }

      onFileUpload(file, result.headers, result.data);
    },
    [onFileUpload, errorsDict, parseXmlFile]
  );

  const onDrop = useCallback(
    (
      acceptedFiles: File[],
      fileRejections: { file: File; errors: readonly { code: string; message: string }[] }[]
    ) => {
      if (fileRejections.length > 0) {
        const firstError = fileRejections[0].errors[0];
        if (firstError.code === "file-too-large") {
          setError(errorsDict.fileTooLarge);
        } else if (firstError.code === "file-invalid-type") {
          setError(errorsDict.invalidFileType);
        }
        return;
      }

      if (acceptedFiles.length > 0) {
        parseFile(acceptedFiles[0]);
      }
    },
    [parseFile, errorsDict]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    maxSize: MAX_FILE_SIZE,
    multiple: false,
  });

  const handleRemoveFile = useCallback(() => {
    onFileUpload(null as unknown as File, [], []);
    setError(null);
    setSheets(null);
    setPendingFile(null);
    setDedupInfo(null);
    setDedupDismissed(false);
  }, [onFileUpload]);

  const templateHeaders = useMemo(() => {
    if (unifiedMode) return UNIFIED_TEMPLATE_HEADERS;
    switch (entityType) {
      case "client":
        return clientImportFieldDefinitions.map((f) => f.key);
      case "mandate":
        return mandateImportFieldDefinitions.map((f) => f.key);
      case "property":
      default:
        return propertyImportFieldDefinitions.map((f) => f.key);
    }
  }, [entityType, unifiedMode]);

  const templateFilename = unifiedMode
    ? "unified_import_template.xlsx"
    : `${entityType}_import_template.xlsx`;

  const handleDownloadTemplate = useCallback(async () => {
    const workbook = new Workbook();

    // Feature 4: Instructions sheet
    const instructionsSheet = workbook.addWorksheet("Instructions");
    instructionsSheet.columns = [
      { header: "Field Name", key: "field", width: 28 },
      { header: "Required", key: "required", width: 12 },
      { header: "Description", key: "description", width: 55 },
      { header: "Allowed Values", key: "values", width: 60 },
    ];
    const instrHeaderRow = instructionsSheet.getRow(1);
    instrHeaderRow.font = { bold: true };
    instrHeaderRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE2E8F0" },
    };
    for (const header of templateHeaders) {
      const info = FIELD_DESCRIPTIONS[header];
      const enumValues = ENUM_FIELD_OPTIONS[header];
      instructionsSheet.addRow({
        field: header,
        required: info?.required ? "Yes" : "No",
        description: info?.description ?? info?.label ?? header,
        values: enumValues ? enumValues.join(", ") : "Free text",
      });
    }

    // Main template sheet
    const worksheet = workbook.addWorksheet("Template");
    worksheet.addRow(templateHeaders);
    const tmplHeaderRow = worksheet.getRow(1);
    tmplHeaderRow.font = { bold: true };
    tmplHeaderRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFDBEAFE" },
    };

    // Feature 4: Data validation dropdowns for enum fields
    templateHeaders.forEach((header, colIndex) => {
      const enumValues = ENUM_FIELD_OPTIONS[header];
      if (!enumValues || enumValues.length === 0) return;

      const col = worksheet.getColumn(colIndex + 1);
      const range = `${col.letter}2:${col.letter}1000`;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- ExcelJS 4.4 removed the type but the API still works
      (worksheet as any).dataValidations.add(range, {
        type: "list",
        formulae: [`"${enumValues.join(",")}"`],
        showErrorMessage: true,
        errorTitle: "Invalid Value",
        error: `Please select one of: ${enumValues.join(", ")}`,
        showInputMessage: true,
        promptTitle: header,
        prompt: `Valid options: ${enumValues.slice(0, 5).join(", ")}${enumValues.length > 5 ? "…" : ""}`,
      });
    });

    worksheet.views = [{ state: "frozen", ySplit: 1 }];

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = templateFilename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, [templateHeaders, templateFilename]);

  // ------------------------------------------------------------------
  // Render: Multi-sheet picker (replaces normal UI while active)
  // ------------------------------------------------------------------
  if (sheets !== null) {
    return (
      <div className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" aria-hidden="true" />
          <AlertDescription>
            This file contains {sheets.length} sheets. Select the sheets you want to import.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          {sheets.map((sheet) => {
            const isEmpty = sheet.rowCount === 0;
            const isChecked = selectedSheets.has(sheet.name);
            const cardClass = isChecked && !isEmpty
              ? "transition-colors border-primary/50 bg-primary/5"
              : "transition-colors";

            return (
              <Card key={sheet.name} className={cardClass}>
                <CardContent className="flex items-start gap-3 py-4 px-4">
                  <Checkbox
                    id={`sheet-${sheet.name}`}
                    checked={isChecked}
                    disabled={isEmpty}
                    onCheckedChange={(checked) => {
                      setSelectedSheets((prev) => {
                        const next = new Set(prev);
                        if (checked) {
                          next.add(sheet.name);
                        } else {
                          next.delete(sheet.name);
                        }
                        return next;
                      });
                    }}
                    aria-describedby={`sheet-${sheet.name}-info`}
                  />
                  <div className="flex-1 min-w-0">
                    <Label
                      htmlFor={`sheet-${sheet.name}`}
                      className={`font-medium cursor-pointer ${isEmpty ? "text-muted-foreground" : ""}`}
                    >
                      {sheet.name}
                      {isEmpty && (
                        <span className="ml-2 text-xs text-muted-foreground font-normal">(empty)</span>
                      )}
                    </Label>
                    <p
                      id={`sheet-${sheet.name}-info`}
                      className="text-xs text-muted-foreground mt-0.5"
                    >
                      {sheet.rowCount === 1 ? "1 row" : `${sheet.rowCount} rows`}
                    </p>
                    {sheet.sampleHeaders.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {sheet.sampleHeaders.map((h) => (
                          <Badge key={h} variant="secondary" className="text-xs font-normal">
                            {h}
                          </Badge>
                        ))}
                        {sheet.headers.length > 3 && (
                          <Badge variant="outline" className="text-xs font-normal">
                            +{sheet.headers.length - 3} more
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSheets(null);
              setPendingFile(null);
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleSheetContinue} disabled={selectedSheets.size === 0}>
            {selectedSheets.size === 1
              ? "Continue with 1 sheet"
              : `Continue with ${selectedSheets.size} sheets`}
          </Button>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // Normal upload UI
  // ------------------------------------------------------------------
  const dropzoneClass = isDragActive
    ? "cursor-pointer transition-colors border-2 border-dashed border-primary bg-primary/5"
    : currentFile
    ? "cursor-pointer transition-colors border-2 border-dashed border-success/50 bg-success/10"
    : "cursor-pointer transition-colors border-2 border-dashed border-muted-foreground/25 hover:border-primary/50";

  const dedupDateLabel = dedupInfo
    ? new Date(dedupInfo.date).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  const dedupRecordLabel = dedupInfo
    ? dedupInfo.createdCount === 1
      ? "1 record was created"
      : `${dedupInfo.createdCount} records were created`
    : "";

  return (
    <div className="space-y-6">
      {/* Feature 5: Import limits info card */}
      <Alert>
        <Info className="h-4 w-4" aria-hidden="true" />
        <AlertDescription className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <span>Supported formats: CSV, XLSX, XML</span>
          <span aria-hidden="true">·</span>
          <span>Maximum file size: 10 MB</span>
          <span aria-hidden="true">·</span>
          <span>Maximum rows: {MAX_ROWS.toLocaleString()}</span>
        </AlertDescription>
      </Alert>

      {/* Feature 3: Dedup warning banner */}
      {dedupInfo && !dedupDismissed && (
        <Alert className="border-warning bg-warning/10 text-warning-foreground [&>svg]:text-warning">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <AlertDescription className="flex flex-col gap-2">
            <span>
              This file was previously imported on {dedupDateLabel}. {dedupRecordLabel}.
              Proceeding may create duplicates.
            </span>
            <div className="flex items-center gap-3">
              <Link
                href={`/app/import/${dedupInfo.id}` as Parameters<typeof Link>[0]["href"]}
                className="inline-flex items-center gap-1 text-sm underline underline-offset-4 hover:no-underline"
              >
                View previous import
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </Link>
              <Button
                variant="ghost"
                size="sm"
                className="h-auto py-0.5 px-2 text-sm"
                onClick={() => setDedupDismissed(true)}
              >
                Dismiss
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Dropzone */}
      <Card {...getRootProps()} className={dropzoneClass}>
        <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
          <input {...getInputProps()} />

          {isProcessing && (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4" aria-hidden="true" />
              <p className="text-muted-foreground">Processing file...</p>
            </>
          )}
          {!isProcessing && currentFile && (
            <>
              <FileText className="h-12 w-12 text-success mb-4" aria-hidden="true" />
              <p className="font-medium text-lg">{currentFile.name}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {(currentFile.size / 1024).toFixed(1)} KB
              </p>
            </>
          )}
          {!isProcessing && !currentFile && (
            <>
              <Upload className="h-12 w-12 text-muted-foreground mb-4" aria-hidden="true" />
              <p className="font-medium text-lg">{dict.dropzone}</p>
              <p className="text-sm text-muted-foreground mt-2">{dict.supportedFormats}</p>
              <p className="text-xs text-muted-foreground mt-1">{dict.maxSize}</p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* File Actions */}
      {currentFile && (
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            <div>
              <p className="font-medium text-sm">{dict.selectedFile}</p>
              <p className="text-xs text-muted-foreground">{currentFile.name}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleRemoveFile();
            }}
            className="text-destructive hover:text-destructive"
          >
            <X className="h-4 w-4 mr-1" aria-hidden="true" />
            {dict.removeFile}
          </Button>
        </div>
      )}

      {/* Download Template */}
      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div>
          <p className="font-medium text-sm">{dict.downloadTemplate}</p>
          <p className="text-xs text-muted-foreground">{dict.templateDescription}</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
          <Download className="h-4 w-4 mr-2" aria-hidden="true" />
          {dict.downloadTemplate}
        </Button>
      </div>
    </div>
  );
}
