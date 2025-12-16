"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "motion/react";
import { 
  Upload, 
  ArrowRight, 
  ArrowLeft, 
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RotateCcw
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

import { ConversionUploadStep } from "./ConversionUploadStep";
import { ConversionMappingStep } from "./ConversionMappingStep";
import { ConversionTransformStep } from "./ConversionTransformStep";
import { ConversionPreviewStep } from "./ConversionPreviewStep";
import { ConversionExportStep } from "./ConversionExportStep";

import type { 
  PropertyImportFieldKey 
} from "@/lib/import/property-import-schema";
import type { 
  ClientImportFieldKey 
} from "@/lib/import/client-import-schema";

export type EntityType = "properties" | "clients";
export type FieldKey = PropertyImportFieldKey | ClientImportFieldKey;

export interface ColumnMapping {
  sourceColumn: string;
  targetField: FieldKey | "";
  sampleValue: string;
  isAutoMapped: boolean;
}

export interface ValueTransformation {
  field: FieldKey;
  rules: Array<{
    sourceValue: string;
    targetValue: string;
  }>;
}

export interface ConversionState {
  // File data
  fileName: string;
  headers: string[];
  rawData: Record<string, unknown>[];
  
  // Mappings
  columnMappings: ColumnMapping[];
  
  // Transformations
  valueTransformations: ValueTransformation[];
  
  // Converted data
  convertedData: Record<string, unknown>[];
  validRows: number;
  invalidRows: number;
  issues: Array<{ row: number; field: string; message: string }>;
}

interface ConversionWizardProps {
  entityType: EntityType;
  onComplete?: (data: Record<string, unknown>[]) => void;
  onCancel?: () => void;
}

const STEPS = ["upload", "mapping", "transform", "preview", "export"] as const;
type Step = typeof STEPS[number];

export function ConversionWizard({ 
  entityType, 
  onComplete, 
  onCancel 
}: ConversionWizardProps) {
  const t = useTranslations("conversion");
  
  const [currentStep, setCurrentStep] = useState<Step>("upload");
  const [state, setState] = useState<ConversionState>({
    fileName: "",
    headers: [],
    rawData: [],
    columnMappings: [],
    valueTransformations: [],
    convertedData: [],
    validRows: 0,
    invalidRows: 0,
    issues: [],
  });

  const currentStepIndex = STEPS.indexOf(currentStep);
  const progress = ((currentStepIndex + 1) / STEPS.length) * 100;

  const handleFileUpload = useCallback((
    fileName: string,
    headers: string[],
    data: Record<string, unknown>[]
  ) => {
    // Create initial column mappings with sample values
    const mappings: ColumnMapping[] = headers.map(header => ({
      sourceColumn: header,
      targetField: "",
      sampleValue: data[0]?.[header]?.toString() || "",
      isAutoMapped: false,
    }));

    setState(prev => ({
      ...prev,
      fileName,
      headers,
      rawData: data,
      columnMappings: mappings,
    }));
  }, []);

  const handleMappingsChange = useCallback((mappings: ColumnMapping[]) => {
    setState(prev => ({
      ...prev,
      columnMappings: mappings,
    }));
  }, []);

  const handleTransformationsChange = useCallback((transformations: ValueTransformation[]) => {
    setState(prev => ({
      ...prev,
      valueTransformations: transformations,
    }));
  }, []);

  const handleConvert = useCallback(() => {
    const { rawData, columnMappings, valueTransformations } = state;
    const converted: Record<string, unknown>[] = [];
    const issues: Array<{ row: number; field: string; message: string }> = [];

    rawData.forEach((row, rowIndex) => {
      const convertedRow: Record<string, unknown> = {};
      
      columnMappings.forEach(mapping => {
        if (!mapping.targetField) return;
        
        let value = row[mapping.sourceColumn];
        
        // Apply transformations
        const transformation = valueTransformations.find(
          t => t.field === mapping.targetField
        );
        
        if (transformation && value !== undefined && value !== null) {
          const rule = transformation.rules.find(
            r => r.sourceValue.toLowerCase() === String(value).toLowerCase()
          );
          if (rule) {
            value = rule.targetValue;
          }
        }
        
        convertedRow[mapping.targetField] = value;
      });
      
      converted.push(convertedRow);
    });

    setState(prev => ({
      ...prev,
      convertedData: converted,
      validRows: converted.length - issues.length,
      invalidRows: issues.length,
      issues,
    }));
  }, [state]);

  const handleNext = useCallback(() => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      // Run conversion when moving to preview
      if (STEPS[nextIndex] === "preview") {
        handleConvert();
      }
      setCurrentStep(STEPS[nextIndex]);
    }
  }, [currentStepIndex, handleConvert]);

  const handleBack = useCallback(() => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex]);
    }
  }, [currentStepIndex]);

  const handleReset = useCallback(() => {
    setState({
      fileName: "",
      headers: [],
      rawData: [],
      columnMappings: [],
      valueTransformations: [],
      convertedData: [],
      validRows: 0,
      invalidRows: 0,
      issues: [],
    });
    setCurrentStep("upload");
  }, []);

  const canProceed = useCallback(() => {
    switch (currentStep) {
      case "upload":
        return state.rawData.length > 0;
      case "mapping":
        return state.columnMappings.some(m => m.targetField !== "");
      case "transform":
        return true; // Transformations are optional
      case "preview":
        return state.convertedData.length > 0;
      case "export":
        return true;
      default:
        return false;
    }
  }, [currentStep, state]);

  const renderStep = () => {
    switch (currentStep) {
      case "upload":
        return (
          <ConversionUploadStep
            entityType={entityType}
            onFileUpload={handleFileUpload}
            fileName={state.fileName}
            headers={state.headers}
            sampleData={state.rawData.slice(0, 3)}
          />
        );
      case "mapping":
        return (
          <ConversionMappingStep
            entityType={entityType}
            mappings={state.columnMappings}
            onMappingsChange={handleMappingsChange}
            sampleData={state.rawData.slice(0, 5)}
          />
        );
      case "transform":
        return (
          <ConversionTransformStep
            entityType={entityType}
            mappings={state.columnMappings}
            transformations={state.valueTransformations}
            onTransformationsChange={handleTransformationsChange}
            rawData={state.rawData}
          />
        );
      case "preview":
        return (
          <ConversionPreviewStep
            convertedData={state.convertedData}
            validRows={state.validRows}
            invalidRows={state.invalidRows}
            issues={state.issues}
            columnMappings={state.columnMappings}
          />
        );
      case "export":
        return (
          <ConversionExportStep
            entityType={entityType}
            convertedData={state.convertedData}
            fileName={state.fileName}
            onComplete={onComplete}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          {t("title")}
        </h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          {STEPS.map((step, index) => (
            <div
              key={step}
              className={`flex items-center gap-1 ${
                index <= currentStepIndex 
                  ? "text-primary font-medium" 
                  : "text-muted-foreground"
              }`}
            >
              {index < currentStepIndex ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : index === currentStepIndex ? (
                <div className="h-4 w-4 rounded-full bg-primary flex items-center justify-center text-[10px] text-primary-foreground">
                  {index + 1}
                </div>
              ) : (
                <div className="h-4 w-4 rounded-full border border-muted-foreground flex items-center justify-center text-[10px]">
                  {index + 1}
                </div>
              )}
              <span className="hidden sm:inline">{t(`steps.${step}`)}</span>
            </div>
          ))}
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {renderStep()}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t">
        <div className="flex gap-2">
          {currentStep !== "upload" && (
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("buttons.back")}
            </Button>
          )}
          <Button variant="ghost" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            {t("buttons.reset")}
          </Button>
        </div>
        
        <div className="flex gap-2">
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              {t("buttons.cancel")}
            </Button>
          )}
          
          {currentStep !== "export" && (
            <Button onClick={handleNext} disabled={!canProceed()}>
              {t("buttons.next")}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}


