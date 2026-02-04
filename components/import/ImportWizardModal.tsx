"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ImportWizardSteps, type ImportWizardDict, type FieldsDict, type FieldDefinition, type ImportResult } from "./ImportWizardSteps";
import { z } from "zod";

interface ImportWizardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: "client" | "property";
  title: string;
  description?: string;
  dict: ImportWizardDict;
  fieldsDict: FieldsDict;
  schema: z.ZodSchema;
  fieldDefinitions: readonly FieldDefinition[];
  onImport: (data: Record<string, unknown>[]) => Promise<ImportResult>;
  onComplete?: () => void;
  viewUrl?: string;
}

export function ImportWizardModal({
  open,
  onOpenChange,
  entityType,
  title,
  description,
  dict,
  fieldsDict,
  schema,
  fieldDefinitions,
  onImport,
  onComplete,
  viewUrl,
}: ImportWizardModalProps) {
  const handleCancel = () => {
    onOpenChange(false);
  };

  const handleComplete = () => {
    onOpenChange(false);
    onComplete?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <ImportWizardSteps
          entityType={entityType}
          dict={dict}
          fieldsDict={fieldsDict}
          schema={schema}
          fieldDefinitions={fieldDefinitions}
          onImport={onImport}
          onComplete={handleComplete}
          onCancel={handleCancel}
          viewUrl={viewUrl}
        />
      </DialogContent>
    </Dialog>
  );
}

