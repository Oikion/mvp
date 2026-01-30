"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  useDraggable,
  useDroppable,
  DragStartEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Check,
  AlertCircle,
  GripVertical,
  X,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Link2,
  Unlink,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MatchResult, MatchConfidence, FieldDefinitionWithAliases } from "@/lib/import/fuzzy-matcher";

interface FieldsDict {
  groups: Record<string, string>;
  fields: Record<string, string>;
  enums?: Record<string, Record<string, string>>;
}

interface TwoPanelMappingStepProps {
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
    // New keys for two-panel UI
    sourceColumns?: string;
    targetFields?: string;
    dragToMap?: string;
    clickToUnmap?: string;
    highConfidence?: string;
    mediumConfidence?: string;
    lowConfidence?: string;
    autoMatchedCount?: string;
    unmappedCount?: string;
  };
  fieldsDict: FieldsDict;
  csvHeaders: string[];
  fieldMapping: Record<string, string>;
  matchResults: Map<string, MatchResult>;
  fieldDefinitions: readonly FieldDefinitionWithAliases[];
  sampleData: Record<string, unknown>[];
  onMappingChange: (csvColumn: string, targetField: string) => void;
}

// Draggable source column card
function DraggableSourceCard({
  column,
  matchResult,
  sampleValue,
  isMatched,
  onUnmap,
  dict,
}: {
  column: string;
  matchResult: MatchResult;
  sampleValue: string;
  isMatched: boolean;
  onUnmap: () => void;
  dict: TwoPanelMappingStepProps["dict"];
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `source-${column}`,
    data: { column, type: "source" },
    disabled: isMatched,
  });

  const confidenceColors: Record<MatchConfidence, string> = {
    high: "bg-success/10 border-success/30 text-green-700 dark:text-green-400",
    medium: "bg-warning/10 border-warning/30 text-yellow-700 dark:text-yellow-400",
    low: "bg-warning/10 border-orange-500/30 text-orange-700 dark:text-orange-400",
    none: "bg-muted/50 border-muted-foreground/20",
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative flex items-center gap-2 p-3 rounded-lg border transition-all",
        isDragging && "opacity-50",
        isMatched
          ? confidenceColors[matchResult.confidence]
          : "bg-card border-border hover:border-primary/50 cursor-grab active:cursor-grabbing"
      )}
      {...attributes}
      {...(isMatched ? {} : listeners)}
    >
      {!isMatched && (
        <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{column}</span>
          {isMatched && matchResult.matchType !== "none" && (
            <Badge
              variant="outline"
              className={cn(
                "text-xs shrink-0",
                matchResult.matchType === "exact" && "border-success text-success",
                matchResult.matchType === "alias" && "border-primary text-primary",
                matchResult.matchType === "fuzzy" && "border-warning text-warning",
                matchResult.matchType === "partial" && "border-orange-500 text-warning"
              )}
            >
              {matchResult.matchType === "exact" && <Check className="h-3 w-3 mr-1" />}
              {matchResult.matchType === "alias" && <Sparkles className="h-3 w-3 mr-1" />}
              {matchResult.score}%
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {sampleValue || "-"}
        </p>
      </div>
      {isMatched && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onUnmap();
          }}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

// Droppable target field zone
function DroppableTargetField({
  field,
  label,
  description,
  isRequired,
  mappedSource,
  matchResult,
  isOver,
  dict,
}: {
  field: string;
  label: string;
  description?: string;
  isRequired: boolean;
  mappedSource: string | null;
  matchResult: MatchResult | null;
  isOver: boolean;
  dict: TwoPanelMappingStepProps["dict"];
}) {
  const { setNodeRef, isOver: isDroppableOver } = useDroppable({
    id: `target-${field}`,
    data: { field, type: "target" },
    disabled: !!mappedSource,
  });

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            ref={setNodeRef}
            className={cn(
              "flex items-center gap-2 p-2 rounded-md border transition-all min-h-[44px]",
              mappedSource
                ? "bg-primary/5 border-primary/30"
                : isDroppableOver
                ? "bg-primary/10 border-primary border-dashed"
                : "bg-muted/30 border-dashed border-muted-foreground/30 hover:border-primary/50"
            )}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className={cn("text-sm", mappedSource ? "font-medium" : "text-muted-foreground")}>
                  {label}
                </span>
                {isRequired && (
                  <Badge variant="secondary" className="text-[10px] px-1 py-0">
                    *
                  </Badge>
                )}
                {description && (
                  <Info className="h-3 w-3 text-muted-foreground" />
                )}
              </div>
              {mappedSource && (
                <div className="flex items-center gap-1 mt-0.5">
                  <Link2 className="h-3 w-3 text-primary" />
                  <span className="text-xs text-primary truncate">{mappedSource}</span>
                </div>
              )}
            </div>
            {!mappedSource && (
              <Unlink className="h-4 w-4 text-muted-foreground/50 shrink-0" />
            )}
          </div>
        </TooltipTrigger>
        {description && (
          <TooltipContent side="right" className="max-w-[250px]">
            <p className="text-xs">{description}</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}

// Group of target fields
function TargetFieldGroup({
  groupKey,
  groupLabel,
  fields,
  fieldsDict,
  fieldMapping,
  matchResults,
  hasMissingRequired,
  dict,
}: {
  groupKey: string;
  groupLabel: string;
  fields: FieldDefinitionWithAliases[];
  fieldsDict: FieldsDict;
  fieldMapping: Record<string, string>;
  matchResults: Map<string, MatchResult>;
  hasMissingRequired: boolean;
  dict: TwoPanelMappingStepProps["dict"];
}) {
  // Start expanded if there are missing required fields
  const [isOpen, setIsOpen] = useState(hasMissingRequired);

  // Create reverse mapping (target -> source)
  const reverseMapping = useMemo(() => {
    const map: Record<string, string> = {};
    Object.entries(fieldMapping).forEach(([source, target]) => {
      if (target) map[target] = source;
    });
    return map;
  }, [fieldMapping]);

  const mappedCount = fields.filter((f) => reverseMapping[f.key]).length;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-md hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-2">
          {isOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <span className="font-medium text-sm">{groupLabel}</span>
          {hasMissingRequired && (
            <AlertCircle className="h-4 w-4 text-warning" />
          )}
        </div>
        <Badge variant="secondary" className="text-xs">
          {mappedCount}/{fields.length}
        </Badge>
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-6 pr-2 pb-2 space-y-1.5">
        {fields.map((field) => {
          const mappedSource = reverseMapping[field.key] || null;
          const matchResult = mappedSource
            ? matchResults.get(mappedSource) || null
            : null;

          return (
            <DroppableTargetField
              key={field.key}
              field={field.key}
              label={fieldsDict.fields[field.key] || field.key}
              description={field.description}
              isRequired={field.required}
              mappedSource={mappedSource}
              matchResult={matchResult}
              isOver={false}
              dict={dict}
            />
          );
        })}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function TwoPanelMappingStep({
  dict,
  fieldsDict,
  csvHeaders,
  fieldMapping,
  matchResults,
  fieldDefinitions,
  sampleData,
  onMappingChange,
}: TwoPanelMappingStepProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Group fields by their group property
  const groupedFields = useMemo(() => {
    const groups: Record<string, FieldDefinitionWithAliases[]> = {};
    fieldDefinitions.forEach((field) => {
      if (!groups[field.group]) {
        groups[field.group] = [];
      }
      groups[field.group].push(field);
    });
    return groups;
  }, [fieldDefinitions]);

  // Get already mapped fields
  const mappedFields = useMemo(() => {
    return new Set(Object.values(fieldMapping).filter(Boolean));
  }, [fieldMapping]);

  // Create reverse mapping (target -> source)
  const reverseMapping = useMemo(() => {
    const map: Record<string, string> = {};
    Object.entries(fieldMapping).forEach(([source, target]) => {
      if (target) map[target] = source;
    });
    return map;
  }, [fieldMapping]);

  // Check required fields
  const requiredFields = useMemo(() => {
    return fieldDefinitions.filter((f) => f.required);
  }, [fieldDefinitions]);

  const missingRequired = useMemo(() => {
    return requiredFields.filter((rf) => !mappedFields.has(rf.key));
  }, [requiredFields, mappedFields]);

  // Statistics
  const stats = useMemo(() => {
    let matched = 0;
    let highConfidence = 0;
    let mediumConfidence = 0;
    let lowConfidence = 0;

    csvHeaders.forEach((header) => {
      const mapping = fieldMapping[header];
      if (mapping) {
        matched++;
        const result = matchResults.get(header);
        if (result) {
          switch (result.confidence) {
            case "high":
              highConfidence++;
              break;
            case "medium":
              mediumConfidence++;
              break;
            case "low":
              lowConfidence++;
              break;
          }
        }
      }
    });

    return {
      total: csvHeaders.length,
      matched,
      unmatched: csvHeaders.length - matched,
      highConfidence,
      mediumConfidence,
      lowConfidence,
    };
  }, [csvHeaders, fieldMapping, matchResults]);

  // Separate matched and unmatched columns
  const { matchedColumns, unmatchedColumns } = useMemo(() => {
    const matched: string[] = [];
    const unmatched: string[] = [];

    csvHeaders.forEach((header) => {
      if (fieldMapping[header]) {
        matched.push(header);
      } else {
        unmatched.push(header);
      }
    });

    return { matchedColumns: matched, unmatchedColumns: unmatched };
  }, [csvHeaders, fieldMapping]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;

      if (!over) return;

      const sourceColumn = (active.data.current as { column: string })?.column;
      const targetField = over.id.toString().replace("target-", "");

      if (sourceColumn && targetField && !reverseMapping[targetField]) {
        onMappingChange(sourceColumn, targetField);
      }
    },
    [onMappingChange, reverseMapping]
  );

  const handleUnmap = useCallback(
    (column: string) => {
      onMappingChange(column, "");
    },
    [onMappingChange]
  );

  const getGroupLabel = (groupKey: string) => {
    return fieldsDict.groups[groupKey] || groupKey;
  };

  // Get the dragged item for overlay
  const activeColumn = activeId?.replace("source-", "");

  return (
    <div ref={containerRef} className="h-full flex flex-col gap-4">
      {/* Statistics Bar */}
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-success" />
            <span>{dict.highConfidence || "High"}: {stats.highConfidence}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-warning" />
            <span>{dict.mediumConfidence || "Medium"}: {stats.mediumConfidence}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-warning" />
            <span>{dict.lowConfidence || "Low"}: {stats.lowConfidence}</span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-success dark:text-green-400">
            <Check className="inline h-4 w-4 mr-1" />
            {dict.autoMatchedCount?.replace("{count}", String(stats.matched)) || `${stats.matched} mapped`}
          </span>
          <span className="text-muted-foreground">
            <Unlink className="inline h-4 w-4 mr-1" />
            {dict.unmappedCount?.replace("{count}", String(stats.unmatched)) || `${stats.unmatched} unmapped`}
          </span>
        </div>
      </div>

      {/* Missing Required Fields Warning */}
      {missingRequired.length > 0 && (
        <Card className="border-warning/30 bg-warning/10">
          <CardContent className="flex items-start gap-3 py-3">
            <AlertCircle className="h-5 w-5 text-warning mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-sm">
                {dict.required}: {missingRequired.length} field(s) not mapped
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {missingRequired.map((f) => fieldsDict.fields[f.key] || f.key).join(", ")}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Two-Panel Layout */}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
          {/* Left Panel - Source Columns */}
          <Card className="flex flex-col min-h-0">
            <CardHeader className="pb-2 shrink-0">
              <CardTitle className="text-sm flex items-center gap-2">
                {dict.sourceColumns || dict.csvColumn}
                <Badge variant="secondary">{csvHeaders.length}</Badge>
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {dict.dragToMap || "Drag columns to map them to target fields"}
              </p>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 p-0">
              <ScrollArea className="h-full px-4 pb-4">
                <div className="space-y-4">
                  {/* Matched columns */}
                  {matchedColumns.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide">
                        <Check className="h-3 w-3" />
                        <span>{dict.autoMapped} ({matchedColumns.length})</span>
                      </div>
                      <div className="space-y-1.5">
                        {matchedColumns.map((header) => {
                          const result = matchResults.get(header) || {
                            sourceColumn: header,
                            targetField: fieldMapping[header],
                            confidence: "none" as MatchConfidence,
                            score: 0,
                            matchType: "none" as const,
                          };
                          const sampleValue = sampleData[0]?.[header];

                          return (
                            <DraggableSourceCard
                              key={header}
                              column={header}
                              matchResult={result}
                              sampleValue={sampleValue !== undefined ? String(sampleValue) : ""}
                              isMatched={true}
                              onUnmap={() => handleUnmap(header)}
                              dict={dict}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Unmatched columns */}
                  {unmatchedColumns.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide">
                        <Unlink className="h-3 w-3" />
                        <span>{dict.unmapped} ({unmatchedColumns.length})</span>
                      </div>
                      <div className="space-y-1.5">
                        {unmatchedColumns.map((header) => {
                          const result = matchResults.get(header) || {
                            sourceColumn: header,
                            targetField: null,
                            confidence: "none" as MatchConfidence,
                            score: 0,
                            matchType: "none" as const,
                          };
                          const sampleValue = sampleData[0]?.[header];

                          return (
                            <DraggableSourceCard
                              key={header}
                              column={header}
                              matchResult={result}
                              sampleValue={sampleValue !== undefined ? String(sampleValue) : ""}
                              isMatched={false}
                              onUnmap={() => {}}
                              dict={dict}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Right Panel - Target Fields */}
          <Card className="flex flex-col min-h-0">
            <CardHeader className="pb-2 shrink-0">
              <CardTitle className="text-sm flex items-center gap-2">
                {dict.targetFields || dict.targetField}
                <Badge variant="secondary">{fieldDefinitions.length}</Badge>
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {dict.clickToUnmap || "Drop source columns here"}
              </p>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 p-0">
              <ScrollArea className="h-full px-4 pb-4">
                <div className="space-y-2">
                  {Object.entries(groupedFields).map(([groupKey, fields]) => {
                    const hasMissingRequired = fields.some(
                      (f) => f.required && !mappedFields.has(f.key)
                    );

                    return (
                      <TargetFieldGroup
                        key={groupKey}
                        groupKey={groupKey}
                        groupLabel={getGroupLabel(groupKey)}
                        fields={fields}
                        fieldsDict={fieldsDict}
                        fieldMapping={fieldMapping}
                        matchResults={matchResults}
                        hasMissingRequired={hasMissingRequired}
                        dict={dict}
                      />
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeId && activeColumn && (
            <div className="p-3 rounded-lg border bg-card shadow-lg">
              <span className="font-medium text-sm">{activeColumn}</span>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}



