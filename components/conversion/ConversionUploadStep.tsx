"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { useDropzone } from "react-dropzone";
import ExcelJS from "exceljs";
import { XMLParser } from "fast-xml-parser";
import {
  Upload,
  FileSpreadsheet,
  FileCode2,
  CheckCircle2,
  Table
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table as UITable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { EntityType } from "./ConversionWizard";

interface ConversionUploadStepProps {
  entityType: EntityType;
  onFileUpload: (fileName: string, headers: string[], data: Record<string, unknown>[]) => void;
  fileName: string;
  headers: string[];
  sampleData: Record<string, unknown>[];
}

const ACCEPTED_FILE_TYPES = {
  "text/csv": [".csv"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "text/xml": [".xml"],
  "application/xml": [".xml"],
};

/**
 * Extract a primitive value from an ExcelJS CellValue.
 */
function getCellPrimitive(cell: ExcelJS.Cell): unknown {
  const v = cell.value;
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v;
  if (typeof v !== "object") return v;
  if ("result" in v) return (v as { result: unknown }).result ?? "";
  if ("richText" in v) return (v as { richText: { text: string }[] }).richText.map(r => r.text).join("");
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

  const headerRow = worksheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    headers[colNumber - 1] = String(getCellPrimitive(cell) ?? "");
  });

  const data: Record<string, unknown>[] = [];
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
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
 */
function parseCsvText(text: string): { headers: string[]; data: Record<string, unknown>[] } {
  const content = text.replace(/^\ufeff/, "");
  const rows = parseCsvRows(content);

  if (rows.length === 0) return { headers: [], data: [] };

  const headers = rows[0];
  const data: Record<string, unknown>[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.every(cell => cell === "")) continue;
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

  if (field || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

export function ConversionUploadStep({
  entityType,
  onFileUpload,
  fileName,
  headers,
  sampleData,
}: ConversionUploadStepProps) {
  const t = useTranslations("conversion");
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const parseXmlFile = useCallback(
    async (file: File): Promise<{ headers: string[]; data: Record<string, unknown>[] } | null> => {
      const text = await file.text();
      const parser = new XMLParser({
        ignoreAttributes: true,
        parseTagValue: false, // Keep all values as strings
        trimValues: true,
      });
      const parsed = parser.parse(text);

      // Find the root array (e.g., <properties><property>...</property></properties>)
      let dataArray: Record<string, unknown>[] = [];
      const rootKeys = Object.keys(parsed);

      for (const rootKey of rootKeys) {
        const rootValue = parsed[rootKey];
        if (rootValue && typeof rootValue === "object") {
          const childKeys = Object.keys(rootValue);
          for (const childKey of childKeys) {
            const childValue = rootValue[childKey];
            if (Array.isArray(childValue)) {
              dataArray = childValue;
              break;
            } else if (typeof childValue === "object" && childValue !== null) {
              dataArray = [childValue];
              break;
            }
          }
          if (dataArray.length > 0) break;
        }
      }

      if (dataArray.length === 0) {
        return null;
      }

      // Extract headers from all items
      const headerSet = new Set<string>();
      dataArray.forEach((item) => {
        if (item && typeof item === "object") {
          Object.keys(item).forEach((key) => headerSet.add(key));
        }
      });
      const extractedHeaders = Array.from(headerSet);

      // Normalize data
      const normalizedData = dataArray.map((item) => {
        const normalized: Record<string, unknown> = {};
        extractedHeaders.forEach((header) => {
          normalized[header] = (item as Record<string, unknown>)[header] ?? "";
        });
        return normalized;
      });

      return { headers: extractedHeaders, data: normalizedData };
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
            setError(t("errors.emptyFile"));
            return;
          }
          onFileUpload(file.name, result.headers, result.data);
        } else if (ext === "csv") {
          // Parse CSV as text
          const text = await file.text();
          const result = parseCsvText(text);

          if (result.data.length === 0) {
            setError(t("errors.emptyFile"));
            return;
          }

          onFileUpload(file.name, result.headers, result.data);
        } else {
          // Parse XLSX with ExcelJS
          const buffer = await file.arrayBuffer();
          const result = await parseXlsxBuffer(buffer);

          if (result.data.length === 0) {
            setError(t("errors.emptyFile"));
            return;
          }

          onFileUpload(file.name, result.headers, result.data);
        }
      } catch (err) {
        setError(t("errors.parseError", { error: String(err) }));
      } finally {
        setIsProcessing(false);
      }
    },
    [onFileUpload, parseXmlFile, t]
  );

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: { file: File; errors: readonly { code: string; message: string }[] }[]) => {
      if (fileRejections.length > 0) {
        setError(t("errors.invalidFile"));
        return;
      }

      if (acceptedFiles.length > 0) {
        parseFile(acceptedFiles[0]);
      }
    },
    [parseFile, t]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: false,
  });

  const isUploaded = headers.length > 0;
  const fileExtension = fileName.split(".").pop()?.toUpperCase() || "";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            {t("upload.title")}
          </CardTitle>
          <CardDescription>{t("upload.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
              transition-colors duration-200
              ${isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"}
              ${isUploaded ? "border-success/50 bg-success/10" : ""}
              ${isProcessing ? "opacity-50 pointer-events-none" : ""}
            `}
          >
            <input {...getInputProps()} />

            {isUploaded ? (
              <div className="space-y-2">
                <CheckCircle2 className="h-12 w-12 mx-auto text-success" />
                <p className="font-medium">{fileName}</p>
                <div className="flex items-center justify-center gap-2">
                  <Badge variant="secondary">
                    {fileExtension === "XML" ? (
                      <FileCode2 className="h-3 w-3 mr-1" />
                    ) : (
                      <FileSpreadsheet className="h-3 w-3 mr-1" />
                    )}
                    {fileExtension}
                  </Badge>
                  <Badge variant="outline">{sampleData.length} {t("entity." + entityType)}</Badge>
                  <Badge variant="outline">{headers.length} columns</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Drop a new file to replace
                </p>
              </div>
            ) : isProcessing ? (
              <div className="space-y-2">
                <div className="h-12 w-12 mx-auto animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p className="text-muted-foreground">Processing file...</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="font-medium">
                  {isDragActive ? "Drop file here" : t("upload.dragDrop")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("upload.supportedFormats")}
                </p>
              </div>
            )}
          </div>

          {error && (
            <p className="text-destructive text-sm mt-2">{error}</p>
          )}
        </CardContent>
      </Card>

      {/* Detected Columns & Sample Data */}
      {isUploaded && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Table className="h-5 w-5" />
              {t("upload.detectedColumns")}
            </CardTitle>
            <CardDescription>
              {t("upload.sampleData")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <UITable>
                <TableHeader>
                  <TableRow>
                    {headers.map((header) => (
                      <TableHead key={header} className="whitespace-nowrap">
                        {header}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sampleData.map((row, rowIndex) => (
                    <TableRow key={rowIndex}>
                      {headers.map((header) => (
                        <TableCell key={header} className="max-w-[200px] truncate">
                          {String(row[header] ?? "")}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </UITable>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
