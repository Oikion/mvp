"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  CheckCircle2,
  Circle,
  AlertTriangle,
  Users,
  Building2,
  FileText,
  ChevronDown,
  ChevronRight,
  Pencil,
  Check,
  X,
  Eye,
  UserCircle,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ValidatedRow {
  rowIndex: number;
  clientRow: Record<string, unknown> | null;
  propertyRow: Record<string, unknown> | null;
  mandateRow: Record<string, unknown> | null;
  hasClient: boolean;
  hasProperty: boolean;
  hasMandate: boolean;
  clientDedupKey?: string;
  propertyDedupKey?: string;
}

interface ReviewStepProps {
  validatedRows: ValidatedRow[];
  skippedRows: Set<number>;
  entityApprovals: Record<string, boolean>;
  onEntityApprovalsChange: (approvals: Record<string, boolean>) => void;
  assignedTo: string | null;
  onAssignedToChange: (userId: string | null) => void;
  onRowEdit: (rowIndex: number, field: string, value: unknown) => void;
  dict: Record<string, string>;
}

// Legacy props for backward compatibility with ImportWizardSteps
interface LegacyReviewStepProps {
  dict: {
    previewTitle: string;
    previewDescription: string;
    readyToImport: string;
    willSkip: string;
    confirmImport: string;
  };
  fieldsDict: {
    groups: Record<string, string>;
    fields: Record<string, string>;
    enums?: Record<string, Record<string, string>>;
  };
  data: Record<string, unknown>[];
  fieldMapping: Record<string, string>;
  errorCount: number;
  entityType: "client" | "property" | "mandate";
  entityCounts?: { clients: number; properties: number; mandates: number };
}

type ReviewStepCombinedProps = ReviewStepProps | LegacyReviewStepProps;

// Type guard to distinguish new vs legacy props
function isNewProps(props: ReviewStepCombinedProps): props is ReviewStepProps {
  return "validatedRows" in props;
}

// ─── Entity type definition ──────────────────────────────────────────────────

type EntityType = "clients" | "properties" | "mandates";

const ENTITY_ORDER: EntityType[] = ["clients", "properties", "mandates"];

const ENTITY_ICONS: Record<EntityType, typeof Users> = {
  clients: Users,
  properties: Building2,
  mandates: FileText,
};

const ENTITY_LABELS: Record<EntityType, string> = {
  clients: "Clients",
  properties: "Properties",
  mandates: "Mandates",
};

// ─── Smart Sampling ──────────────────────────────────────────────────────────

function getSmartSample<T>(items: T[], sampleSize = 10, seed = 42): T[] {
  if (items.length <= sampleSize) return items;
  const first3 = items.slice(0, 3);
  const last3 = items.slice(-3);
  const middle = items.slice(3, -3);

  // Simple seeded random (mulberry32)
  let s = seed;
  const rng = () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const middleCount = Math.min(sampleSize - 6, middle.length);
  const middleSample: T[] = [];
  const copy = [...middle];
  for (let i = 0; i < middleCount; i++) {
    const idx = Math.floor(rng() * copy.length);
    middleSample.push(copy.splice(idx, 1)[0]);
  }
  return [...first3, ...middleSample, ...last3];
}

// ─── Inline Editable Cell ────────────────────────────────────────────────────

interface InlineEditCellProps {
  value: unknown;
  onSave: (value: string) => void;
}

function InlineEditCell({ value, onSave }: InlineEditCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const displayValue = formatValue(value);

  const handleStartEdit = () => {
    setEditValue(value?.toString() ?? "");
    setIsEditing(true);
  };

  const handleSave = () => {
    const trimmed = editValue.trim();
    if (trimmed !== (value?.toString() ?? "").trim()) {
      onSave(trimmed);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value?.toString() ?? "");
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div
        className="flex items-center gap-1 min-w-[120px]"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <Input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          className="h-7 w-full text-sm px-2"
        />
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 text-success hover:text-success hover:bg-success/10"
          onMouseDown={(e) => {
            e.preventDefault();
            handleSave();
          }}
        >
          <Check className="h-3 w-3" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
          onMouseDown={(e) => {
            e.preventDefault();
            handleCancel();
          }}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        handleStartEdit();
      }}
      className="group flex items-center gap-1.5 whitespace-nowrap cursor-pointer hover:bg-muted/50 rounded px-1.5 py-0.5 -mx-1.5 transition-colors text-left"
    >
      <span className="truncate max-w-[160px]">{displayValue}</span>
      <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
    </button>
  );
}

// ─── Cross-Entity Badge ──────────────────────────────────────────────────────

interface CrossEntityBadgesProps {
  items: string[];
  variant: "success" | "info" | "purple";
  emptyText?: string;
  warningText?: string;
}

function CrossEntityBadges({
  items,
  variant,
  emptyText = "\u2014",
  warningText,
}: CrossEntityBadgesProps) {
  const [expanded, setExpanded] = useState(false);

  if (warningText) {
    return (
      <div className="flex items-center gap-1">
        <AlertTriangle className="h-3 w-3 text-warning flex-shrink-0" />
        <span className="text-xs text-warning">{warningText}</span>
      </div>
    );
  }

  if (items.length === 0) {
    return <span className="text-muted-foreground text-sm">{emptyText}</span>;
  }

  if (items.length === 1) {
    return (
      <Badge variant={variant} size="sm">
        {items[0]}
      </Badge>
    );
  }

  const visible = expanded ? items : items.slice(0, 1);
  const remaining = items.length - 1;

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {visible.map((item, i) => (
        <Badge key={i} variant={variant} size="sm">
          {item}
        </Badge>
      ))}
      {!expanded && remaining > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(true);
          }}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          +{remaining} more
        </button>
      )}
      {expanded && items.length > 2 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(false);
          }}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          show less
        </button>
      )}
    </div>
  );
}

// ─── Format helpers ──────────────────────────────────────────────────────────

function formatValue(value: unknown): string {
  if (value === undefined || value === null || value === "") return "\u2014";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return value.toLocaleString();
  return String(value);
}

function getClientName(row: Record<string, unknown> | null): string {
  if (!row) return "";
  return String(row.client_name ?? row.full_name ?? "").trim();
}

function getPropertyName(row: Record<string, unknown> | null): string {
  if (!row) return "";
  return String(row.property_name ?? "").trim();
}

// ─── Entity Step Component ───────────────────────────────────────────────────

interface EntityStepProps {
  entityType: EntityType;
  items: Array<{
    originalIndex: number;
    data: Record<string, unknown>;
    linkedItems: Record<string, string[]>;
    warnings: string[];
  }>;
  totalRawCount: number;
  deduplicatedCount: number;
  isApproved: boolean;
  onApprove: () => void;
  onRowEdit: (rowIndex: number, field: string, value: unknown) => void;
}

function EntityStep({
  entityType,
  items,
  totalRawCount,
  deduplicatedCount,
  isApproved,
  onApprove,
  onRowEdit,
}: EntityStepProps) {
  const [showAll, setShowAll] = useState(false);
  const Icon = ENTITY_ICONS[entityType];
  const label = ENTITY_LABELS[entityType];

  const sampleItems = useMemo(
    () => (showAll ? items : getSmartSample(items, 10)),
    [items, showAll],
  );

  const columns = useMemo(() => {
    switch (entityType) {
      case "clients":
        return {
          fields: ["client_name", "primary_phone", "primary_email", "client_type"] as const,
          labels: ["Name", "Phone", "Email", "Type"],
          crossEntityLabel: "Linked Properties",
          crossEntityKey: "linkedProperties" as const,
          crossEntityVariant: "success" as const,
        };
      case "properties":
        return {
          fields: ["property_name", "property_type", "price", "address_city"] as const,
          labels: ["Name", "Type", "Price", "City"],
          crossEntityLabel: "Linked Client",
          crossEntityKey: "linkedClient" as const,
          crossEntityVariant: "info" as const,
        };
      case "mandates":
        return {
          fields: ["title", "mandate_transaction_type", "budget_min"] as const,
          labels: ["Title", "Transaction Type", "Budget"],
          crossEntityLabel: "Client",
          crossEntityKey: "linkedClient" as const,
          crossEntityVariant: "info" as const,
        };
    }
  }, [entityType]);

  const summaryLine = useMemo(() => {
    const dedup = deduplicatedCount > 0
      ? ` (${deduplicatedCount} deduplicated from ${totalRawCount} rows)`
      : "";
    return `${items.length} ${label.toLowerCase()} will be created${dedup}`;
  }, [items.length, deduplicatedCount, totalRawCount, label]);

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{summaryLine}</p>

      {/* Preview Table */}
      <Card>
        <CardHeader className="py-2 px-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Eye className="h-3 w-3" aria-hidden="true" />
              {showAll
                ? `Showing all ${items.length} rows`
                : `Showing ${sampleItems.length} of ${items.length} rows (sampled from beginning, middle, and end)`}
            </span>
            {items.length > 10 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setShowAll((prev) => !prev)}
              >
                {showAll ? "Show Sample" : "Show All"}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">#</TableHead>
                  {columns.labels.map((label) => (
                    <TableHead key={label} className="whitespace-nowrap">
                      {label}
                    </TableHead>
                  ))}
                  <TableHead className="whitespace-nowrap">
                    {columns.crossEntityLabel}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sampleItems.map((item, idx) => (
                  <TableRow key={item.originalIndex}>
                    <TableCell className="text-muted-foreground text-xs">
                      {idx + 1}
                    </TableCell>
                    {columns.fields.map((field) => (
                      <TableCell key={field}>
                        <InlineEditCell
                          value={item.data[field]}
                          onSave={(val) =>
                            onRowEdit(item.originalIndex, field, val)
                          }
                        />
                      </TableCell>
                    ))}
                    <TableCell>
                      {item.warnings.length > 0 ? (
                        <CrossEntityBadges
                          items={[]}
                          variant={columns.crossEntityVariant}
                          warningText={item.warnings[0]}
                        />
                      ) : (
                        <CrossEntityBadges
                          items={
                            item.linkedItems[columns.crossEntityKey] ?? []
                          }
                          variant={columns.crossEntityVariant}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Approve Button */}
      <div className="flex justify-end">
        <Button
          onClick={onApprove}
          variant={isApproved ? "outline" : "default"}
          className={cn(
            "gap-2",
            isApproved && "border-success text-success hover:bg-success/10",
          )}
        >
          {isApproved ? (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Approved
            </>
          ) : (
            <>
              <Icon className="h-4 w-4" aria-hidden="true" />
              Approve {label} ({items.length})
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ─── Main ReviewStep (New Implementation) ────────────────────────────────────

function ReviewStepNew({
  validatedRows,
  skippedRows,
  entityApprovals,
  onEntityApprovalsChange,
  assignedTo,
  onAssignedToChange,
  onRowEdit,
}: ReviewStepProps) {
  const [expandedEntity, setExpandedEntity] = useState<EntityType | null>(null);

  // ── Derive entity data from validatedRows ──────────────────────────────────

  const entityData = useMemo(() => {
    // Collect unique entities by dedup key
    const clientMap = new Map<
      string,
      { data: Record<string, unknown>; originalIndex: number }
    >();
    const propertyMap = new Map<
      string,
      { data: Record<string, unknown>; originalIndex: number }
    >();
    const mandateList: Array<{
      data: Record<string, unknown>;
      originalIndex: number;
    }> = [];

    // Cross-entity relationship maps
    const clientToProperties = new Map<string, string[]>();
    const propertyToClient = new Map<string, string>();
    const mandateToClient = new Map<number, string>();
    const mandateToProperty = new Map<number, string>();

    // Track raw counts for dedup display
    let clientRawCount = 0;
    let propertyRawCount = 0;

    for (const row of validatedRows) {
      if (skippedRows.has(row.rowIndex)) continue;

      const clientKey = row.clientDedupKey;
      const propertyKey = row.propertyDedupKey;

      // Collect clients (deduped by key)
      if (row.hasClient && row.clientRow) {
        clientRawCount++;
        if (clientKey && !clientMap.has(clientKey)) {
          clientMap.set(clientKey, {
            data: row.clientRow,
            originalIndex: row.rowIndex,
          });
        }
        // Build client-to-properties map
        if (clientKey && row.hasProperty && row.propertyRow) {
          const propName = getPropertyName(row.propertyRow);
          if (propName) {
            const existing = clientToProperties.get(clientKey) ?? [];
            if (!existing.includes(propName)) {
              existing.push(propName);
              clientToProperties.set(clientKey, existing);
            }
          }
        }
      }

      // Collect properties (deduped by key)
      if (row.hasProperty && row.propertyRow) {
        propertyRawCount++;
        if (propertyKey && !propertyMap.has(propertyKey)) {
          propertyMap.set(propertyKey, {
            data: row.propertyRow,
            originalIndex: row.rowIndex,
          });
        }
        // Build property-to-client map
        if (propertyKey && row.hasClient && row.clientRow) {
          const cName = getClientName(row.clientRow);
          if (cName) {
            propertyToClient.set(propertyKey, cName);
          }
        }
      }

      // Collect mandates (no dedup — each row is unique)
      if (row.hasMandate && row.mandateRow) {
        mandateList.push({
          data: row.mandateRow,
          originalIndex: row.rowIndex,
        });
        if (row.hasClient && row.clientRow) {
          mandateToClient.set(row.rowIndex, getClientName(row.clientRow));
        }
        if (row.hasProperty && row.propertyRow) {
          mandateToProperty.set(
            row.rowIndex,
            getPropertyName(row.propertyRow),
          );
        }
      }
    }

    // Build skip-cascade warnings for properties whose client was skipped
    const skippedClientKeys = new Set<string>();
    for (const row of validatedRows) {
      if (
        skippedRows.has(row.rowIndex) &&
        row.hasClient &&
        row.clientDedupKey
      ) {
        skippedClientKeys.add(row.clientDedupKey);
      }
    }

    // Assemble final entity items
    const clients: EntityStepProps["items"] = [];
    Array.from(clientMap.entries()).forEach(([key, entry]) => {
      clients.push({
        originalIndex: entry.originalIndex,
        data: entry.data,
        linkedItems: {
          linkedProperties: clientToProperties.get(key) ?? [],
        },
        warnings: [],
      });
    });

    const properties: EntityStepProps["items"] = [];
    Array.from(propertyMap.entries()).forEach(([key, entry]) => {
      const linkedClientName = propertyToClient.get(key);
      // Check if this property's client was skipped
      const row = validatedRows.find(
        (r) =>
          r.propertyDedupKey === key && r.hasClient && r.clientDedupKey,
      );
      const clientWasSkipped =
        row?.clientDedupKey && skippedClientKeys.has(row.clientDedupKey);

      properties.push({
        originalIndex: entry.originalIndex,
        data: entry.data,
        linkedItems: {
          linkedClient: linkedClientName ? [linkedClientName] : [],
        },
        warnings: clientWasSkipped
          ? ["Client was skipped \u2014 will import without client link"]
          : [],
      });
    });

    const mandates: EntityStepProps["items"] = mandateList.map((entry) => {
      const clientName = mandateToClient.get(entry.originalIndex);
      const propertyName = mandateToProperty.get(entry.originalIndex);
      return {
        originalIndex: entry.originalIndex,
        data: entry.data,
        linkedItems: {
          linkedClient: clientName ? [clientName] : [],
          linkedProperty: propertyName ? [propertyName] : [],
        },
        warnings: [],
      };
    });

    return {
      clients,
      properties,
      mandates,
      clientRawCount,
      propertyRawCount,
      clientDedupCount:
        clientRawCount > clients.length
          ? clientRawCount - clients.length
          : 0,
      propertyDedupCount:
        propertyRawCount > properties.length
          ? propertyRawCount - properties.length
          : 0,
    };
  }, [validatedRows, skippedRows]);

  // Determine which entities are detected (have items)
  const detectedEntities = useMemo(() => {
    return ENTITY_ORDER.filter((type) => entityData[type].length > 0);
  }, [entityData]);

  // Auto-expand the first non-approved entity on mount
  useEffect(() => {
    if (expandedEntity === null && detectedEntities.length > 0) {
      const firstUnapproved = detectedEntities.find(
        (e) => !entityApprovals[e],
      );
      setExpandedEntity(firstUnapproved ?? detectedEntities[0]);
    }
  }, [detectedEntities, entityApprovals, expandedEntity]);

  const allApproved =
    detectedEntities.length > 0 &&
    detectedEntities.every((e) => entityApprovals[e]);

  const handleApprove = useCallback(
    (entity: EntityType) => {
      const wasApproved = entityApprovals[entity];
      const newApprovals = { ...entityApprovals, [entity]: !wasApproved };
      onEntityApprovalsChange(newApprovals);

      if (!wasApproved) {
        // Just approved — collapse and expand next unapproved
        const nextUnapproved = detectedEntities.find(
          (e) => e !== entity && !newApprovals[e],
        );
        setExpandedEntity(nextUnapproved ?? null);
      } else {
        // Un-approved — expand this entity for editing
        setExpandedEntity(entity);
      }
    },
    [entityApprovals, onEntityApprovalsChange, detectedEntities],
  );

  const toggleExpand = useCallback(
    (entity: EntityType) => {
      setExpandedEntity((prev) => (prev === entity ? null : entity));
    },
    [],
  );

  return (
    <div className="space-y-5">
      {/* Bulk Assignment Dropdown */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <UserCircle className="h-5 w-5 text-muted-foreground flex-shrink-0" aria-hidden="true" />
            <label
              htmlFor="assign-to-select"
              className="text-sm font-medium whitespace-nowrap"
            >
              Assign imported entities to:
            </label>
            <Select
              value={assignedTo ?? "__none__"}
              onValueChange={(val) =>
                onAssignedToChange(val === "__none__" ? null : val)
              }
            >
              <SelectTrigger className="w-[220px] h-9" id="assign-to-select">
                <SelectValue placeholder="No assignment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No assignment</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Vertical Stepper */}
      <div className="space-y-1">
        {detectedEntities.map((entity) => {
          const Icon = ENTITY_ICONS[entity];
          const label = ENTITY_LABELS[entity];
          const items = entityData[entity];
          const isApproved = entityApprovals[entity] === true;
          const isExpanded = expandedEntity === entity;

          return (
            <div key={entity} className="relative">
              {/* Step Header */}
              <Collapsible open={isExpanded} onOpenChange={() => toggleExpand(entity)}>
                <CollapsibleTrigger asChild>
                  <button
                    className={cn(
                      "flex items-center w-full gap-3 px-4 py-3 rounded-lg transition-colors text-left",
                      "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isExpanded && "bg-muted/30",
                    )}
                    aria-expanded={isExpanded}
                    aria-label={`${label} (${items.length}) - ${isApproved ? "Approved" : "Pending"}`}
                  >
                    {/* Step Indicator Circle */}
                    <div className="flex-shrink-0">
                      {isApproved ? (
                        <CheckCircle2 className="h-6 w-6 text-success" />
                      ) : isExpanded ? (
                        <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                          <Icon className="h-3.5 w-3.5 text-primary-foreground" />
                        </div>
                      ) : (
                        <Circle className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>

                    {/* Step Title */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {label}
                        </span>
                        <Badge variant="secondary" size="sm">
                          {items.length}
                        </Badge>
                      </div>
                      {isApproved && !isExpanded && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {items.length} {label.toLowerCase()} approved for import
                        </p>
                      )}
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isApproved ? (
                        <Badge variant="success" size="sm">
                          Approved
                        </Badge>
                      ) : (
                        <Badge variant="gray" size="sm">
                          Pending
                        </Badge>
                      )}
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="pl-4 pr-4 pb-4 pt-1">
                    <EntityStep
                      entityType={entity}
                      items={items}
                      totalRawCount={
                        entity === "clients"
                          ? entityData.clientRawCount
                          : entity === "properties"
                            ? entityData.propertyRawCount
                            : items.length
                      }
                      deduplicatedCount={
                        entity === "clients"
                          ? entityData.clientDedupCount
                          : entity === "properties"
                            ? entityData.propertyDedupCount
                            : 0
                      }
                      isApproved={isApproved}
                      onApprove={() => handleApprove(entity)}
                      onRowEdit={onRowEdit}
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Connecting line between steps */}
              {entity !== detectedEntities[detectedEntities.length - 1] && (
                <div
                  className="absolute left-[2.125rem] top-[3rem] bottom-0 w-px bg-border"
                  aria-hidden="true"
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Import All summary */}
      {detectedEntities.length > 0 && (
        <Card
          className={cn(
            "transition-colors",
            allApproved
              ? "border-success/30 bg-success/5"
              : "border-muted",
          )}
        >
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {allApproved ? (
                  <CheckCircle2 className="h-5 w-5 text-success" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <p className="text-sm font-medium">
                    {allApproved
                      ? "All entities approved \u2014 ready to import"
                      : `${detectedEntities.filter((e) => entityApprovals[e]).length} of ${detectedEntities.length} entity types approved`}
                  </p>
                  {!allApproved && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Approve all entity types to proceed with import
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {detectedEntities.map((entity) => {
                  const Icon = ENTITY_ICONS[entity];
                  return (
                    <div
                      key={entity}
                      className={cn(
                        "flex items-center gap-1 px-2 py-1 rounded text-xs",
                        entityApprovals[entity]
                          ? "bg-success/10 text-success"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      <Icon className="h-3 w-3" aria-hidden="true" />
                      <span>{entityData[entity].length}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Legacy ReviewStep (backward compat) ─────────────────────────────────────

function ReviewStepLegacy({
  dict,
  fieldsDict,
  data,
  fieldMapping,
  errorCount,
  entityType,
  entityCounts,
}: LegacyReviewStepProps) {
  const previewData = data.slice(0, 10);
  let entityLabel: string;
  if (entityType === "client") {
    entityLabel = "clients";
  } else if (entityType === "mandate") {
    entityLabel = "mandates";
  } else {
    entityLabel = "properties";
  }

  let displayColumns: string[];
  if (entityType === "client") {
    displayColumns = [
      "client_name",
      "primary_email",
      "primary_phone",
      "client_type",
      "client_status",
    ];
  } else if (entityType === "mandate") {
    displayColumns = [
      "budget_min",
      "budget_max",
      "mandate_transaction_type",
      "mandate_municipality",
      "urgency",
    ];
  } else {
    displayColumns = [
      "property_name",
      "property_type",
      "price",
      "address_city",
      "property_status",
    ];
  }

  const availableColumns = displayColumns.filter((col) =>
    previewData.some((row) => row[col] !== undefined && row[col] !== ""),
  );

  const getFieldLabel = (fieldKey: string) => {
    return fieldsDict.fields[fieldKey] || fieldKey;
  };

  return (
    <div className="space-y-6">
      {/* Ready to Import Summary */}
      <Card className="border-success/30 bg-success/10">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-success/15">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <div>
              <p className="text-xl font-bold">
                {dict.readyToImport
                  .replace("{count}", String(data.length))
                  .replace("{entity}", entityLabel)}
              </p>
              <p className="text-sm text-muted-foreground">
                {dict.confirmImport}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Per-entity summary cards (unified import) */}
      {entityCounts && (
        <div className="grid grid-cols-3 gap-4">
          {entityCounts.clients > 0 && (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-2xl font-bold text-primary">
                  {entityCounts.clients}
                </p>
                <p className="text-sm text-muted-foreground">Clients</p>
              </CardContent>
            </Card>
          )}
          {entityCounts.properties > 0 && (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-2xl font-bold text-primary">
                  {entityCounts.properties}
                </p>
                <p className="text-sm text-muted-foreground">Properties</p>
              </CardContent>
            </Card>
          )}
          {entityCounts.mandates > 0 && (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-2xl font-bold text-primary">
                  {entityCounts.mandates}
                </p>
                <p className="text-sm text-muted-foreground">Mandates</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Skip Warning */}
      {errorCount > 0 && (
        <Alert className="border-warning/30 bg-warning/10">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertDescription className="text-warning dark:text-warning">
            {dict.willSkip.replace("{count}", String(errorCount))}
          </AlertDescription>
        </Alert>
      )}

      {/* Data Preview */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="h-4 w-4" />
              {dict.previewTitle}
            </CardTitle>
            <Badge variant="secondary">
              {dict.previewDescription.replace(
                "{count}",
                String(Math.min(10, data.length)),
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">#</TableHead>
                  {availableColumns.map((col) => (
                    <TableHead key={col} className="whitespace-nowrap">
                      {getFieldLabel(col)}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell className="text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    {availableColumns.map((col) => (
                      <TableCell
                        key={col}
                        className="truncate max-w-[200px]"
                      >
                        {formatValue(row[col])}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {data.length > 10 && (
            <div className="p-3 text-center text-sm text-muted-foreground border-t">
              ... and {data.length - 10} more {entityLabel}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-success">{data.length}</p>
              <p className="text-sm text-muted-foreground">
                {entityLabel.charAt(0).toUpperCase() + entityLabel.slice(1)} to
                import
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-muted-foreground">
                {Object.values(fieldMapping).filter(Boolean).length}
              </p>
              <p className="text-sm text-muted-foreground">Fields mapped</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Exported Component ──────────────────────────────────────────────────────

export function ReviewStep(props: ReviewStepCombinedProps) {
  if (isNewProps(props)) {
    return <ReviewStepNew {...props} />;
  }
  return <ReviewStepLegacy {...props} />;
}
