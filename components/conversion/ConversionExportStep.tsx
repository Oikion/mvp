"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Download, FileSpreadsheet, FileCode2, CheckCircle2, ArrowRight } from "lucide-react";
import * as XLSX from "xlsx";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import type { EntityType } from "./ConversionWizard";

interface ConversionExportStepProps {
  entityType: EntityType;
  convertedData: Record<string, unknown>[];
  fileName: string;
  onComplete?: (data: Record<string, unknown>[]) => void;
}

type ExportFormat = "csv" | "xml";

export function ConversionExportStep({
  entityType,
  convertedData,
  fileName,
  onComplete,
}: ConversionExportStepProps) {
  const t = useTranslations("conversion");
  const router = useRouter();
  
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [exportFileName, setExportFileName] = useState(
    `converted_${fileName.replace(/\.[^/.]+$/, "")}`
  );
  const [isExported, setIsExported] = useState(false);

  const generateCsv = useCallback(() => {
    const worksheet = XLSX.utils.json_to_sheet(convertedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
    
    const csvContent = XLSX.utils.sheet_to_csv(worksheet);
    return new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  }, [convertedData]);

  const generateXml = useCallback(() => {
    const rootElement = entityType === "properties" ? "properties" : "clients";
    const itemElement = entityType === "properties" ? "property" : "client";
    
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<${rootElement}>\n`;
    
    convertedData.forEach((item) => {
      xml += `  <${itemElement}>\n`;
      Object.entries(item).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          // Escape XML special characters
          const escapedValue = String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&apos;");
          xml += `    <${key}>${escapedValue}</${key}>\n`;
        }
      });
      xml += `  </${itemElement}>\n`;
    });
    
    xml += `</${rootElement}>`;
    
    return new Blob([xml], { type: "application/xml;charset=utf-8;" });
  }, [convertedData, entityType]);

  const handleDownload = useCallback(() => {
    const blob = format === "csv" ? generateCsv() : generateXml();
    const extension = format === "csv" ? ".csv" : ".xml";
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${exportFileName}${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    setIsExported(true);
  }, [format, generateCsv, generateXml, exportFileName]);

  const handleImportNow = useCallback(() => {
    // Navigate to import page with converted data
    // Store data in sessionStorage for the import wizard to pick up
    sessionStorage.setItem("oikion_converted_data", JSON.stringify(convertedData));
    
    const importPath = entityType === "properties" 
      ? "/app/mls/import" 
      : "/app/crm/import";
    
    router.push(importPath);
    
    if (onComplete) {
      onComplete(convertedData);
    }
  }, [convertedData, entityType, router, onComplete]);

  return (
    <div className="space-y-6">
      {/* Success Alert */}
      <Alert className="border-success/30 bg-success/10">
        <CheckCircle2 className="h-4 w-4 text-success" />
        <AlertTitle className="text-success dark:text-success">
          {t("export.success")}
        </AlertTitle>
        <AlertDescription className="text-success dark:text-success">
          {t("export.rowsConverted", { count: convertedData.length })}
        </AlertDescription>
      </Alert>

      {/* Export Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            {t("export.title")}
          </CardTitle>
          <CardDescription>{t("export.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File Name */}
          <div className="space-y-2">
            <Label htmlFor="fileName">{t("export.fileName")}</Label>
            <Input
              id="fileName"
              value={exportFileName}
              onChange={(e) => setExportFileName(e.target.value)}
              placeholder="converted_data"
            />
          </div>

          {/* Format Selection */}
          <div className="space-y-2">
            <Label>{t("export.format")}</Label>
            <RadioGroup
              value={format}
              onValueChange={(value) => setFormat(value as ExportFormat)}
              className="grid grid-cols-2 gap-4"
            >
              <div>
                <RadioGroupItem
                  value="csv"
                  id="format-csv"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="format-csv"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <FileSpreadsheet className="mb-3 h-6 w-6" />
                  <span className="font-medium">{t("export.csv")}</span>
                </Label>
              </div>
              <div>
                <RadioGroupItem
                  value="xml"
                  id="format-xml"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="format-xml"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <FileCode2 className="mb-3 h-6 w-6" />
                  <span className="font-medium">{t("export.xml")}</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Download Button */}
          <Button onClick={handleDownload} className="w-full" size="lg">
            <Download className="h-4 w-4 mr-2" />
            {t("export.download")}
          </Button>

          {isExported && (
            <p className="text-sm text-center text-success dark:text-success">
              ✓ File downloaded successfully
            </p>
          )}
        </CardContent>
      </Card>

      {/* Import Now Option */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5" />
            {t("export.importNow")}
          </CardTitle>
          <CardDescription>{t("export.importNowDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleImportNow} 
            variant="secondary" 
            className="w-full"
            size="lg"
          >
            {t("export.importNow")}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}








