"use client";

import { useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, Sparkles, Trash2, Wand2 } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { propertyImportFieldDefinitions } from "@/lib/import/property-import-schema";
import { clientImportFieldDefinitions } from "@/lib/import/client-import-schema";

import type { EntityType, ColumnMapping, FieldKey } from "./ConversionWizard";

interface ConversionMappingStepProps {
  entityType: EntityType;
  mappings: ColumnMapping[];
  onMappingsChange: (mappings: ColumnMapping[]) => void;
  sampleData: Record<string, unknown>[];
}

const NO_MAPPING_VALUE = "__skip__";

// Common column name variations for smart mapping
const COLUMN_ALIASES: Record<string, string[]> = {
  // Property fields
  property_name: ["name", "title", "property", "listing_title", "property_title", "onoma", "titlos"],
  property_type: ["type", "category", "property_category", "typos", "katigoria"],
  property_status: ["status", "state", "katastasi"],
  price: ["price", "cost", "amount", "timi", "poso"],
  address_street: ["street", "address", "odos", "diefthinsi"],
  address_city: ["city", "town", "poli"],
  postal_code: ["postal_code", "zip", "postcode", "tk", "tachydromikos_kodikas"],
  bedrooms: ["bedrooms", "beds", "bedroom_count", "ypnodomatia"],
  bathrooms: ["bathrooms", "baths", "bathroom_count", "mpania"],
  size_net_sqm: ["size", "sqm", "square_meters", "area", "emvadon", "tetragonika"],
  floor: ["floor", "level", "orofos"],
  year_built: ["year_built", "construction_year", "etos_kataskevis"],
  description: ["description", "desc", "details", "perigrafi"],
  
  // Client fields
  client_name: ["name", "full_name", "client", "contact_name", "onoma", "eponymo"],
  primary_email: ["email", "mail", "contact_email", "email_address"],
  primary_phone: ["phone", "mobile", "tel", "telephone", "tilefono", "kinito"],
  company_name: ["company", "business", "organization", "etairia"],
  client_type: ["type", "client_type", "typos"],
  client_status: ["status", "state", "katastasi"],
};

export function ConversionMappingStep({
  entityType,
  mappings,
  onMappingsChange,
  sampleData,
}: ConversionMappingStepProps) {
  const t = useTranslations("conversion");
  const tImport = useTranslations("import");

  const fieldDefinitions = entityType === "properties" 
    ? propertyImportFieldDefinitions 
    : clientImportFieldDefinitions;

  // Group fields by category
  const groupedFields = useMemo(() => {
    const groups: Record<string, Array<(typeof fieldDefinitions)[number]>> = {};
    fieldDefinitions.forEach((field) => {
      if (!groups[field.group]) {
        groups[field.group] = [];
      }
      groups[field.group].push(field);
    });
    return groups;
  }, [fieldDefinitions]);

  // Get already mapped target fields
  const mappedTargets = useMemo(() => {
    return new Set(mappings.filter(m => m.targetField).map(m => m.targetField));
  }, [mappings]);

  // Count stats
  const mappedCount = mappings.filter(m => m.targetField !== "").length;
  const autoMappedCount = mappings.filter(m => m.isAutoMapped && m.targetField !== "").length;

  const handleMappingChange = useCallback((sourceColumn: string, targetField: string) => {
    const newMappings = mappings.map(m => {
      if (m.sourceColumn === sourceColumn) {
        return {
          ...m,
          targetField: (targetField === NO_MAPPING_VALUE ? "" : targetField) as FieldKey | "",
          isAutoMapped: false,
        };
      }
      return m;
    });
    onMappingsChange(newMappings);
  }, [mappings, onMappingsChange]);

  const handleAutoMap = useCallback(() => {
    const newMappings = mappings.map(mapping => {
      const normalizedSource = mapping.sourceColumn.toLowerCase().replace(/[\s_-]+/g, "_");
      
      // Check aliases
      for (const [targetField, aliases] of Object.entries(COLUMN_ALIASES)) {
        if (aliases.some(alias => normalizedSource.includes(alias) || alias.includes(normalizedSource))) {
          // Only map if field is in our definitions and not already used
          const fieldExists = fieldDefinitions.some(f => f.key === targetField);
          const alreadyMapped = mappings.some(
            m => m.sourceColumn !== mapping.sourceColumn && m.targetField === targetField
          );
          
          if (fieldExists && !alreadyMapped) {
            return {
              ...mapping,
              targetField: targetField as FieldKey,
              isAutoMapped: true,
            };
          }
        }
      }
      
      // Exact match
      const exactMatch = fieldDefinitions.find(
        f => f.key.toLowerCase() === normalizedSource
      );
      if (exactMatch) {
        const alreadyMapped = mappings.some(
          m => m.sourceColumn !== mapping.sourceColumn && m.targetField === exactMatch.key
        );
        if (!alreadyMapped) {
          return {
            ...mapping,
            targetField: exactMatch.key as FieldKey,
            isAutoMapped: true,
          };
        }
      }
      
      return mapping;
    });
    
    onMappingsChange(newMappings);
  }, [mappings, fieldDefinitions, onMappingsChange]);

  const handleClearAll = useCallback(() => {
    const newMappings = mappings.map(m => ({
      ...m,
      targetField: "" as const,
      isAutoMapped: false,
    }));
    onMappingsChange(newMappings);
  }, [mappings, onMappingsChange]);

  // Suggest a field based on column name
  const getSuggestion = useCallback((sourceColumn: string): string | null => {
    const normalized = sourceColumn.toLowerCase().replace(/[\s_-]+/g, "_");
    
    for (const [targetField, aliases] of Object.entries(COLUMN_ALIASES)) {
      if (aliases.some(alias => normalized.includes(alias) || alias.includes(normalized))) {
        const fieldExists = fieldDefinitions.some(f => f.key === targetField);
        if (fieldExists) return targetField;
      }
    }
    
    const exactMatch = fieldDefinitions.find(f => f.key.toLowerCase() === normalized);
    return exactMatch?.key || null;
  }, [fieldDefinitions]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ArrowRight className="h-5 w-5" />
                {t("mapping.title")}
              </CardTitle>
              <CardDescription>{t("mapping.description")}</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleClearAll}>
                <Trash2 className="h-4 w-4 mr-2" />
                {t("mapping.clearAll")}
              </Button>
              <Button variant="secondary" size="sm" onClick={handleAutoMap}>
                <Wand2 className="h-4 w-4 mr-2" />
                {t("mapping.autoMap")}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Stats */}
          <div className="flex gap-4 mb-6">
            <Badge variant="secondary" className="text-sm">
              {t("mapping.mappedCount", { count: mappedCount, total: mappings.length })}
            </Badge>
            {autoMappedCount > 0 && (
              <Badge variant="outline" className="text-sm">
                <Sparkles className="h-3 w-3 mr-1" />
                {autoMappedCount} {t("mapping.autoMapped").toLowerCase()}
              </Badge>
            )}
          </div>

          {/* Mapping Table */}
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            {mappings.map((mapping) => {
              const suggestion = !mapping.targetField ? getSuggestion(mapping.sourceColumn) : null;
              
              return (
                <div
                  key={mapping.sourceColumn}
                  className={`
                    flex items-center gap-4 p-3 rounded-lg border
                    ${mapping.targetField ? "bg-success/10 border-success/30" : "bg-muted/30"}
                  `}
                >
                  {/* Source Column */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{mapping.sourceColumn}</span>
                      {mapping.isAutoMapped && (
                        <Badge variant="secondary" className="text-xs">
                          <Sparkles className="h-3 w-3 mr-1" />
                          Auto
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {mapping.sampleValue || <em>empty</em>}
                    </p>
                    {suggestion && !mapping.targetField && (
                      <p className="text-xs text-primary mt-1">
                        {t("mapping.suggestedMapping", { field: suggestion })}
                      </p>
                    )}
                  </div>

                  {/* Arrow */}
                  <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />

                  {/* Target Field Select */}
                  <div className="w-[250px] flex-shrink-0">
                    <Select
                      value={mapping.targetField || NO_MAPPING_VALUE}
                      onValueChange={(value) => handleMappingChange(mapping.sourceColumn, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("mapping.noMapping")} />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        <SelectItem value={NO_MAPPING_VALUE}>
                          {t("mapping.noMapping")}
                        </SelectItem>
                        
                        {Object.entries(groupedFields).map(([group, fields]) => (
                          <SelectGroup key={group}>
                            <SelectLabel className="capitalize">{group}</SelectLabel>
                            {fields.map((field) => {
                              const isUsed = mappedTargets.has(field.key) && mapping.targetField !== field.key;
                              return (
                                <SelectItem
                                  key={field.key}
                                  value={field.key}
                                  disabled={isUsed}
                                >
                                  <span className="flex items-center gap-2">
                                    {tImport.has(`fields.${field.key}`) 
                                      ? tImport(`fields.${field.key}`) 
                                      : field.key}
                                    {field.required && (
                                      <Badge variant="destructive" className="text-[10px] px-1">
                                        Required
                                      </Badge>
                                    )}
                                    {isUsed && (
                                      <Badge variant="secondary" className="text-[10px] px-1">
                                        In use
                                      </Badge>
                                    )}
                                  </span>
                                </SelectItem>
                              );
                            })}
                          </SelectGroup>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
