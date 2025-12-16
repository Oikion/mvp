"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Upload, CheckCircle2 } from "lucide-react";
import { z } from "zod";

import { UploadStep } from "./UploadStep";
import { MappingStep } from "./MappingStep";
import { ValidationStep } from "./ValidationStep";
import { ReviewStep } from "./ReviewStep";
import { CompleteStep } from "./CompleteStep";

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
}

interface ImportWizardStepsProps {
  entityType: "client" | "property";
  dict: ImportWizardDict;
  fieldsDict: FieldsDict;
  schema: z.ZodSchema;
  fieldDefinitions: readonly FieldDefinition[];
  onImport: (data: Record<string, unknown>[]) => Promise<ImportResult>;
  onComplete?: () => void;
  onCancel?: () => void;
  viewUrl?: string;
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
  onImport,
  onComplete,
  onCancel,
  viewUrl,
}: ImportWizardStepsProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isImporting, setIsImporting] = useState(false);

  // Data state
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<Record<string, unknown>[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [validData, setValidData] = useState<Record<string, unknown>[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const progress = ((currentStep) / (TOTAL_STEPS - 1)) * 100;

  const handleNext = useCallback(() => {
    if (currentStep < TOTAL_STEPS - 1) {
      setDirection(1);
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
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
    
    // Auto-map fields based on header names (exact match only)
    const autoMapping: Record<string, string> = {};
    const usedTargets = new Set<string>();
    
    headers.forEach((header) => {
      const normalizedHeader = header.toLowerCase().replace(/[\s_-]+/g, "_");
      // Find exact match only - prevents "price_type" from mapping to "price"
      const matchedField = fieldDefinitions.find((f) => {
        const normalizedField = f.key.toLowerCase();
        return normalizedField === normalizedHeader && !usedTargets.has(f.key);
      });
      if (matchedField) {
        autoMapping[header] = matchedField.key;
        usedTargets.add(matchedField.key);
      }
    });
    setFieldMapping(autoMapping);
  }, [fieldDefinitions]);

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

      // Validate against schema
      const result = schema.safeParse(mappedRow);
      if (result.success) {
        valid.push(result.data as Record<string, unknown>);
      } else {
        result.error.errors.forEach((err) => {
          errors.push({
            row: rowIndex + 2, // +2 for header row and 0-index
            field: err.path.join("."),
            error: err.message,
            value: String(mappedRow[err.path[0]] ?? ""),
          });
        });
      }
    });

    setValidationErrors(errors);
    setValidData(valid);
    return { errors, valid };
  }, [parsedData, fieldMapping, schema]);

  const handleImport = useCallback(async () => {
    setIsImporting(true);
    try {
      const result = await onImport(validData);
      setImportResult(result);
      handleNext();
    } catch (error) {
      console.error("Import failed:", error);
      setImportResult({
        imported: 0,
        skipped: 0,
        failed: validData.length,
        errors: [{ row: 0, field: "", error: dict.errors.serverError }],
      });
      handleNext();
    } finally {
      setIsImporting(false);
    }
  }, [validData, onImport, dict.errors.serverError, handleNext]);

  const canProceed = () => {
    switch (currentStep) {
      case 0: // Upload
        return file !== null && parsedData.length > 0;
      case 1: // Mapping
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
          />
        );
      case 1:
        return (
          <MappingStep
            dict={dict.mapping}
            fieldsDict={fieldsDict}
            csvHeaders={csvHeaders}
            fieldMapping={fieldMapping}
            fieldDefinitions={fieldDefinitions}
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
      case 3:
        return (
          <ReviewStep
            dict={dict.review}
            fieldsDict={fieldsDict}
            data={validData}
            errorCount={validationErrors.length > 0 ? parsedData.length - validData.length : 0}
            entityType={entityType}
          />
        );
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
    <div className="flex flex-col gap-6 h-full min-h-0">
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
        <div className="absolute top-4 left-0 right-0 h-0.5 pointer-events-none z-0">
          <div
            className="flex w-full"
            style={{
              paddingLeft: "calc(1rem + 16px)",
              paddingRight: "calc(1rem + 16px)",
            }}
          >
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
                className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm relative z-10 ${
                  currentStep === index
                    ? "bg-primary text-primary-foreground"
                    : currentStep > index
                    ? "bg-primary/20 text-primary"
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
      <div className="relative flex-1 overflow-hidden">
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
            className="absolute inset-0 px-1 overflow-y-auto"
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
              <Button
                onClick={handleImport}
                disabled={!canProceed() || isImporting}
                className="gap-2"
              >
                {isImporting ? "Importing..." : dict.buttons.import}
                <ArrowRight className="w-4 h-4" />
              </Button>
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

