"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { useDropzone } from "react-dropzone";
import * as XLSX from "xlsx";
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
  "application/vnd.ms-excel": [".xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "text/xml": [".xml"],
  "application/xml": [".xml"],
};

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

        if (isXml) {
          const result = await parseXmlFile(file);
          if (!result || result.data.length === 0) {
            setError(t("errors.emptyFile"));
            return;
          }
          onFileUpload(file.name, result.headers, result.data);
        } else {
          // CSV/Excel parsing with xlsx
          const buffer = await file.arrayBuffer();
          // Use codepage 65001 (UTF-8) for proper Greek/international character support
          const workbook = XLSX.read(buffer, { 
            type: "array",
            codepage: 65001, // UTF-8
          });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, {
            defval: "",
          });

          if (jsonData.length === 0) {
            setError(t("errors.emptyFile"));
            return;
          }

          const extractedHeaders = Object.keys(jsonData[0]);
          onFileUpload(file.name, extractedHeaders, jsonData);
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
              ${isUploaded ? "border-green-500/50 bg-green-500/10" : ""}
              ${isProcessing ? "opacity-50 pointer-events-none" : ""}
            `}
          >
            <input {...getInputProps()} />
            
            {isUploaded ? (
              <div className="space-y-2">
                <CheckCircle2 className="h-12 w-12 mx-auto text-green-500" />
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








