"use client";

import { useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, AlertCircle } from "lucide-react";
import type { FieldDefinition, FieldsDict } from "./ImportWizardSteps";

// Special value to indicate no mapping (empty string is reserved by Radix Select)
const NO_MAPPING_VALUE = "__unmapped__";

interface MappingStepProps {
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
  };
  fieldsDict: FieldsDict;
  csvHeaders: string[];
  fieldMapping: Record<string, string>;
  fieldDefinitions: readonly FieldDefinition[];
  sampleData: Record<string, unknown>[];
  onMappingChange: (csvColumn: string, targetField: string) => void;
}

export function MappingStep({
  dict,
  fieldsDict,
  csvHeaders,
  fieldMapping,
  fieldDefinitions,
  sampleData,
  onMappingChange,
}: MappingStepProps) {
  // Group fields by their group property
  const groupedFields = useMemo(() => {
    const groups: Record<string, FieldDefinition[]> = {};
    fieldDefinitions.forEach((field) => {
      if (!groups[field.group]) {
        groups[field.group] = [];
      }
      groups[field.group].push(field);
    });
    return groups;
  }, [fieldDefinitions]);

  // Get already mapped fields to prevent duplicates
  const mappedFields = useMemo(() => {
    return new Set(Object.values(fieldMapping).filter(Boolean));
  }, [fieldMapping]);

  // Check if all required fields are mapped
  const requiredFields = useMemo(() => {
    return fieldDefinitions.filter((f) => f.required);
  }, [fieldDefinitions]);

  const missingRequired = useMemo(() => {
    return requiredFields.filter((rf) => !mappedFields.has(rf.key));
  }, [requiredFields, mappedFields]);

  const getFieldLabel = (fieldKey: string) => {
    return fieldsDict.fields[fieldKey] || fieldKey;
  };

  const getGroupLabel = (groupKey: string) => {
    return fieldsDict.groups[groupKey] || groupKey;
  };

  return (
    <div className="space-y-6">
      {/* Missing Required Fields Warning */}
      {missingRequired.length > 0 && (
        <Card className="border-warning/30 bg-warning/10">
          <CardContent className="flex items-start gap-3 py-4">
            <AlertCircle className="h-5 w-5 text-warning mt-0.5" />
            <div>
              <p className="font-medium text-sm">
                {dict.required}: {missingRequired.length} field(s) not mapped
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {missingRequired.map((f) => getFieldLabel(f.key)).join(", ")}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mapping Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{dict.csvColumn}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">{dict.csvColumn}</TableHead>
                  <TableHead className="w-[250px]">{dict.targetField}</TableHead>
                  <TableHead>{dict.preview}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {csvHeaders.map((header) => {
                  const currentMapping = fieldMapping[header];
                  const isRequired = currentMapping
                    ? requiredFields.some((rf) => rf.key === currentMapping)
                    : false;
                  const sampleValue = sampleData[0]?.[header];

                  return (
                    <TableRow key={header}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {header}
                          {currentMapping && (
                            <Check className="h-4 w-4 text-success" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={currentMapping || NO_MAPPING_VALUE}
                          onValueChange={(value) => 
                            onMappingChange(header, value === NO_MAPPING_VALUE ? "" : value)
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={dict.selectField} />
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px]">
                            <SelectItem value={NO_MAPPING_VALUE}>{dict.noMapping}</SelectItem>
                            {Object.entries(groupedFields).map(([group, fields]) => (
                              <SelectGroup key={group}>
                                <SelectLabel>{getGroupLabel(group)}</SelectLabel>
                                {fields.map((field) => {
                                  const isMapped =
                                    mappedFields.has(field.key) &&
                                    fieldMapping[header] !== field.key;
                                  return (
                                    <SelectItem
                                      key={field.key}
                                      value={field.key}
                                      disabled={isMapped}
                                    >
                                      <div className="flex items-center gap-2">
                                        {getFieldLabel(field.key)}
                                        {field.required && (
                                          <Badge variant="secondary" className="text-xs">
                                            *
                                          </Badge>
                                        )}
                                      </div>
                                    </SelectItem>
                                  );
                                })}
                              </SelectGroup>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm truncate max-w-[200px]">
                        {sampleValue !== undefined && sampleValue !== ""
                          ? String(sampleValue)
                          : "-"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Sample Data Preview */}
      {sampleData.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{dict.sampleData}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {csvHeaders.map((header) => (
                      <TableHead key={header} className="text-xs whitespace-nowrap">
                        {header}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sampleData.map((row, index) => (
                    <TableRow key={index}>
                      {csvHeaders.map((header) => (
                        <TableCell
                          key={header}
                          className="text-xs truncate max-w-[150px]"
                        >
                          {row[header] !== undefined && row[header] !== ""
                            ? String(row[header])
                            : "-"}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}








