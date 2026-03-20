"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ArrowLeft, ArrowRight, Upload, CheckCircle2 } from "lucide-react";
import { z } from "zod";

import { UploadStep } from "./UploadStep";
import { TableMappingStep } from "./TableMappingStep";
import { ValidationStep } from "./ValidationStep";
import { ReviewStep } from "./ReviewStep";
import { CompleteStep } from "./CompleteStep";
import {
  autoMatchColumns,
  matchResultsToMapping,
  type MatchResult,
  type FieldDefinitionWithAliases,
} from "@/lib/import/fuzzy-matcher";

export interface ImportWizardDict {
  title: string;
  progress: string;
  steps: {
    upload: { title: string; description: string };
    mapping: { title: string; description: string };
    validation: { title: string; description: string };
    review: { title: string; description: string };
    complete: { title: string; description: string };
  };
  upload: {
    dropzone: string;
    supportedFormats: string;
    maxSize: string;
    selectedFile: string;
    removeFile: string;
    downloadTemplate: string;
    templateDescription: string;
  };
  mapping: {
    csvColumn: string;
    targetField: string;
    preview: string;
    unmapped: string;
    required: string;
    optional: string;
    autoMapped: string;
    manuallyMapped: string;
    noMapping: string;
    selectField: string;
    sampleData: string;
  };
  validation: {
    validRows: string;
    invalidRows: string;
    totalRows: string;
    noErrors: string;
    hasErrors: string;
    errorDetails: string;
    row: string;
    field: string;
    error: string;
    value: string;
    fixHint: string;
  };
  review: {
    previewTitle: string;
    previewDescription: string;
    readyToImport: string;
    willSkip: string;
    confirmImport: string;
  };
  complete: {
    successTitle: string;
    successDescription: string;
    imported: string;
    skipped: string;
    failed: string;
    viewImported: string;
    importMore: string;
    done: string;
  };
  buttons: {
    back: string;
    next: string;
    import: string;
    cancel: string;
    close: string;
    done: string;
    retry: string;
  };
  errors: {
    fileRequired: string;
    invalidFileType: string;
    fileTooLarge: string;
    parseError: string;
    noData: string;
    importFailed: string;
    serverError: string;
    requiredFieldMissing: string;
    invalidValue: string;
  };
}

export interface FieldDefinition {
  key: string;
  required: boolean;
  group: string;
  aliases?: string[];
  description?: string;
}

export interface FieldsDict {
  groups: Record<string, string>;
  fields: Record<string, string>;
  enums?: Record<string, Record<string, string>>;
}

export interface ValidationError {
  row: number;
  field: string;
  error: string;
  value?: string;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  failed: number;
  errors?: ValidationError[];
  // Unified import fields (present when using unified engine)
  clients?: { created: number; reused: number; failed: number };
  properties?: { created: number; failed: number };
  mandates?: { created: number; failed: number };
  links?: { clientProperty: number; mandateClient: number; mandateProperty: number };
}

interface ImportWizardStepsProps {
  entityType: "client" | "property" | "mandate";
  dict: ImportWizardDict;
  fieldsDict: FieldsDict;
  schema: z.ZodSchema;
  fieldDefinitions: readonly FieldDefinition[];
  normalizeRow?: (row: Record<string, unknown>) => Record<string, unknown>;
  onImport: (data: Record<string, unknown>[], signal?: AbortSignal) => Promise<ImportResult>;
  onComplete?: () => void;
  onCancel?: () => void;
  viewUrl?: string;
  unifiedMode?: boolean;
  mandateFieldKeys?: Set<string>;
}

// Animation variants for step transitions (matching onboarding)
const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? 300 : -300,
    opacity: 0,
  }),
};

const TOTAL_STEPS = 5;

export function ImportWizardSteps({
  entityType,
  dict,
  fieldsDict,
  schema,
  fieldDefinitions,
  normalizeRow,
  onImport,
  onComplete,
  onCancel,
  viewUrl,
  unifiedMode,
  mandateFieldKeys,
}: ImportWizardStepsProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Data state
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<Record<string, unknown>[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [matchResults, setMatchResults] = useState<Map<string, MatchResult>>(new Map());
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [validData, setValidData] = useState<Record<string, unknown>[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  // Convert field definitions to the format expected by fuzzy matcher
  const fieldDefinitionsWithAliases = useMemo(() => {
    return fieldDefinitions.map((f) => ({
      ...f,
      aliases: f.aliases || [],
    })) as FieldDefinitionWithAliases[];
  }, [fieldDefinitions]);

  const progress = ((currentStep) / (TOTAL_STEPS - 1)) * 100;

  const handleNext = useCallback(() => {
    if (currentStep < TOTAL_STEPS - 1) {
      setDirection(1);
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      // Cancel any in-flight import when going back
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
        setIsImporting(false);
      }
      setDirection(-1);
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const handleFileUpload = useCallback((
    uploadedFile: File,
    headers: string[],
    data: Record<string, unknown>[]
  ) => {
    setFile(uploadedFile);
    setCsvHeaders(headers);
    setParsedData(data);
    
    // Use fuzzy matcher for intelligent auto-mapping
    const results = autoMatchColumns(headers, fieldDefinitionsWithAliases);
    setMatchResults(results);
    
    // Convert match results to field mapping
    const autoMapping = matchResultsToMapping(results);
    setFieldMapping(autoMapping);
  }, [fieldDefinitionsWithAliases]);

  const handleMappingChange = useCallback((csvColumn: string, targetField: string) => {
    setFieldMapping((prev) => ({
      ...prev,
      [csvColumn]: targetField,
    }));
  }, []);

  const validateData = useCallback(() => {
    const errors: ValidationError[] = [];
    const valid: Record<string, unknown>[] = [];

    parsedData.forEach((row, rowIndex) => {
      // Transform row based on mapping
      const mappedRow: Record<string, unknown> = {};
      Object.entries(fieldMapping).forEach(([csvCol, targetField]) => {
        if (targetField && row[csvCol] !== undefined && row[csvCol] !== "") {
          mappedRow[targetField] = row[csvCol];
        }
      });

      // Normalize enums before validation (matches server-side engine behavior)
      const normalizedRow = normalizeRow ? normalizeRow(mappedRow) : mappedRow;

      // Validate against schema
      const result = schema.safeParse(normalizedRow);
      if (result.success) {
        valid.push(result.data as Record<string, unknown>);
      } else {
        result.error.errors.forEach((err) => {
          errors.push({
            row: rowIndex + 2, // +2 for header row and 0-index
            field: err.path.join("."),
            error: err.message,
            value: String(normalizedRow[err.path[0]] ?? ""),
          });
        });
      }
    });

    setValidationErrors(errors);
    setValidData(valid);
    return { errors, valid };
  }, [parsedData, fieldMapping, schema, normalizeRow]);

  const BATCH_SIZE = 25;

  const handleImport = useCallback(async () => {
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsImporting(true);
    setImportProgress(0);

    // UNIFIED MODE: single request (no batching) — client dedup map must span all rows
    if (unifiedMode) {
      try {
        setImportProgress(50);
        const result = await onImport(validData, controller.signal);
        if (controller.signal.aborted) return;
        setImportResult(result);
        setImportProgress(100);
        handleNext();
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Import failed:", error);
        setImportResult({
          imported: 0, skipped: 0,
          failed: validData.length,
          errors: [{ row: 0, field: "", error: dict.errors.serverError }],
        });
        handleNext();
      } finally {
        setIsImporting(false);
        setImportProgress(0);
        abortControllerRef.current = null;
      }
      return;
    }

    const aggregated: ImportResult = {
      imported: 0,
      skipped: 0,
      failed: 0,
      errors: [],
    };

    try {
      // Split validData into batches for real progress tracking
      const totalBatches = Math.ceil(validData.length / BATCH_SIZE);

      for (let i = 0; i < totalBatches; i++) {
        if (controller.signal.aborted) return;

        const batch = validData.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
        const result = await onImport(batch, controller.signal);

        if (controller.signal.aborted) return;

        aggregated.imported += result.imported;
        aggregated.skipped += result.skipped;
        aggregated.failed += result.failed;
        if (result.errors) {
          aggregated.errors!.push(...result.errors);
        }

        // Aggregate unified import fields across batches
        if (result.clients) {
          if (!aggregated.clients) aggregated.clients = { created: 0, reused: 0, failed: 0 };
          aggregated.clients.created += result.clients.created;
          aggregated.clients.reused += result.clients.reused;
          aggregated.clients.failed += result.clients.failed;
        }
        if (result.properties) {
          if (!aggregated.properties) aggregated.properties = { created: 0, failed: 0 };
          aggregated.properties.created += result.properties.created;
          aggregated.properties.failed += result.properties.failed;
        }
        if (result.mandates) {
          if (!aggregated.mandates) aggregated.mandates = { created: 0, failed: 0 };
          aggregated.mandates.created += result.mandates.created;
          aggregated.mandates.failed += result.mandates.failed;
        }
        if (result.links) {
          if (!aggregated.links) aggregated.links = { clientProperty: 0, mandateClient: 0, mandateProperty: 0 };
          aggregated.links.clientProperty += result.links.clientProperty;
          aggregated.links.mandateClient += result.links.mandateClient;
          aggregated.links.mandateProperty += result.links.mandateProperty;
        }

        setImportProgress(Math.round(((i + 1) / totalBatches) * 100));
      }

      setImportResult(aggregated);
      handleNext();
    } catch (error) {
      if (controller.signal.aborted) return;
      console.error("Import failed:", error);
      setImportResult({
        imported: aggregated.imported,
        skipped: aggregated.skipped,
        failed: aggregated.failed + (validData.length - aggregated.imported - aggregated.skipped - aggregated.failed),
        errors: [
          ...(aggregated.errors || []),
          { row: 0, field: "", error: dict.errors.serverError },
        ],
      });
      handleNext();
    } finally {
      setIsImporting(false);
      setImportProgress(0);
      abortControllerRef.current = null;
    }
  }, [validData, onImport, dict.errors.serverError, handleNext]);

  const canProceed = () => {
    switch (currentStep) {
      case 0: // Upload
        return file !== null && parsedData.length > 0;
      case 1: // Mapping
        if (unifiedMode) {
          const mappedFields = Object.values(fieldMapping);
          const hasClientTrigger = mappedFields.includes("client_name")
            || mappedFields.includes("primary_phone") || mappedFields.includes("primary_email");
          const hasPropertyTrigger = mappedFields.includes("property_name");
          const hasMandateTrigger = mandateFieldKeys
            ? mappedFields.some((f) => mandateFieldKeys.has(f)) : false;
          return hasClientTrigger || hasPropertyTrigger || hasMandateTrigger;
        }
        // Check if all required fields are mapped
        const requiredFields = fieldDefinitions.filter((f) => f.required);
        const mappedFields = Object.values(fieldMapping);
        return requiredFields.every((rf) => mappedFields.includes(rf.key));
      case 2: // Validation
        return true; // Can proceed even with errors
      case 3: // Review
        return validData.length > 0;
      case 4: // Complete
        return true;
      default:
        return false;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <UploadStep
            dict={dict.upload}
            errorsDict={dict.errors}
            onFileUpload={handleFileUpload}
            currentFile={file}
            entityType={entityType}
            unifiedMode={unifiedMode}
          />
        );
      case 1:
        return (
          <TableMappingStep
            dict={dict.mapping}
            fieldsDict={fieldsDict}
            csvHeaders={csvHeaders}
            fieldMapping={fieldMapping}
            matchResults={matchResults}
            fieldDefinitions={fieldDefinitionsWithAliases}
            sampleData={parsedData.slice(0, 3)}
            onMappingChange={handleMappingChange}
          />
        );
      case 2:
        return (
          <ValidationStep
            dict={dict.validation}
            fieldsDict={fieldsDict}
            errors={validationErrors}
            validCount={validData.length}
            totalCount={parsedData.length}
            onValidate={validateData}
          />
        );
      case 3: {
        // Compute entity counts for unified mode preview
        // Client count uses dedup logic matching the server-side engine:
        // phone > email > name as dedup key — same client across rows counts once
        const entityCounts = unifiedMode ? (() => {
          const clientDedupKeys = new Set<string>();
          let properties = 0, mandates = 0;
          for (const row of validData) {
            const hasClient = !!(row.client_name || row.primary_phone || row.primary_email);
            if (hasClient) {
              const phone = String(row.primary_phone ?? "").trim().replace(/\D/g, "");
              const email = String(row.primary_email ?? "").trim().toLowerCase();
              const name = String(row.client_name ?? "").trim().toLowerCase();
              const key = phone ? `phone:${phone}` : email ? `email:${email}` : `name:${name}`;
              clientDedupKeys.add(key);
            }
            if (row.property_name) properties++;
            if (mandateFieldKeys && Object.entries(row).some(
              ([k, v]) => mandateFieldKeys.has(k) && v !== null && v !== undefined && v !== ""
            )) mandates++;
          }
          return { clients: clientDedupKeys.size, properties, mandates };
        })() : undefined;

        return (
          <ReviewStep
            dict={dict.review}
            fieldsDict={fieldsDict}
            data={validData}
            fieldMapping={fieldMapping}
            errorCount={validationErrors.length > 0 ? parsedData.length - validData.length : 0}
            entityType={entityType}
            entityCounts={entityCounts}
          />
        );
      }
      case 4:
        return (
          <CompleteStep
            dict={dict.complete}
            result={importResult}
            entityType={entityType}
            viewUrl={viewUrl}
            onImportMore={() => {
              setCurrentStep(0);
              setFile(null);
              setParsedData([]);
              setCsvHeaders([]);
              setFieldMapping({});
              setMatchResults(new Map());
              setValidationErrors([]);
              setValidData([]);
              setImportResult(null);
            }}
            onDone={onComplete}
          />
        );
      default:
        return null;
    }
  };

  const stepTitles = [
    dict.steps.upload.title,
    dict.steps.mapping.title,
    dict.steps.validation.title,
    dict.steps.review.title,
    dict.steps.complete.title,
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Progress Bar */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>
            {dict.progress
              .replace("{current}", String(currentStep + 1))
              .replace("{total}", String(TOTAL_STEPS))}
          </span>
          <span>{stepTitles[currentStep]}</span>
        </div>
        <Progress value={progress} className="h-2" />
      </motion.div>

      {/* Step Indicator */}
      <div className="flex items-center justify-between mb-4 relative">
        {/* Connecting line spanning from center of first step to center of last */}
        <div className="absolute top-4 left-[calc(10%-4px)] right-[calc(10%-4px)] h-0.5 pointer-events-none z-0">
          <div className="flex w-full h-full">
            {stepTitles.slice(0, -1).map((_, index) => (
              <div
                key={`line-${index}`}
                className={`h-0.5 flex-1 ${
                  currentStep > index ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="flex items-start justify-between w-full relative z-10">
          {stepTitles.map((title, index) => (
            <div key={index} className="flex flex-col items-center flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm relative z-10 ring-4 ring-background ${
                  currentStep === index
                    ? "bg-primary text-primary-foreground"
                    : currentStep > index
                    ? "bg-muted text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {currentStep > index ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : index === 0 ? (
                  <Upload className="w-4 h-4" />
                ) : (
                  index + 1
                )}
              </div>
              <div className="text-xs mt-2 text-center max-w-[80px] text-muted-foreground">
                {title}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Step Content with Animation */}
      <div className="relative min-h-[400px] overflow-hidden">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={currentStep}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
            }}
            className="px-1"
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Buttons */}
      {currentStep < TOTAL_STEPS - 1 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between gap-2 pt-4 border-t"
        >
          <div className="flex gap-2">
            {onCancel && (
              <Button variant="ghost" onClick={onCancel}>
                {dict.buttons.cancel}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 0}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              {dict.buttons.back}
            </Button>
            {currentStep === 3 ? (
              <TooltipProvider>
                <Tooltip open={isImporting ? undefined : false}>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={handleImport}
                      disabled={!canProceed() || isImporting}
                      className="gap-2 relative overflow-hidden"
                    >
                      {/* Progress fill overlay */}
                      {isImporting && (
                        <span
                          className="absolute inset-0 bg-primary-foreground/20 transition-[width] duration-300 ease-out pointer-events-none"
                          style={{ width: `${importProgress}%` }}
                        />
                      )}
                      <span className="relative z-10 flex items-center gap-2">
                        {isImporting
                          ? `${importProgress}%`
                          : dict.buttons.import}
                        {!isImporting && <ArrowRight className="w-4 h-4" />}
                      </span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>{importProgress}% imported</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : currentStep === 2 ? (
              <Button
                onClick={() => {
                  // Re-run validation to ensure state is current before navigating
                  // State updates are batched with the step change in React 18
                  validateData();
                  handleNext();
                }}
                disabled={!canProceed()}
                className="gap-2"
              >
                {dict.buttons.next}
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
                className="gap-2"
              >
                {dict.buttons.next}
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}

