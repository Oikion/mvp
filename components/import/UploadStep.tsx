"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import ExcelJS from "exceljs";
import { XMLParser } from "fast-xml-parser";
import { Upload, FileText, X, Download, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface UploadStepProps {
  dict: {
    dropzone: string;
    supportedFormats: string;
    maxSize: string;
    selectedFile: string;
    removeFile: string;
    downloadTemplate: string;
    templateDescription: string;
  };
  errorsDict: {
    fileRequired: string;
    invalidFileType: string;
    fileTooLarge: string;
    parseError: string;
    noData: string;
  };
  onFileUpload: (
    file: File,
    headers: string[],
    data: Record<string, unknown>[]
  ) => void;
  currentFile: File | null;
  entityType: "client" | "property" | "mandate";
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_FILE_TYPES = {
  "text/csv": [".csv"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "text/xml": [".xml"],
  "application/xml": [".xml"],
};

/**
 * Extract a primitive value from an ExcelJS CellValue.
 * Cells can contain formula objects, rich text, hyperlinks, etc.
 */
function getCellPrimitive(cell: ExcelJS.Cell): unknown {
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
  return String(v);
}

/**
 * Parse an XLSX buffer into headers + JSON rows using ExcelJS
 */
async function parseXlsxBuffer(
  buffer: ArrayBuffer
): Promise<{ headers: string[]; data: Record<string, unknown>[] }> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet || worksheet.rowCount === 0) {
    return { headers: [], data: [] };
  }

  // First row is headers
  const headerRow = worksheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    headers[colNumber - 1] = String(getCellPrimitive(cell) ?? "");
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
    } else {
      if (ch === '"') {
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
  }

  // Last field/row
  if (field || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

export function UploadStep({
  dict,
  errorsDict,
  onFileUpload,
  currentFile,
  entityType,
}: UploadStepProps) {
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const parseXmlFile = useCallback(
    async (file: File): Promise<{ headers: string[]; data: Record<string, unknown>[] } | null> => {
      const text = await file.text();
      const parser = new XMLParser({
        ignoreAttributes: true,
        // Keep all values as strings (like CSV) - Zod will coerce as needed
        parseTagValue: false,
        trimValues: true,
      });

      const parsed = parser.parse(text);

      // Find the root element containing the array of items
      const rootKey = Object.keys(parsed).find(
        (key) => key !== "?xml" && typeof parsed[key] === "object"
      );

      if (!rootKey) {
        return null;
      }

      const rootElement = parsed[rootKey];

      // Find the child array (e.g., "property" or "client")
      let dataArray: Record<string, unknown>[];

      if (Array.isArray(rootElement)) {
        dataArray = rootElement;
      } else if (typeof rootElement === "object") {
        const childKey = Object.keys(rootElement).find((key) => {
          const child = rootElement[key];
          return Array.isArray(child) || typeof child === "object";
        });

        if (!childKey) {
          return null;
        }

        const childData = rootElement[childKey];
        dataArray = Array.isArray(childData) ? childData : [childData];
      } else {
        return null;
      }

      if (dataArray.length === 0) {
        return null;
      }

      // Extract all unique headers from all records
      const headersSet = new Set<string>();
      dataArray.forEach((item) => {
        if (typeof item === "object" && item !== null) {
          Object.keys(item).forEach((key) => headersSet.add(key));
        }
      });

      const headers = Array.from(headersSet);

      // Normalize data
      const normalizedData = dataArray.map((item) => {
        const normalized: Record<string, unknown> = {};
        headers.forEach((key) => {
          normalized[key] = item && typeof item === "object" && key in item
            ? (item as Record<string, unknown>)[key]
            : "";
        });
        return normalized;
      });

      return { headers, data: normalizedData };
    },
    []
  );

  const parseFile = useCallback(
    async (file: File) => {
      setIsProcessing(true);
      setError(null);

      try {
        const isXml = file.name.toLowerCase().endsWith(".xml");

        const ext = file.name.toLowerCase().split(".").pop();

        if (isXml) {
          const result = await parseXmlFile(file);

          if (!result || result.data.length === 0) {
            setError(errorsDict.noData);
            setIsProcessing(false);
            return;
          }

          onFileUpload(file, result.headers, result.data);
        } else if (ext === "csv") {
          // Parse CSV as text
          const text = await file.text();
          const result = parseCsvText(text);

          if (result.data.length === 0) {
            setError(errorsDict.noData);
            setIsProcessing(false);
            return;
          }

          onFileUpload(file, result.headers, result.data);
        } else {
          // Parse XLSX with ExcelJS
          const buffer = await file.arrayBuffer();
          const result = await parseXlsxBuffer(buffer);

          if (result.data.length === 0) {
            setError(errorsDict.noData);
            setIsProcessing(false);
            return;
          }

          onFileUpload(file, result.headers, result.data);
        }
      } catch (err) {
        console.error("File parse error:", err);
        setError(errorsDict.parseError);
      } finally {
        setIsProcessing(false);
      }
    },
    [onFileUpload, errorsDict, parseXmlFile]
  );

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: { file: File; errors: readonly { code: string; message: string }[] }[]) => {
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
  }, [onFileUpload]);

  const handleDownloadTemplate = useCallback(async () => {
    const templateHeaders =
      entityType === "client"
        ? [
            "client_name",
            "primary_email",
            "primary_phone",
            "client_type",
            "client_status",
            "billing_street",
            "billing_city",
            "billing_country",
            "description",
          ]
        : [
            "property_name",
            "property_type",
            "property_status",
            "transaction_type",
            "address_street",
            "address_city",
            "price",
            "bedrooms",
            "bathrooms",
            "description",
          ];

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Template");
    worksheet.addRow(templateHeaders);

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${entityType}_import_template.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [entityType]);

  return (
    <div className="space-y-6">
      {/* Dropzone */}
      <Card
        {...getRootProps()}
        className={`cursor-pointer transition-colors border-2 border-dashed ${
          isDragActive
            ? "border-primary bg-primary/5"
            : currentFile
            ? "border-success/50 bg-success/10"
            : "border-muted-foreground/25 hover:border-primary/50"
        }`}
      >
        <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
          <input {...getInputProps()} />

          {isProcessing ? (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4" />
              <p className="text-muted-foreground">Processing file...</p>
            </>
          ) : currentFile ? (
            <>
              <FileText className="h-12 w-12 text-success mb-4" />
              <p className="font-medium text-lg">{currentFile.name}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {(currentFile.size / 1024).toFixed(1)} KB
              </p>
            </>
          ) : (
            <>
              <Upload className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="font-medium text-lg">{dict.dropzone}</p>
              <p className="text-sm text-muted-foreground mt-2">
                {dict.supportedFormats}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{dict.maxSize}</p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* File Actions */}
      {currentFile && (
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-muted-foreground" />
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
            <X className="h-4 w-4 mr-1" />
            {dict.removeFile}
          </Button>
        </div>
      )}

      {/* Download Template */}
      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div>
          <p className="font-medium text-sm">{dict.downloadTemplate}</p>
          <p className="text-xs text-muted-foreground">
            {dict.templateDescription}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
          <Download className="h-4 w-4 mr-2" />
          {dict.downloadTemplate}
        </Button>
      </div>
    </div>
  );
}
