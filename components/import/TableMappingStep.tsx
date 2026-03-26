"use client";

import { useState, useCallback, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { useDroppable } from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Check,
  AlertCircle,
  AlertTriangle,
  ChevronsUpDown,
  X,
  Sparkles,
  Link2,
  GripVertical,
  KeyRound,
  Plus,
  Users,
  Building2,
  FileText,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  MatchResult,
  MatchConfidence,
  FieldDefinitionWithAliases,
} from "@/lib/import/fuzzy-matcher";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type EntityType = "client" | "property" | "mandate" | "unassigned";

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
  // New props for cross-tab drag-and-drop
  columnEntities?: Record<string, EntityType>;
  onColumnEntitiesChange?: (entities: Record<string, EntityType>) => void;
  groupingKeys?: Record<string, boolean>;
  onGroupingKeysChange?: (keys: Record<string, boolean>) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Entity-level grouping labels (unified import mode)
const ENTITY_LABELS: Record<string, string> = {
  client: "Clients",
  property: "Properties",
  mandate: "Mandates",
  unassigned: "Unassigned",
};

const ENTITY_ICONS: Record<string, typeof Users> = {
  client: Users,
  property: Building2,
  mandate: FileText,
  unassigned: HelpCircle,
};

const ENTITY_COLORS: Record<string, { tab: string; bg: string; border: string; text: string }> = {
  client: {
    tab: "data-[state=active]:bg-blue-600 data-[state=active]:text-white",
    bg: "bg-blue-50 dark:bg-blue-950/20",
    border: "border-blue-500",
    text: "text-blue-600 dark:text-blue-400",
  },
  property: {
    tab: "data-[state=active]:bg-emerald-600 data-[state=active]:text-white",
    bg: "bg-emerald-50 dark:bg-emerald-950/20",
    border: "border-emerald-500",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  mandate: {
    tab: "data-[state=active]:bg-violet-600 data-[state=active]:text-white",
    bg: "bg-violet-50 dark:bg-violet-950/20",
    border: "border-violet-500",
    text: "text-violet-600 dark:text-violet-400",
  },
  unassigned: {
    tab: "data-[state=active]:bg-muted-foreground data-[state=active]:text-background",
    bg: "bg-muted/30",
    border: "border-muted-foreground",
    text: "text-muted-foreground",
  },
};

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

// Default grouping key fields per entity
const DEFAULT_GROUPING_KEY_FIELDS: Record<string, string[]> = {
  client: ["primary_phone", "primary_email", "client_name"],
  property: ["street_address", "address", "property_name"],
  mandate: [],
};

// ---------------------------------------------------------------------------
// DroppableEntityTab — wraps each tab's content area as a drop target
// ---------------------------------------------------------------------------

function DroppableEntityTab({
  id,
  children,
  entityType,
}: {
  id: string;
  children: React.ReactNode;
  entityType: EntityType;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const colors = ENTITY_COLORS[entityType] ?? ENTITY_COLORS.unassigned;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[60px] transition-colors rounded-lg",
        isOver && colors.bg
      )}
    >
      {children}
      {/* Drop zone placeholder at bottom */}
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-4 text-center text-sm text-muted-foreground transition-colors mt-2",
          isOver
            ? `${colors.border} ${colors.bg}`
            : "border-muted"
        )}
      >
        Drag columns here to assign to {ENTITY_LABELS[entityType] ?? entityType}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DraggableColumnRow — wraps each column row to make it draggable
// ---------------------------------------------------------------------------

function DraggableColumnRow({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id });
  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "transition-shadow",
        isDragging && "opacity-50 shadow-lg z-50 relative"
      )}
      {...attributes}
    >
      <div className="flex items-center gap-0">
        <div
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 shrink-0"
          aria-label="Drag to move column"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FieldCombobox — per-row field selection dropdown (preserved from original)
// ---------------------------------------------------------------------------

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
  entityFilter,
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
  /** When set, only show fields belonging to this entity in the dropdown */
  entityFilter?: EntityType;
}) {
  const [open, setOpen] = useState(false);
  const [pendingReassign, setPendingReassign] = useState<{
    fieldKey: string;
    fromColumn: string;
  } | null>(null);

  // Detect unified mode: field definitions carry an `entity` property
  const isUnifiedMode = useMemo(
    () => fieldDefinitions.length > 0 && !!(fieldDefinitions[0] as any).entity,
    [fieldDefinitions]
  );

  // Filter field definitions by entity when entityFilter is set
  const filteredDefinitions = useMemo(() => {
    if (!entityFilter || entityFilter === "unassigned" || !isUnifiedMode) {
      return fieldDefinitions;
    }
    return fieldDefinitions.filter(
      (f) => (f as any).entity === entityFilter
    );
  }, [fieldDefinitions, entityFilter, isUnifiedMode]);

  // Group fields: in unified mode, nest group -> fields under each entity;
  // in legacy mode, group -> fields directly.
  const groupedFields = useMemo(() => {
    if (isUnifiedMode) {
      // entity -> group -> fields
      const byEntity: Record<string, Record<string, FieldDefinitionWithAliases[]>> = {};
      for (const field of filteredDefinitions) {
        const entity: string = (field as any).entity ?? "other";
        if (!byEntity[entity]) byEntity[entity] = {};
        if (!byEntity[entity][field.group]) byEntity[entity][field.group] = [];
        byEntity[entity][field.group].push(field);
      }
      return byEntity;
    }
    // Legacy: group -> fields (wrap in a null-entity namespace for uniform handling)
    const groups: Record<string, FieldDefinitionWithAliases[]> = {};
    for (const field of filteredDefinitions) {
      if (!groups[field.group]) groups[field.group] = [];
      groups[field.group].push(field);
    }
    return groups;
  }, [filteredDefinitions, isUnifiedMode]);

  // Reverse mapping: fieldKey -> csvColumn that owns it
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

  // Icon helper
  const renderFieldIcon = useCallback(
    (isSelected: boolean, isUsed: boolean) => {
      if (isSelected) return <Check className="mr-2 h-3.5 w-3.5 text-primary" />;
      if (isUsed) return <Link2 className="mr-2 h-3.5 w-3.5 text-muted-foreground" />;
      return <span className="mr-2 h-3.5 w-3.5" />;
    },
    []
  );

  // Shared CommandItem renderer
  const renderFieldItem = useCallback(
    (field: FieldDefinitionWithAliases, extraKeywords: string[] = []) => {
      const isSelected = currentValue === field.key;
      const isUsed = mappedFields.has(field.key) && !isSelected;
      const label = fieldsDict.fields[field.key] || field.key;
      return (
        <CommandItem
          key={field.key}
          value={field.key}
          keywords={[label, field.key, ...extraKeywords, ...(field.aliases || [])]}
          onSelect={() => handleFieldSelect(field.key)}
          className={cn(isUsed && "opacity-50")}
        >
          {renderFieldIcon(isSelected, isUsed)}
          <span className="flex-1">{label}</span>
          {extraKeywords[0] && (
            <span className="ml-1 text-[10px] text-muted-foreground/70">
              {extraKeywords[0]}
            </span>
          )}
          {field.required && (
            <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0">
              *
            </Badge>
          )}
        </CommandItem>
      );
    },
    [currentValue, mappedFields, fieldsDict, handleFieldSelect, renderFieldIcon]
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

              {/* All fields grouped -- entity-aware in unified mode */}
              {isUnifiedMode
                ? Object.entries(
                    groupedFields as Record<
                      string,
                      Record<string, FieldDefinitionWithAliases[]>
                    >
                  ).map(([entityKey, groupsForEntity], entityIdx) => (
                    <div key={entityKey}>
                      {entityIdx > 0 && <CommandSeparator />}
                      <CommandGroup heading={ENTITY_LABELS[entityKey] ?? entityKey}>
                        {Object.entries(groupsForEntity).map(([groupKey, fields]) =>
                          fields.map((field) =>
                            renderFieldItem(field, [fieldsDict.groups[groupKey] || groupKey])
                          )
                        )}
                      </CommandGroup>
                    </div>
                  ))
                : Object.entries(
                    groupedFields as Record<string, FieldDefinitionWithAliases[]>
                  ).map(([groupKey, fields]) => (
                    <CommandGroup
                      key={groupKey}
                      heading={fieldsDict.groups[groupKey] || groupKey}
                    >
                      {fields.map((field) => renderFieldItem(field))}
                    </CommandGroup>
                  ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Reassign confirmation dialog */}
      <AlertDialog
        open={!!pendingReassign}
        onOpenChange={(isOpen) => { if (!isOpen) setPendingReassign(null); }}
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

// ---------------------------------------------------------------------------
// GroupingKeyToggle — small key icon button on each column row
// ---------------------------------------------------------------------------

function GroupingKeyToggle({
  csvColumn,
  isActive,
  onToggle,
}: {
  csvColumn: string;
  isActive: boolean;
  onToggle: (csvColumn: string, active: boolean) => void;
}) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-7 w-7 shrink-0",
              isActive && "text-primary bg-primary/10"
            )}
            onClick={() => onToggle(csvColumn, !isActive)}
            aria-label={isActive ? "Remove as grouping key" : "Set as grouping key"}
            aria-pressed={isActive}
          >
            <KeyRound className={cn("h-3.5 w-3.5", isActive ? "text-primary" : "text-muted-foreground")} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px]">
          <p className="text-xs">
            {isActive
              ? "Active grouping key — rows with matching values in this column will be merged (deduplicated)"
              : "Set as grouping key for deduplication"}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ---------------------------------------------------------------------------
// Helper: determine entity for a column from its field mapping
// ---------------------------------------------------------------------------

function getEntityForField(
  fieldKey: string,
  fieldDefinitions: readonly FieldDefinitionWithAliases[]
): EntityType {
  const def = fieldDefinitions.find((f) => f.key === fieldKey);
  if (def && (def as any).entity) {
    return (def as any).entity as EntityType;
  }
  return "unassigned";
}

// ---------------------------------------------------------------------------
// Helper: initialize column entity assignments from match results
// ---------------------------------------------------------------------------

function initializeColumnEntities(
  csvHeaders: string[],
  fieldMapping: Record<string, string>,
  matchResults: Map<string, MatchResult>,
  fieldDefinitions: readonly FieldDefinitionWithAliases[]
): Record<string, EntityType> {
  const entities: Record<string, EntityType> = {};
  for (const header of csvHeaders) {
    const mapping = fieldMapping[header];
    if (mapping) {
      entities[header] = getEntityForField(mapping, fieldDefinitions);
    } else {
      // Check if the match result had an ambiguous match — keep as unassigned
      const matchResult = matchResults.get(header);
      if (matchResult?.ambiguous) {
        entities[header] = "unassigned";
      } else {
        entities[header] = "unassigned";
      }
    }
  }
  return entities;
}

// ---------------------------------------------------------------------------
// Helper: initialize default grouping keys
// ---------------------------------------------------------------------------

function initializeGroupingKeys(
  csvHeaders: string[],
  fieldMapping: Record<string, string>,
  fieldDefinitions: readonly FieldDefinitionWithAliases[]
): Record<string, boolean> {
  const keys: Record<string, boolean> = {};
  for (const header of csvHeaders) {
    const mapping = fieldMapping[header];
    if (!mapping) continue;
    const entity = getEntityForField(mapping, fieldDefinitions);
    const defaultFields = DEFAULT_GROUPING_KEY_FIELDS[entity] ?? [];
    if (defaultFields.includes(mapping)) {
      keys[header] = true;
    }
  }
  return keys;
}

// ---------------------------------------------------------------------------
// ColumnRow — renders one CSV column row inside a tab
// ---------------------------------------------------------------------------

function ColumnRow({
  header,
  fieldMapping,
  matchResults,
  fieldDefinitions,
  fieldsDict,
  mappedFields,
  sampleData,
  dict,
  entityFilter,
  groupingKeys,
  onMappingChange,
  onGroupingKeyToggle,
}: {
  header: string;
  fieldMapping: Record<string, string>;
  matchResults: Map<string, MatchResult>;
  fieldDefinitions: readonly FieldDefinitionWithAliases[];
  fieldsDict: FieldsDict;
  mappedFields: Set<string>;
  sampleData: Record<string, unknown>[];
  dict: TableMappingStepProps["dict"];
  entityFilter?: EntityType;
  groupingKeys?: Record<string, boolean>;
  onMappingChange: (csvColumn: string, targetField: string) => void;
  onGroupingKeyToggle?: (csvColumn: string, active: boolean) => void;
}) {
  const currentMapping = fieldMapping[header] || "";
  const matchResult = matchResults.get(header);
  const sampleValue = sampleData[0]?.[header];
  const sampleStr =
    sampleValue !== undefined && sampleValue !== null
      ? String(sampleValue)
      : "";
  const isMapped = !!currentMapping;

  const handleSelect = useCallback(
    (fieldKey: string) => {
      onMappingChange(header, fieldKey);
    },
    [header, onMappingChange]
  );

  const handleReassign = useCallback(
    (fromCol: string, fieldKey: string) => {
      onMappingChange(fromCol, "");
      onMappingChange(header, fieldKey);
    },
    [header, onMappingChange]
  );

  return (
    <div
      className={cn(
        "grid grid-cols-[2fr_2fr_3fr_36px_36px] gap-3 px-4 py-2.5 items-center transition-colors",
        isMapped ? "bg-success/5" : "bg-warning/5"
      )}
    >
      {/* Column Name + Confidence */}
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
        {sampleStr || "\u2014"}
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
        onSelect={handleSelect}
        onReassign={handleReassign}
        selectFieldLabel={dict.selectField}
        reassignDialogDict={dict.reassignDialog}
        entityFilter={entityFilter}
      />

      {/* Grouping key toggle */}
      <div className="flex justify-center">
        {isMapped && onGroupingKeyToggle ? (
          <GroupingKeyToggle
            csvColumn={header}
            isActive={!!groupingKeys?.[header]}
            onToggle={onGroupingKeyToggle}
          />
        ) : (
          <span className="h-7 w-7" />
        )}
      </div>

      {/* Clear / warning icon */}
      <div className="flex justify-center">
        {isMapped ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => handleSelect("")}
            aria-label="Clear mapping"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0" />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function TableMappingStep({
  dict,
  fieldsDict,
  csvHeaders,
  fieldMapping,
  matchResults,
  fieldDefinitions,
  sampleData,
  onMappingChange,
  columnEntities: externalColumnEntities,
  onColumnEntitiesChange,
  groupingKeys: externalGroupingKeys,
  onGroupingKeysChange,
}: TableMappingStepProps) {
  // Detect unified mode
  const isUnifiedMode = useMemo(
    () => fieldDefinitions.length > 0 && !!(fieldDefinitions[0] as any).entity,
    [fieldDefinitions]
  );

  // ------ Column entity assignments (internal state if not controlled) ------
  const [internalColumnEntities, setInternalColumnEntities] = useState<Record<string, EntityType>>(() =>
    initializeColumnEntities(csvHeaders, fieldMapping, matchResults, fieldDefinitions)
  );
  const columnEntities = externalColumnEntities ?? internalColumnEntities;
  const setColumnEntities = useCallback(
    (entities: Record<string, EntityType>) => {
      if (onColumnEntitiesChange) {
        onColumnEntitiesChange(entities);
      } else {
        setInternalColumnEntities(entities);
      }
    },
    [onColumnEntitiesChange]
  );

  // ------ Grouping keys (internal state if not controlled) ------
  const [internalGroupingKeys, setInternalGroupingKeys] = useState<Record<string, boolean>>(() =>
    initializeGroupingKeys(csvHeaders, fieldMapping, fieldDefinitions)
  );
  const groupingKeys = externalGroupingKeys ?? internalGroupingKeys;
  const setGroupingKeys = useCallback(
    (keys: Record<string, boolean>) => {
      if (onGroupingKeysChange) {
        onGroupingKeysChange(keys);
      } else {
        setInternalGroupingKeys(keys);
      }
    },
    [onGroupingKeysChange]
  );

  const handleGroupingKeyToggle = useCallback(
    (csvColumn: string, active: boolean) => {
      setGroupingKeys({ ...groupingKeys, [csvColumn]: active });
    },
    [groupingKeys, setGroupingKeys]
  );

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
    for (const header of csvHeaders) {
      if (fieldMapping[header]) {
        matched++;
      }
    }
    return { total: csvHeaders.length, matched, unmatched: csvHeaders.length - matched };
  }, [csvHeaders, fieldMapping]);

  // Show mandate banner when at least one mandate-entity field is mapped
  const hasMandateMapped = useMemo(() => {
    return Object.values(fieldMapping).some((target) => {
      const def = fieldDefinitions.find((f) => f.key === target);
      return (def as any)?.entity === "mandate";
    });
  }, [fieldMapping, fieldDefinitions]);

  // ------ Tab state ------
  const entityTabs = useMemo((): EntityType[] => {
    if (!isUnifiedMode) return [];
    const entities = new Set<EntityType>();
    for (const header of csvHeaders) {
      entities.add(columnEntities[header] ?? "unassigned");
    }
    // Always show unassigned if there are any
    return (["client", "property", "mandate", "unassigned"] as EntityType[]).filter(
      (e) => entities.has(e)
    );
  }, [csvHeaders, columnEntities, isUnifiedMode]);

  // Hidden entities that can be activated
  const hiddenEntities = useMemo((): EntityType[] => {
    if (!isUnifiedMode) return [];
    const allEntities: EntityType[] = ["client", "property", "mandate"];
    return allEntities.filter((e) => !entityTabs.includes(e));
  }, [entityTabs, isUnifiedMode]);

  const [activeTab, setActiveTab] = useState<string>(() => entityTabs[0] ?? "client");

  // Columns grouped by entity tab
  const columnsByEntity = useMemo(() => {
    const groups: Record<string, string[]> = {
      client: [],
      property: [],
      mandate: [],
      unassigned: [],
    };
    for (const header of csvHeaders) {
      const entity = columnEntities[header] ?? "unassigned";
      if (!groups[entity]) groups[entity] = [];
      groups[entity].push(header);
    }
    return groups;
  }, [csvHeaders, columnEntities]);

  // Unassigned count for badge
  const unassignedCount = columnsByEntity.unassigned?.length ?? 0;

  // ------ Drag-and-drop state ------
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px minimum drag distance to avoid accidental drags
      },
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveDragId(null);
      const { active, over } = event;

      if (!over) return;

      const draggedColumn = String(active.id);
      const targetEntity = String(over.id) as EntityType;
      const sourceEntity = columnEntities[draggedColumn] ?? "unassigned";

      // Only act if moving to a different entity
      if (sourceEntity === targetEntity) return;

      // Move column to target entity
      const newEntities = { ...columnEntities, [draggedColumn]: targetEntity };
      setColumnEntities(newEntities);

      // Clear field mapping when moving to a different entity
      if (fieldMapping[draggedColumn]) {
        onMappingChange(draggedColumn, "");
      }

      // Clear grouping key when moving
      if (groupingKeys[draggedColumn]) {
        setGroupingKeys({ ...groupingKeys, [draggedColumn]: false });
      }

      // Auto-switch to the target tab
      setActiveTab(targetEntity);
    },
    [columnEntities, fieldMapping, groupingKeys, onMappingChange, setColumnEntities, setGroupingKeys]
  );

  const draggedColumnName = activeDragId ?? "";

  // Handle adding a hidden entity tab
  const handleAddEntity = useCallback(
    (entity: EntityType) => {
      // Assign a dummy so the tab appears — user will drag columns into it
      // Just switch to the tab; columns can be dragged in
      setActiveTab(entity);
      // If no columns are in this entity yet, we need to force the tab to appear
      // by adding a temporary marker — we do this by setting state
      // Actually, just switching won't work if the tab doesn't exist.
      // We need at least one column there. Let's move the first unassigned column if any.
      const firstUnassigned = csvHeaders.find((h) => (columnEntities[h] ?? "unassigned") === "unassigned");
      if (firstUnassigned) {
        setColumnEntities({ ...columnEntities, [firstUnassigned]: entity });
        if (fieldMapping[firstUnassigned]) {
          onMappingChange(firstUnassigned, "");
        }
      }
    },
    [csvHeaders, columnEntities, fieldMapping, onMappingChange, setColumnEntities]
  );

  // ------ Legacy (non-unified) rendering ------
  if (!isUnifiedMode) {
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
                    isMapped ? "bg-success/5" : "bg-warning/5"
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
                    {sampleStr || "\u2014"}
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
                    onSelect={(fieldKey) => onMappingChange(header, fieldKey)}
                    onReassign={(fromCol, fieldKey) => {
                      onMappingChange(fromCol, "");
                      onMappingChange(header, fieldKey);
                    }}
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
                        onClick={() => onMappingChange(header, "")}
                        aria-label="Clear mapping"
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

  // ------ Unified mode: tabbed layout with drag-and-drop ------

  // Per-entity required fields
  const missingRequiredByEntity = useMemo(() => {
    const result: Record<string, FieldDefinitionWithAliases[]> = {};
    for (const entity of ["client", "property", "mandate"]) {
      const entityRequired = fieldDefinitions.filter(
        (f) => f.required && (f as any).entity === entity
      );
      const missing = entityRequired.filter((rf) => !mappedFields.has(rf.key));
      if (missing.length > 0) {
        result[entity] = missing;
      }
    }
    return result;
  }, [fieldDefinitions, mappedFields]);

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

      {/* Mandate fields banner */}
      {hasMandateMapped && (
        <Alert className="border-primary/30 bg-primary/5">
          <AlertDescription className="text-sm">
            Columns mapped to <strong>Mandate</strong> fields will automatically create and link a Mandate for each row.
          </AlertDescription>
        </Alert>
      )}

      {/* Tabbed entity-grouped mapping with DnD */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center gap-2">
            <TabsList>
              {entityTabs.map((entity) => {
                const Icon = ENTITY_ICONS[entity] ?? HelpCircle;
                const colors = ENTITY_COLORS[entity] ?? ENTITY_COLORS.unassigned;
                const count = columnsByEntity[entity]?.length ?? 0;
                return (
                  <TabsTrigger
                    key={entity}
                    value={entity}
                    className={cn("gap-1.5", colors.tab)}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    <span>{ENTITY_LABELS[entity]}</span>
                    {entity === "unassigned" && unassignedCount > 0 && (
                      <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                        {unassignedCount}
                      </Badge>
                    )}
                    {entity !== "unassigned" && (
                      <span className="text-xs opacity-70">({count})</span>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {/* + Add Entity button */}
            {hiddenEntities.length > 0 && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1 h-8">
                    <Plus className="h-3.5 w-3.5" />
                    Add Entity
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[160px] p-1" align="start">
                  {hiddenEntities.map((entity) => {
                    const Icon = ENTITY_ICONS[entity] ?? HelpCircle;
                    return (
                      <Button
                        key={entity}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start gap-2"
                        onClick={() => handleAddEntity(entity)}
                      >
                        <Icon className="h-4 w-4" aria-hidden="true" />
                        {ENTITY_LABELS[entity]}
                      </Button>
                    );
                  })}
                </PopoverContent>
              </Popover>
            )}
          </div>

          {/* Tab contents */}
          {entityTabs.map((entity) => {
            const columns = columnsByEntity[entity] ?? [];
            const entityMissing = missingRequiredByEntity[entity];

            return (
              <TabsContent key={entity} value={entity}>
                <DroppableEntityTab id={entity} entityType={entity}>
                  {/* Per-entity required fields warning */}
                  {entityMissing && entityMissing.length > 0 && (
                    <div className="flex items-start gap-3 p-3 rounded-lg border border-warning/30 bg-warning/10 mb-2">
                      <AlertCircle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                      <div>
                        <p className="font-medium text-xs">
                          Missing required: {entityMissing
                            .map((f) => fieldsDict.fields[f.key] || f.key)
                            .join(", ")}
                        </p>
                      </div>
                    </div>
                  )}

                  {columns.length > 0 ? (
                    <div className="border rounded-lg overflow-hidden">
                      {/* Table Header */}
                      <div className="grid grid-cols-[2fr_2fr_3fr_36px_36px] gap-3 px-4 py-2.5 bg-muted/50 border-b text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        <span>{dict.csvColumn}</span>
                        <span>{dict.sampleData}</span>
                        <span>{dict.targetField}</span>
                        <span className="text-center" aria-label="Grouping key">
                          <KeyRound className="h-3 w-3 mx-auto" aria-hidden="true" />
                        </span>
                        <span />
                      </div>

                      {/* Column rows */}
                      <div className="divide-y">
                        {columns.map((header) => (
                          <DraggableColumnRow key={header} id={header}>
                            <ColumnRow
                              header={header}
                              fieldMapping={fieldMapping}
                              matchResults={matchResults}
                              fieldDefinitions={fieldDefinitions}
                              fieldsDict={fieldsDict}
                              mappedFields={mappedFields}
                              sampleData={sampleData}
                              dict={dict}
                              entityFilter={entity}
                              groupingKeys={groupingKeys}
                              onMappingChange={onMappingChange}
                              onGroupingKeyToggle={handleGroupingKeyToggle}
                            />
                          </DraggableColumnRow>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      No columns assigned to {ENTITY_LABELS[entity]}. Drag columns here from other tabs.
                    </div>
                  )}
                </DroppableEntityTab>
              </TabsContent>
            );
          })}
        </Tabs>

        {/* Drag Overlay — compact chip shown while dragging */}
        <DragOverlay>
          {activeDragId ? (
            <div className="flex items-center gap-2 px-3 py-2 bg-background border rounded-lg shadow-xl text-sm font-medium">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
              <span className="truncate max-w-[200px]">{draggedColumnName}</span>
              {fieldMapping[draggedColumnName] && (
                <Badge variant="outline" className="text-[10px] shrink-0">
                  {fieldsDict.fields[fieldMapping[draggedColumnName]] || fieldMapping[draggedColumnName]}
                </Badge>
              )}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
