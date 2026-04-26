"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ArrowLeft, ArrowRight, Upload, CheckCircle2, Loader2 } from "lucide-react";
import { z } from "zod";

import { UploadStep } from "./UploadStep";
import { TableMappingStep } from "./TableMappingStep";
import { ValidationStep } from "./ValidationStep";
import type { ServerValidationResult } from "./ValidationStep";
import { ReviewStep } from "./ReviewStep";
import { CompleteStep } from "./CompleteStep";
import {
  autoMatchColumns,
  matchResultsToMapping,
  type MatchResult,
  type FieldDefinitionWithAliases,
} from "@/lib/import/fuzzy-matcher";

// ─── Exported types ─────────────────────────────────────────────────────────

export interface ImportWizardDict {
  title: string;
  progress: string;
  steps: {
    upload: { title: string; description: string };
    mapping: { title: string; description: string };
    validation: { title: string; description: string };
    review: { title: string; description: string };
    importing?: { title: string; description: string };
    complete: { title: string; description: string };
  };
  upload: {
    dropzone: string;
    supportedFormats: string;
    maxSize: string;
    maxRows: string;
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
  contacts?: { created: number; reused: number; failed: number };
  properties?: { created: number; failed: number };
  requests?: { created: number; failed: number };
  links?: { contactProperty: number; requestContact: number; requestProperty: number };
  // Batch result passthrough for new CompleteStep
  _batchResult?: unknown;
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface ImportWizardStepsProps {
  entityType: "contact" | "property" | "request";
  dict: ImportWizardDict;
  fieldsDict: FieldsDict;
  schema?: z.ZodSchema;
  fieldDefinitions: readonly FieldDefinition[];
  normalizeRow?: (row: Record<string, unknown>) => Record<string, unknown>;
  onImport: (
    data: Record<string, unknown>[],
    signalOrOptions?: AbortSignal | {
      assignedTo?: string | null;
      importHistoryId?: string;
      sourceFilename?: string;
      autoCreateRequests?: boolean;
    },
    signal?: AbortSignal,
  ) => Promise<ImportResult>;
  onComplete?: () => void;
  onCancel?: () => void;
  returnUrl?: string;
  unifiedMode?: boolean;
  requestFieldKeys?: Set<string>;
  locale?: string;
}

// ─── Animation variants ──────────────────────────────────────────────────────

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

// ─── Component ───────────────────────────────────────────────────────────────

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
  returnUrl,
  unifiedMode,
  requestFieldKeys,
}: Readonly<ImportWizardStepsProps>) {
  // Unified mode uses 6 steps: Upload(0), Mapping(1), Validation(2), Review(3), Importing(4), Complete(5)
  // Legacy mode uses 5 steps: Upload(0), Mapping(1), Validation(2), Review(3), Complete(4)
  const TOTAL_STEPS = unifiedMode ? 6 : 5;

  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  // ── Step 0: Upload ──
  const [file, setFile] = useState<File | null>(null);
  const fileHashRef = useRef("");
  const [parsedData, setParsedData] = useState<Record<string, unknown>[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [autoCreateRequests, setAutoCreateRequests] = useState(true);

  // ── Step 1: Mapping ──
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [matchResults, setMatchResults] = useState<Map<string, MatchResult>>(new Map());
  const [columnEntities, setColumnEntities] = useState<Record<string, "contact" | "property" | "request" | "unassigned">>({});
  const [groupingKeys, setGroupingKeys] = useState<Record<string, boolean>>({});

  // ── Step 2: Validation ──
  const [validationResult, setValidationResult] = useState<ServerValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [skippedRows, setSkippedRows] = useState<Set<number>>(new Set());
  // Original flat mapped rows — needed for re-validation with edits applied
  const [originalMappedRows, setOriginalMappedRows] = useState<Record<string, unknown>[]>([]);

  // ── Step 3: Review ──
  const [entityApprovals, setEntityApprovals] = useState<Record<string, boolean>>({});
  const [assignedTo, setAssignedTo] = useState<string | null>(null);

  // ── Step 4: Importing (unified) / Import trigger (legacy) ──
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  // ── Step 5 (unified) / Step 4 (legacy): Complete ──
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  // ── Legacy-only: client-side validation state ──
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [validData, setValidData] = useState<Record<string, unknown>[]>([]);

  // Convert field definitions for fuzzy matcher
  const fieldDefinitionsWithAliases = useMemo(() => {
    return fieldDefinitions.map((f) => ({
      ...f,
      aliases: f.aliases || [],
    })) as FieldDefinitionWithAliases[];
  }, [fieldDefinitions]);

  const progress = (currentStep / (TOTAL_STEPS - 1)) * 100;

  // ── Navigation ────────────────────────────────────────────────────────────

  const handleNext = useCallback(() => {
    if (currentStep < TOTAL_STEPS - 1) {
      setDirection(1);
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep, TOTAL_STEPS]);

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

  // ── File upload handler ──────────────────────────────────────────────────

  const handleFileUpload = useCallback(
    (uploadedFile: File, headers: string[], data: Record<string, unknown>[]) => {
      setFile(uploadedFile);
      setCsvHeaders(headers);
      setParsedData(data);

      // Use fuzzy matcher for intelligent auto-mapping
      const results = autoMatchColumns(headers, fieldDefinitionsWithAliases);
      setMatchResults(results);

      // Convert match results to field mapping
      const autoMapping = matchResultsToMapping(results);
      setFieldMapping(autoMapping);
    },
    [fieldDefinitionsWithAliases],
  );

  const handleFileHash = useCallback((hash: string) => {
    fileHashRef.current = hash;
  }, []);

  // ── Mapping change handler ────────────────────────────────────────────────

  const handleMappingChange = useCallback((csvColumn: string, targetField: string) => {
    setFieldMapping((prev) => ({
      ...prev,
      [csvColumn]: targetField,
    }));
  }, []);

  // ── Build mapped rows from parsedData + fieldMapping ──────────────────────

  const buildMappedRows = useCallback(() => {
    return parsedData.map((row) => {
      const mappedRow: Record<string, unknown> = {};
      Object.entries(fieldMapping).forEach(([csvCol, targetField]) => {
        if (targetField && row[csvCol] !== undefined && row[csvCol] !== "") {
          mappedRow[targetField] = row[csvCol];
        }
      });
      return mappedRow;
    });
  }, [parsedData, fieldMapping]);

  // ── Server-side validation (unified mode) ─────────────────────────────────

  const runServerValidation = useCallback(
    async (rows: Record<string, unknown>[]) => {
      setIsValidating(true);
      try {
        const response = await fetch("/api/import/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Validation failed");
        }

        const result = await response.json();
        setValidationResult(result);
      } catch (error) {
        console.error("[IMPORT_VALIDATE]", error);
        // Set an empty result on error so the user sees something
        setValidationResult({
          validRows: [],
          errorRows: [
            {
              rowIndex: 0,
              entity: "contact",
              field: "",
              error: error instanceof Error ? error.message : "Validation failed",
              rawValue: "",
            },
          ],
          entitySummary: {
            contacts: { detected: false, total: 0, unique: 0, deduplicated: 0 },
            properties: { detected: false, total: 0, unique: 0, deduplicated: 0 },
            requests: { detected: false, total: 0, unique: 0, deduplicated: 0 },
          },
        });
      } finally {
        setIsValidating(false);
      }
    },
    [],
  );

  // ── Client-side validation (legacy mode) ──────────────────────────────────

  const validateDataClientSide = useCallback(() => {
    if (!schema) return { errors: [] as ValidationError[], valid: [] as Record<string, unknown>[] };

    const errors: ValidationError[] = [];
    const valid: Record<string, unknown>[] = [];

    parsedData.forEach((row, rowIndex) => {
      const mappedRow: Record<string, unknown> = {};
      Object.entries(fieldMapping).forEach(([csvCol, targetField]) => {
        if (targetField && row[csvCol] !== undefined && row[csvCol] !== "") {
          mappedRow[targetField] = row[csvCol];
        }
      });

      const normalizedRow = normalizeRow ? normalizeRow(mappedRow) : mappedRow;

      const result = schema.safeParse(normalizedRow);
      if (result.success) {
        valid.push(result.data as Record<string, unknown>);
      } else {
        result.error.errors.forEach((err) => {
          errors.push({
            row: rowIndex + 2,
            field: err.path.join("."),
            error: err.message,
            value: normalizedRow[err.path[0]] === null || normalizedRow[err.path[0]] === undefined
              ? ""
              : String(normalizedRow[err.path[0]]),
          });
        });
      }
    });

    setValidationErrors(errors);
    setValidData(valid);
    return { errors, valid };
  }, [parsedData, fieldMapping, schema, normalizeRow]);

  // Legacy shim: build ServerValidationResult shape from client-side validation
  const legacyServerValidationResult = useMemo<ServerValidationResult | null>(() => {
    if (!schema || parsedData.length === 0) return null;
    return {
      validRows: validData.map((row, idx) => ({
        rowIndex: idx,
        contactRow: entityType === "contact" ? row : null,
        propertyRow: entityType === "property" ? row : null,
        requestRow: entityType === "request" ? row : null,
        hasContact: entityType === "contact",
        hasProperty: entityType === "property",
        hasRequest: entityType === "request",
      })),
      errorRows: validationErrors.map((ve) => ({
        rowIndex: ve.row,
        entity: entityType,
        field: ve.field,
        error: ve.error,
        rawValue: ve.value ?? "",
      })),
      entitySummary: {
        contacts: {
          detected: entityType === "contact",
          total: parsedData.length,
          unique: validData.length,
          deduplicated: 0,
        },
        properties: {
          detected: entityType === "property",
          total: parsedData.length,
          unique: validData.length,
          deduplicated: 0,
        },
        requests: {
          detected: entityType === "request",
          total: parsedData.length,
          unique: validData.length,
          deduplicated: 0,
        },
      },
    };
  }, [parsedData.length, validData, validationErrors, entityType, schema]);

  // ── Re-validation handler (unified mode) ──────────────────────────────────

  const handleRevalidate = useCallback(
    (editsByRow: Record<number, Record<string, string>>) => {
      if (unifiedMode) {
        // Apply edits to the ORIGINAL flat mapped rows (not the ValidatedRow objects)
        const updatedRows = originalMappedRows.map((row, idx) => {
          const edits = editsByRow[idx];
          if (edits) {
            return { ...row, ...edits };
          }
          return row;
        });
        setOriginalMappedRows(updatedRows); // Update stored rows with edits
        void runServerValidation(updatedRows);
      }
    },
    [unifiedMode, originalMappedRows, runServerValidation],
  );

  // ── Step transition: Mapping → Validation ─────────────────────────────────

  const handleMappingToValidation = useCallback(async () => {
    if (unifiedMode) {
      const mappedRows = buildMappedRows();
      setOriginalMappedRows(mappedRows); // Store for re-validation
      await runServerValidation(mappedRows);
      setDirection(1);
      setCurrentStep(2);
    } else {
      // Legacy: run client-side validation then advance
      validateDataClientSide();
      setDirection(1);
      setCurrentStep(2);
    }
  }, [unifiedMode, buildMappedRows, runServerValidation, validateDataClientSide]);

  // ── Step transition: Review → Importing (unified) ─────────────────────────

  const handleStartImport = useCallback(async () => {
    if (unifiedMode) {
      // Advance to the "Importing" step (step 4)
      setDirection(1);
      setCurrentStep(4);
      setIsImporting(true);
      setImportProgress(0);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        // Get the valid rows from server validation
        const rowsToImport = validationResult?.validRows ?? [];

        // Filter out skipped rows (by original rowIndex, not array position)
        const filteredRows = rowsToImport.filter(
          (row) => !skippedRows.has((row as any).rowIndex ?? 0),
        );

        setImportProgress(30);

        const result = await onImport(
          filteredRows,
          {
            assignedTo: assignedTo ?? undefined,
            sourceFilename: file?.name,
            autoCreateRequests,
          },
          controller.signal,
        );

        if (controller.signal.aborted) return;

        setImportResult(result);
        setImportProgress(100);

        // Advance to Complete step
        setDirection(1);
        setCurrentStep(5);
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("[IMPORT]", error);
        setImportResult({
          imported: 0,
          skipped: 0,
          failed: (validationResult?.validRows ?? []).length,
          errors: [{ row: 0, field: "", error: dict.errors.serverError }],
        });
        // Go back to Review step on failure
        setDirection(-1);
        setCurrentStep(3);
      } finally {
        setIsImporting(false);
        setImportProgress(0);
        abortControllerRef.current = null;
      }
    }
  }, [
    unifiedMode,
    validationResult,
    skippedRows,
    onImport,
    assignedTo,
    file,
    autoCreateRequests,
    dict.errors.serverError,
  ]);

  // ── Legacy import handler (batched, step 3 → 4) ──────────────────────────

  const BATCH_SIZE = 25;

  const handleLegacyImport = useCallback(async () => {
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsImporting(true);
    setImportProgress(0);

    const aggregated: ImportResult = {
      imported: 0,
      skipped: 0,
      failed: 0,
      errors: [],
    };

    try {
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

        setImportProgress(Math.round(((i + 1) / totalBatches) * 100));
      }

      setImportResult(aggregated);
      handleNext();
    } catch (error) {
      if (controller.signal.aborted) return;
      console.error("[IMPORT]", error);
      setImportResult({
        imported: aggregated.imported,
        skipped: aggregated.skipped,
        failed:
          aggregated.failed +
          (validData.length - aggregated.imported - aggregated.skipped - aggregated.failed),
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

  // ── Import resumption check (unified mode only) ───────────────────────────

  useEffect(() => {
    if (!unifiedMode) return;
    if (globalThis.window === undefined) return;

    const inProgress = sessionStorage.getItem("importInProgress");
    if (inProgress) {
      // Previous import was in progress but the page was reloaded.
      // Clear the marker — the unified endpoint handles its own history recording.
      sessionStorage.removeItem("importInProgress");
    }
  }, [unifiedMode]);

  // ── canProceed() ──────────────────────────────────────────────────────────

  const canProceed = useCallback(() => {
    if (unifiedMode) {
      switch (currentStep) {
        case 0: // Upload
          return file !== null && parsedData.length > 0;
        case 1: { // Mapping
          const mappedFields = Object.values(fieldMapping);
          const hasContactTrigger =
            mappedFields.includes("contact_name") ||
            mappedFields.includes("primary_phone") ||
            mappedFields.includes("primary_email");
          const hasPropertyTrigger = mappedFields.includes("property_name");
          const hasRequestTrigger = requestFieldKeys
            ? mappedFields.some((f) => requestFieldKeys.has(f))
            : false;
          return hasContactTrigger || hasPropertyTrigger || hasRequestTrigger;
        }
        case 2: // Validation
          return !isValidating;
        case 3: // Review
          return (validationResult?.validRows ?? []).length > 0;
        case 4: // Importing (auto-transition, no user action needed)
          return false;
        case 5: // Complete
          return true;
        default:
          return false;
      }
    }

    // Legacy mode
    switch (currentStep) {
      case 0: // Upload
        return file !== null && parsedData.length > 0;
      case 1: { // Mapping
        const requiredFields = fieldDefinitions.filter((f) => f.required);
        const mappedFields = Object.values(fieldMapping);
        return requiredFields.every((rf) => mappedFields.includes(rf.key));
      }
      case 2: // Validation
        return true;
      case 3: // Review
        return validData.length > 0;
      case 4: // Complete
        return true;
      default:
        return false;
    }
  }, [
    unifiedMode,
    currentStep,
    file,
    parsedData.length,
    fieldMapping,
    requestFieldKeys,
    isValidating,
    validationResult,
    fieldDefinitions,
    validData.length,
  ]);

  // ── Reset wizard ──────────────────────────────────────────────────────────

  const handleReset = useCallback(() => {
    setCurrentStep(0);
    setFile(null);
    fileHashRef.current = "";
    setParsedData([]);
    setCsvHeaders([]);
    setFieldMapping({});
    setMatchResults(new Map());
    setColumnEntities({});
    setGroupingKeys({});
    setValidationResult(null);
    setIsValidating(false);
    setSkippedRows(new Set());
    setEntityApprovals({});
    setAssignedTo(null);
    setIsImporting(false);
    setImportProgress(0);
    setImportResult(null);
    setValidationErrors([]);
    setValidData([]);
  }, []);

  // ── Row edit handler (unified review step) ────────────────────────────────

  const handleRowEdit = useCallback(
    (_rowIndex: number, _field: string, _value: unknown) => {
      // Row editing in the review step updates the validation result's validRows
      // This is handled by the ReviewStep component internally
    },
    [],
  );

  // ── Step rendering ────────────────────────────────────────────────────────

  const renderStep = () => {
    if (unifiedMode) {
      return renderUnifiedStep();
    }
    return renderLegacyStep();
  };

  const renderUnifiedStep = () => {
    switch (currentStep) {
      case 0: // Upload
        return (
          <UploadStep
            dict={dict.upload}
            errorsDict={dict.errors}
            onFileUpload={handleFileUpload}
            onFileHash={handleFileHash}
            currentFile={file}
            entityType={entityType}
            unifiedMode={true}
            autoCreateRequests={autoCreateRequests}
            onAutoCreateRequestsChange={setAutoCreateRequests}
          />
        );
      case 1: // Mapping
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
            columnEntities={columnEntities}
            onColumnEntitiesChange={setColumnEntities}
            groupingKeys={groupingKeys}
            onGroupingKeysChange={setGroupingKeys}
          />
        );
      case 2: // Validation
        return (
          <ValidationStep
            dict={dict.validation}
            validationResult={validationResult}
            isValidating={isValidating}
            skippedRows={skippedRows}
            onSkippedRowsChange={setSkippedRows}
            onRevalidate={handleRevalidate}
          />
        );
      case 3: // Review (unified — uses new props interface)
        return (
          <ReviewStep
            validatedRows={validationResult?.validRows ?? []}
            skippedRows={skippedRows}
            entityApprovals={entityApprovals}
            onEntityApprovalsChange={setEntityApprovals}
            assignedTo={assignedTo}
            onAssignedToChange={setAssignedTo}
            onRowEdit={handleRowEdit}
            dict={dict.review}
          />
        );
      case 4: // Importing (loading state)
        return (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" aria-hidden="true" />
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold">
                {dict.steps.importing?.title ?? "Importing..."}
              </h3>
              <p className="text-sm text-muted-foreground">
                {dict.steps.importing?.description ?? "Processing your data. Please wait..."}
              </p>
              {importProgress > 0 && (
                <Progress value={importProgress} className="h-2 w-64 mx-auto mt-4" />
              )}
            </div>
          </div>
        );
      case 5: // Complete
        return (
          <CompleteStep
            dict={dict.complete}
            result={importResult}
            entityType={entityType}
            returnUrl={returnUrl}
            onImportMore={handleReset}
            onDone={onComplete}
          />
        );
      default:
        return null;
    }
  };

  const computeLegacyEntityCounts = () => {
    const clientDedupKeys = new Set<string>();
    let properties = 0;
    let mandates = 0;
    for (const row of validData) {
      const hasClient = !!(row.contact_name || row.primary_phone || row.primary_email);
      if (hasClient) {
        const phoneVal = row.primary_phone;
        const emailVal = row.primary_email;
        const nameVal = row.contact_name;
        const phoneStr = phoneVal === null || phoneVal === undefined ? "" : String(phoneVal);
        const emailStr = emailVal === null || emailVal === undefined ? "" : String(emailVal);
        const nameStr = nameVal === null || nameVal === undefined ? "" : String(nameVal);
        const phone = phoneStr.trim().replaceAll(/\D/g, "");
        const email = emailStr.trim().toLowerCase();
        const name = nameStr.trim().toLowerCase();
        let key: string;
        if (phone) {
          key = `phone:${phone}`;
        } else if (email) {
          key = `email:${email}`;
        } else {
          key = `name:${name}`;
        }
        clientDedupKeys.add(key);
      }
      if (row.property_name) properties++;
      if (
        requestFieldKeys &&
        Object.entries(row).some(
          ([k, v]) => requestFieldKeys.has(k) && v !== null && v !== undefined && v !== "",
        )
      ) {
        mandates++;
      }
    }
    return { contacts: clientDedupKeys.size, properties, requests: mandates };
  };

  const renderLegacyReview = () => {
    const entityCounts = computeLegacyEntityCounts();
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
  };

  const renderLegacyStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <UploadStep
            dict={dict.upload}
            errorsDict={dict.errors}
            onFileUpload={handleFileUpload}
            currentFile={file}
            entityType={entityType}
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
            validationResult={legacyServerValidationResult}
            isValidating={false}
            skippedRows={skippedRows}
            onSkippedRowsChange={setSkippedRows}
            onRevalidate={() => validateDataClientSide()}
          />
        );
      case 3:
        return renderLegacyReview();
      case 4:
        return (
          <CompleteStep
            dict={dict.complete}
            result={importResult}
            entityType={entityType}
            onImportMore={handleReset}
            onDone={onComplete}
          />
        );
      default:
        return null;
    }
  };

  // ── Step titles ───────────────────────────────────────────────────────────

  const stepTitles = unifiedMode
    ? [
        dict.steps.upload.title,
        dict.steps.mapping.title,
        dict.steps.validation.title,
        dict.steps.review.title,
        dict.steps.importing?.title ?? "Import",
        dict.steps.complete.title,
      ]
    : [
        dict.steps.upload.title,
        dict.steps.mapping.title,
        dict.steps.validation.title,
        dict.steps.review.title,
        dict.steps.complete.title,
      ];

  // ── "Next" click dispatcher ───────────────────────────────────────────────

  const handleNextClick = useCallback(() => {
    if (unifiedMode) {
      switch (currentStep) {
        case 1:
          // Mapping → Validation: run server-side validation
          void handleMappingToValidation();
          return;
        case 3:
          // Review → Importing: start the import
          void handleStartImport();
          return;
        default:
          handleNext();
          return;
      }
    }

    // Legacy mode
    if (currentStep === 2) {
      // Re-run client-side validation before advancing from Validation → Review
      validateDataClientSide();
      handleNext();
    } else {
      handleNext();
    }
  }, [
    unifiedMode,
    currentStep,
    handleMappingToValidation,
    handleStartImport,
    handleNext,
    validateDataClientSide,
  ]);

  // ── Determine if the current step is the import-triggering step ───────────

  const isImportStep = currentStep === 3;
  const isCompleteStep = unifiedMode ? currentStep === 5 : currentStep === 4;
  const isImportingStep = unifiedMode && currentStep === 4;

  // ── Navigation button renderer ──────────────────────────────────────────

  const renderNextButton = () => {
    if (isImportStep && unifiedMode) {
      // Unified: "Import" button on Review step triggers handleStartImport
      return (
        <Button
          onClick={handleNextClick}
          disabled={!canProceed()}
          className="gap-2"
        >
          {dict.buttons.import}
          <ArrowRight className="w-4 h-4" />
        </Button>
      );
    }

    if (isImportStep && !unifiedMode) {
      // Legacy: "Import" button with progress overlay
      return (
        <TooltipProvider>
          <Tooltip open={isImporting ? undefined : false}>
            <TooltipTrigger asChild>
              <Button
                onClick={handleLegacyImport}
                disabled={!canProceed() || isImporting}
                className="gap-2 relative overflow-hidden"
              >
                {isImporting && (
                  <span
                    className="absolute inset-0 bg-primary-foreground/20 transition-[width] duration-300 ease-out pointer-events-none"
                    style={{ width: `${importProgress}%` }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  {isImporting ? `${importProgress}%` : dict.buttons.import}
                  {!isImporting && <ArrowRight className="w-4 h-4" />}
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>{importProgress}% imported</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    // Default: "Next" button
    const showSpinner = isValidating && currentStep === 1;
    return (
      <Button
        onClick={handleNextClick}
        disabled={!canProceed() || showSpinner}
        className="gap-2"
      >
        {showSpinner ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            {dict.buttons.next}
          </>
        ) : (
          <>
            {dict.buttons.next}
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </Button>
    );
  };

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
        {/* Connecting line */}
        <div className="absolute top-4 left-[calc(10%-4px)] right-[calc(10%-4px)] h-0.5 pointer-events-none z-0">
          <div className="flex w-full h-full">
            {stepTitles.slice(0, -1).map((title, index) => (
              <div
                key={`line-${title}`}
                className={`h-0.5 flex-1 ${
                  currentStep > index ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="flex items-start justify-between w-full relative z-10">
          {stepTitles.map((title, index) => {
            let stepCircleClass = "bg-muted text-muted-foreground";
            if (currentStep === index) {
              stepCircleClass = "bg-primary text-primary-foreground";
            } else if (currentStep > index) {
              stepCircleClass = "bg-muted text-primary";
            }

            let stepIcon: React.ReactNode;
            if (currentStep > index) {
              stepIcon = <CheckCircle2 className="w-4 h-4" />;
            } else if (index === 0) {
              stepIcon = <Upload className="w-4 h-4" />;
            } else {
              stepIcon = index + 1;
            }

            return (
            <div key={`step-${title}`} className="flex flex-col items-center flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm relative z-10 ring-4 ring-background ${stepCircleClass}`}
              >
                {stepIcon}
              </div>
              <div className="text-xs mt-2 text-center max-w-[80px] text-muted-foreground">
                {title}
              </div>
            </div>
            );
          })}
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
      {!isCompleteStep && !isImportingStep && (
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
            {renderNextButton()}
          </div>
        </motion.div>
      )}
    </div>
  );
}
