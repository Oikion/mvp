"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import * as XLSX from "xlsx";
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
  entityType: "client" | "property";
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_FILE_TYPES = {
  "text/csv": [".csv"],
  "application/vnd.ms-excel": [".xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "text/xml": [".xml"],
  "application/xml": [".xml"],
};

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
      // Expected formats: <properties><property>...</property></properties>
      // or <clients><client>...</client></clients>
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
        // Root element is already an array
        dataArray = rootElement;
      } else if (typeof rootElement === "object") {
        // Look for a child key that contains an array or single object
        const childKey = Object.keys(rootElement).find((key) => {
          const child = rootElement[key];
          return Array.isArray(child) || typeof child === "object";
        });
        
        if (!childKey) {
          return null;
        }
        
        const childData = rootElement[childKey];
        // Normalize to array (single item becomes array of one)
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
      
      // Normalize data - ensure all records have all keys with empty string defaults
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
        
        if (isXml) {
          // Parse XML file
          const result = await parseXmlFile(file);
          
          if (!result || result.data.length === 0) {
            setError(errorsDict.noData);
            setIsProcessing(false);
            return;
          }
          
          onFileUpload(file, result.headers, result.data);
        } else {
          // Parse CSV/Excel file
          const buffer = await file.arrayBuffer();
          // Use codepage 65001 (UTF-8) for proper Greek/international character support
          const workbook = XLSX.read(buffer, { 
            type: "array",
            codepage: 65001, // UTF-8
          });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          // Parse to JSON with headers
          const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
            defval: "",
          });

          if (jsonData.length === 0) {
            setError(errorsDict.noData);
            setIsProcessing(false);
            return;
          }

          // Extract headers from first row keys
          const headers = Object.keys(jsonData[0]);

          onFileUpload(file, headers, jsonData);
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
    // Reset by calling with empty data
    onFileUpload(null as unknown as File, [], []);
    setError(null);
  }, [onFileUpload]);

  const handleDownloadTemplate = useCallback(() => {
    // Create a template based on entity type
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

    const worksheet = XLSX.utils.aoa_to_sheet([templateHeaders]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
    
    const fileName = `${entityType}_import_template.xlsx`;
    XLSX.writeFile(workbook, fileName);
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
            ? "border-green-500/50 bg-green-500/10"
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
              <FileText className="h-12 w-12 text-green-500 mb-4" />
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


