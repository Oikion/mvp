"use client";

import { useState, useCallback, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Check,
  AlertCircle,
  AlertTriangle,
  ChevronsUpDown,
  X,
  Sparkles,
  Link2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  MatchResult,
  MatchConfidence,
  FieldDefinitionWithAliases,
} from "@/lib/import/fuzzy-matcher";

interface FieldsDict {
  groups: Record<string, string>;
  fields: Record<string, string>;
  enums?: Record<string, Record<string, string>>;
}

interface TableMappingStepProps {
  dict: {
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
    // Optional enhanced keys
    sourceColumns?: string;
    targetFields?: string;
    highConfidence?: string;
    mediumConfidence?: string;
    lowConfidence?: string;
    autoMatchedCount?: string;
    unmappedCount?: string;
    dragToMap?: string;
    clickToUnmap?: string;
    reassignDialog?: {
      title: string;
      description: string;
      cancel: string;
      confirm: string;
    };
  };
  fieldsDict: FieldsDict;
  csvHeaders: string[];
  fieldMapping: Record<string, string>;
  matchResults: Map<string, MatchResult>;
  fieldDefinitions: readonly FieldDefinitionWithAliases[];
  sampleData: Record<string, unknown>[];
  onMappingChange: (csvColumn: string, targetField: string) => void;
}

// Confidence-based styling
const confidenceBadge: Record<
  MatchConfidence,
  { className: string; label: string }
> = {
  high: { className: "bg-success/10 text-success border-success/30", label: "High" },
  medium: { className: "bg-warning/10 text-yellow-700 dark:text-warning border-warning/30", label: "Medium" },
  low: { className: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30", label: "Low" },
  none: { className: "bg-muted text-muted-foreground border-muted-foreground/30", label: "" },
};

// Per-row field combobox
function FieldCombobox({
  csvColumn,
  currentValue,
  matchResult,
  fieldDefinitions,
  fieldsDict,
  fieldMapping,
  mappedFields,
  onSelect,
  onReassign,
  selectFieldLabel,
  reassignDialogDict,
}: {
  csvColumn: string;
  currentValue: string;
  matchResult: MatchResult | undefined;
  fieldDefinitions: readonly FieldDefinitionWithAliases[];
  fieldsDict: FieldsDict;
  fieldMapping: Record<string, string>;
  mappedFields: Set<string>;
  onSelect: (fieldKey: string) => void;
  onReassign: (fromCsvColumn: string, fieldKey: string) => void;
  selectFieldLabel: string;
  reassignDialogDict?: {
    title: string;
    description: string;
    cancel: string;
    confirm: string;
  };
}) {
  const [open, setOpen] = useState(false);
  const [pendingReassign, setPendingReassign] = useState<{
    fieldKey: string;
    fromColumn: string;
  } | null>(null);

  // Group fields by their group property
  const groupedFields = useMemo(() => {
    const groups: Record<string, FieldDefinitionWithAliases[]> = {};
    for (const field of fieldDefinitions) {
      if (!groups[field.group]) groups[field.group] = [];
      groups[field.group].push(field);
    }
    return groups;
  }, [fieldDefinitions]);

  // Reverse mapping: fieldKey → csvColumn that owns it
  const reverseMapping = useMemo(() => {
    const map: Record<string, string> = {};
    for (const [col, fieldKey] of Object.entries(fieldMapping)) {
      if (fieldKey) map[fieldKey] = col;
    }
    return map;
  }, [fieldMapping]);

  // Suggested matches: the fuzzy matcher's best match for this column (if any)
  const suggestedField = matchResult?.targetField ?? null;

  const selectedLabel = currentValue
    ? fieldsDict.fields[currentValue] || currentValue
    : null;

  const handleFieldSelect = useCallback(
    (fieldKey: string) => {
      const isUsed = mappedFields.has(fieldKey) && fieldKey !== currentValue;
      if (isUsed) {
        const fromColumn = reverseMapping[fieldKey];
        if (fromColumn) {
          setPendingReassign({ fieldKey, fromColumn });
          setOpen(false);
          return;
        }
      }
      onSelect(fieldKey);
      setOpen(false);
    },
    [mappedFields, currentValue, reverseMapping, onSelect]
  );

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between text-left font-normal h-9",
              !currentValue && "text-muted-foreground"
            )}
          >
            <span className="truncate">
              {selectedLabel || selectFieldLabel}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-0 pointer-events-auto" align="start">
          <Command>
            <CommandInput placeholder={selectFieldLabel} />
            <CommandList>
              <CommandEmpty>No field found.</CommandEmpty>

              {/* Suggested match (if any and not already selected) */}
              {suggestedField &&
                suggestedField !== currentValue &&
                !mappedFields.has(suggestedField) && (
                  <>
                    <CommandGroup heading="Suggested">
                      <CommandItem
                        value={`suggested-${suggestedField}`}
                        keywords={[
                          fieldsDict.fields[suggestedField] || suggestedField,
                          suggestedField,
                        ]}
                        onSelect={() => handleFieldSelect(suggestedField)}
                      >
                        <Sparkles className="mr-2 h-3.5 w-3.5 text-primary" />
                        <span className="flex-1">
                          {fieldsDict.fields[suggestedField] || suggestedField}
                        </span>
                        {matchResult && (
                          <Badge
                            variant="outline"
                            className={cn(
                              "ml-2 text-[10px]",
                              confidenceBadge[matchResult.confidence].className
                            )}
                          >
                            {matchResult.score}%
                          </Badge>
                        )}
                      </CommandItem>
                    </CommandGroup>
                    <CommandSeparator />
                  </>
                )}

              {/* Clear selection option when mapped */}
              {currentValue && (
                <>
                  <CommandGroup>
                    <CommandItem
                      value="__clear__"
                      onSelect={() => {
                        onSelect("");
                        setOpen(false);
                      }}
                      className="text-muted-foreground"
                    >
                      <X className="mr-2 h-3.5 w-3.5" />
                      <span>Clear mapping</span>
                    </CommandItem>
                  </CommandGroup>
                  <CommandSeparator />
                </>
              )}

              {/* All fields grouped */}
              {Object.entries(groupedFields).map(([groupKey, fields]) => (
                <CommandGroup
                  key={groupKey}
                  heading={fieldsDict.groups[groupKey] || groupKey}
                >
                  {fields.map((field) => {
                    const isSelected = currentValue === field.key;
                    const isUsed = mappedFields.has(field.key) && !isSelected;
                    const label = fieldsDict.fields[field.key] || field.key;

                    return (
                      <CommandItem
                        key={field.key}
                        value={field.key}
                        keywords={[label, field.key, ...(field.aliases || [])]}
                        onSelect={() => handleFieldSelect(field.key)}
                        className={cn(isUsed && "opacity-50")}
                      >
                        {isSelected ? (
                          <Check className="mr-2 h-3.5 w-3.5 text-primary" />
                        ) : isUsed ? (
                          <Link2 className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                        ) : (
                          <span className="mr-2 h-3.5 w-3.5" />
                        )}
                        <span className="flex-1">{label}</span>
                        {field.required && (
                          <Badge
                            variant="secondary"
                            className="ml-1 text-[10px] px-1 py-0"
                          >
                            *
                          </Badge>
                        )}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Reassign confirmation dialog */}
      <AlertDialog
        open={!!pendingReassign}
        onOpenChange={(open) => { if (!open) setPendingReassign(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {reassignDialogDict?.title ?? "Reassign field?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {reassignDialogDict?.description
                ? reassignDialogDict.description
                    .replace("{field}", fieldsDict.fields[pendingReassign?.fieldKey ?? ""] || pendingReassign?.fieldKey || "")
                    .replace("{column}", pendingReassign?.fromColumn || "")
                : <>
                    <strong>{fieldsDict.fields[pendingReassign?.fieldKey ?? ""] || pendingReassign?.fieldKey}</strong>
                    {" "}is currently mapped to column{" "}
                    <strong>{pendingReassign?.fromColumn}</strong>.
                    Reassigning it will remove that mapping.
                  </>
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {reassignDialogDict?.cancel ?? "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (pendingReassign) {
                  onReassign(pendingReassign.fromColumn, pendingReassign.fieldKey);
                }
                setPendingReassign(null);
              }}
            >
              {reassignDialogDict?.confirm ?? "Reassign"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function TableMappingStep({
  dict,
  fieldsDict,
  csvHeaders,
  fieldMapping,
  matchResults,
  fieldDefinitions,
  sampleData,
  onMappingChange,
}: TableMappingStepProps) {
  // Fields that are already mapped (used to disable in dropdowns)
  const mappedFields = useMemo(() => {
    return new Set(Object.values(fieldMapping).filter(Boolean));
  }, [fieldMapping]);

  // Required fields status
  const requiredFields = useMemo(
    () => fieldDefinitions.filter((f) => f.required),
    [fieldDefinitions]
  );
  const missingRequired = useMemo(
    () => requiredFields.filter((rf) => !mappedFields.has(rf.key)),
    [requiredFields, mappedFields]
  );

  // Statistics
  const stats = useMemo(() => {
    let matched = 0;
    let highConfidence = 0;
    let mediumConfidence = 0;

    for (const header of csvHeaders) {
      if (fieldMapping[header]) {
        matched++;
        const result = matchResults.get(header);
        if (result?.confidence === "high") highConfidence++;
        else if (result?.confidence === "medium") mediumConfidence++;
      }
    }
    return { total: csvHeaders.length, matched, unmatched: csvHeaders.length - matched };
  }, [csvHeaders, fieldMapping, matchResults]);

  const handleSelect = useCallback(
    (csvColumn: string, fieldKey: string) => {
      onMappingChange(csvColumn, fieldKey);
    },
    [onMappingChange]
  );

  // Reassign: clear old column's mapping, then set the new one
  const handleReassign = useCallback(
    (csvColumn: string, fromCsvColumn: string, fieldKey: string) => {
      onMappingChange(fromCsvColumn, "");
      onMappingChange(csvColumn, fieldKey);
    },
    [onMappingChange]
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Statistics Bar */}
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg text-sm">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">
            {stats.total} columns uploaded
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-success dark:text-success flex items-center gap-1">
            <Check className="h-4 w-4" />
            {dict.autoMatchedCount?.replace("{count}", String(stats.matched)) ||
              `${stats.matched} mapped`}
          </span>
          {stats.unmatched > 0 && (
            <span className="text-warning flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              {dict.unmappedCount?.replace("{count}", String(stats.unmatched)) ||
                `${stats.unmatched} unmapped`}
            </span>
          )}
        </div>
      </div>

      {/* Missing Required Fields Warning */}
      {missingRequired.length > 0 && (
        <div className="flex items-start gap-3 p-3 rounded-lg border border-warning/30 bg-warning/10">
          <AlertCircle className="h-5 w-5 text-warning mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-sm">
              {dict.required}: {missingRequired.length} field(s) not mapped
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {missingRequired
                .map((f) => fieldsDict.fields[f.key] || f.key)
                .join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* Mapping Table */}
      <div className="border rounded-lg overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-[2fr_3fr_3fr_36px] gap-3 px-4 py-2.5 bg-muted/50 border-b text-xs font-medium text-muted-foreground uppercase tracking-wide">
          <span>{dict.csvColumn}</span>
          <span>{dict.sampleData}</span>
          <span>{dict.targetField}</span>
          <span />
        </div>

        {/* Table Rows */}
        <div className="divide-y">
          {csvHeaders.map((header) => {
            const currentMapping = fieldMapping[header] || "";
            const matchResult = matchResults.get(header);
            const sampleValue = sampleData[0]?.[header];
            const sampleStr =
              sampleValue !== undefined && sampleValue !== null
                ? String(sampleValue)
                : "";
            const isMapped = !!currentMapping;

            return (
              <div
                key={header}
                className={cn(
                  "grid grid-cols-[2fr_3fr_3fr_36px] gap-3 px-4 py-2.5 items-center transition-colors",
                  isMapped
                    ? "bg-success/5"
                    : "bg-warning/5"
                )}
              >
                {/* Column Name */}
                <div className="flex items-center gap-2 min-w-0">
                  <span className={cn("text-sm font-medium truncate", !isMapped && "text-warning")}>
                    {header}
                  </span>
                  {isMapped && matchResult && matchResult.confidence !== "none" && (
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] shrink-0",
                        confidenceBadge[matchResult.confidence].className
                      )}
                    >
                      {matchResult.score}%
                    </Badge>
                  )}
                </div>

                {/* Sample Value */}
                <span className="text-xs text-muted-foreground truncate">
                  {sampleStr || "—"}
                </span>

                {/* Field Dropdown */}
                <FieldCombobox
                  csvColumn={header}
                  currentValue={currentMapping}
                  matchResult={matchResult}
                  fieldDefinitions={fieldDefinitions}
                  fieldsDict={fieldsDict}
                  fieldMapping={fieldMapping}
                  mappedFields={mappedFields}
                  onSelect={(fieldKey) => handleSelect(header, fieldKey)}
                  onReassign={(fromCol, fieldKey) => handleReassign(header, fromCol, fieldKey)}
                  selectFieldLabel={dict.selectField}
                  reassignDialogDict={dict.reassignDialog}
                />

                {/* Clear / warning icon */}
                <div className="flex justify-center">
                  {isMapped ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleSelect(header, "")}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  ) : (
                    <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
