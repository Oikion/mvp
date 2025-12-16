"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { RefreshCw, Plus, Trash2, ArrowRight, Zap } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import type { EntityType, ColumnMapping, ValueTransformation, FieldKey } from "./ConversionWizard";

interface ConversionTransformStepProps {
  entityType: EntityType;
  mappings: ColumnMapping[];
  transformations: ValueTransformation[];
  onTransformationsChange: (transformations: ValueTransformation[]) => void;
  rawData: Record<string, unknown>[];
}

// Enum fields that need value transformations
const ENUM_FIELDS: Record<string, string[]> = {
  // Property enums
  property_type: ["RESIDENTIAL", "COMMERCIAL", "LAND", "RENTAL", "VACATION", "APARTMENT", "HOUSE", "MAISONETTE", "WAREHOUSE", "PARKING", "PLOT", "FARM", "INDUSTRIAL", "OTHER"],
  property_status: ["ACTIVE", "PENDING", "SOLD", "OFF_MARKET", "WITHDRAWN"],
  transaction_type: ["SALE", "RENTAL", "SHORT_TERM", "EXCHANGE"],
  heating_type: ["AUTONOMOUS", "CENTRAL", "NATURAL_GAS", "HEAT_PUMP", "ELECTRIC", "NONE"],
  energy_cert_class: ["A_PLUS", "A", "B", "C", "D", "E", "F", "G", "H", "IN_PROGRESS"],
  condition: ["EXCELLENT", "VERY_GOOD", "GOOD", "NEEDS_RENOVATION"],
  furnished: ["NO", "PARTIALLY", "FULLY"],
  price_type: ["RENTAL", "SALE", "PER_ACRE", "PER_SQM"],
  portal_visibility: ["PRIVATE", "SELECTED", "PUBLIC"],
  address_privacy_level: ["EXACT", "PARTIAL", "HIDDEN"],
  legalization_status: ["LEGALIZED", "IN_PROGRESS", "UNDECLARED"],
  
  // Client enums
  client_type: ["BUYER", "SELLER", "RENTER", "INVESTOR", "REFERRAL_PARTNER"],
  client_status: ["LEAD", "ACTIVE", "INACTIVE", "CONVERTED", "LOST"],
  person_type: ["INDIVIDUAL", "COMPANY", "INVESTOR", "BROKER"],
  intent: ["BUY", "RENT", "SELL", "LEASE", "INVEST"],
  purpose: ["RESIDENTIAL", "COMMERCIAL", "LAND", "PARKING", "OTHER"],
  timeline: ["IMMEDIATE", "ONE_THREE_MONTHS", "THREE_SIX_MONTHS", "SIX_PLUS_MONTHS"],
  financing_type: ["CASH", "MORTGAGE", "PREAPPROVAL_PENDING"],
  lead_source: ["REFERRAL", "WEB", "PORTAL", "WALK_IN", "SOCIAL"],
};

// Common value aliases for auto-detection
const VALUE_ALIASES: Record<string, Record<string, string>> = {
  property_type: {
    "διαμέρισμα": "APARTMENT",
    "apartment": "APARTMENT",
    "flat": "APARTMENT",
    "σπίτι": "HOUSE",
    "house": "HOUSE",
    "villa": "HOUSE",
    "μονοκατοικία": "HOUSE",
    "μεζονέτα": "MAISONETTE",
    "maisonette": "MAISONETTE",
    "οικόπεδο": "PLOT",
    "plot": "PLOT",
    "land": "LAND",
    "γη": "LAND",
    "επαγγελματικό": "COMMERCIAL",
    "commercial": "COMMERCIAL",
    "κατάστημα": "COMMERCIAL",
    "shop": "COMMERCIAL",
    "αποθήκη": "WAREHOUSE",
    "warehouse": "WAREHOUSE",
    "parking": "PARKING",
    "θέση στάθμευσης": "PARKING",
  },
  property_status: {
    "ενεργό": "ACTIVE",
    "active": "ACTIVE",
    "διαθέσιμο": "ACTIVE",
    "available": "ACTIVE",
    "εκκρεμεί": "PENDING",
    "pending": "PENDING",
    "πωλήθηκε": "SOLD",
    "sold": "SOLD",
    "κλειστό": "OFF_MARKET",
    "off market": "OFF_MARKET",
    "αποσύρθηκε": "WITHDRAWN",
    "withdrawn": "WITHDRAWN",
  },
  transaction_type: {
    "πώληση": "SALE",
    "sale": "SALE",
    "for sale": "SALE",
    "ενοικίαση": "RENTAL",
    "rental": "RENTAL",
    "rent": "RENTAL",
    "for rent": "RENTAL",
    "βραχυχρόνια": "SHORT_TERM",
    "short term": "SHORT_TERM",
    "ανταλλαγή": "EXCHANGE",
    "exchange": "EXCHANGE",
  },
  client_type: {
    "αγοραστής": "BUYER",
    "buyer": "BUYER",
    "πωλητής": "SELLER",
    "seller": "SELLER",
    "vendor": "SELLER",
    "ενοικιαστής": "RENTER",
    "renter": "RENTER",
    "tenant": "RENTER",
    "επενδυτής": "INVESTOR",
    "investor": "INVESTOR",
  },
  client_status: {
    "lead": "LEAD",
    "νέος": "LEAD",
    "new": "LEAD",
    "ενεργός": "ACTIVE",
    "active": "ACTIVE",
    "ανενεργός": "INACTIVE",
    "inactive": "INACTIVE",
    "μετατράπηκε": "CONVERTED",
    "converted": "CONVERTED",
    "χαμένος": "LOST",
    "lost": "LOST",
  },
};

export function ConversionTransformStep({
  entityType,
  mappings,
  transformations,
  onTransformationsChange,
  rawData,
}: ConversionTransformStepProps) {
  const t = useTranslations("conversion");
  const tImport = useTranslations("import");

  // Get enum fields that are mapped
  const mappedEnumFields = useMemo(() => {
    return mappings
      .filter(m => m.targetField && ENUM_FIELDS[m.targetField])
      .map(m => ({
        sourceColumn: m.sourceColumn,
        targetField: m.targetField as FieldKey,
        enumValues: ENUM_FIELDS[m.targetField] || [],
      }));
  }, [mappings]);

  // Get unique values for a source column
  const getUniqueValues = useCallback((sourceColumn: string): string[] => {
    const values = new Set<string>();
    rawData.forEach(row => {
      const val = row[sourceColumn];
      if (val !== undefined && val !== null && val !== "") {
        values.add(String(val));
      }
    });
    return Array.from(values).sort();
  }, [rawData]);

  const handleAddRule = useCallback((field: FieldKey) => {
    const existing = transformations.find(t => t.field === field);
    if (existing) {
      onTransformationsChange(
        transformations.map(t =>
          t.field === field
            ? { ...t, rules: [...t.rules, { sourceValue: "", targetValue: "" }] }
            : t
        )
      );
    } else {
      onTransformationsChange([
        ...transformations,
        { field, rules: [{ sourceValue: "", targetValue: "" }] },
      ]);
    }
  }, [transformations, onTransformationsChange]);

  const handleRemoveRule = useCallback((field: FieldKey, ruleIndex: number) => {
    onTransformationsChange(
      transformations.map(t =>
        t.field === field
          ? { ...t, rules: t.rules.filter((_, i) => i !== ruleIndex) }
          : t
      ).filter(t => t.rules.length > 0)
    );
  }, [transformations, onTransformationsChange]);

  const handleRuleChange = useCallback((
    field: FieldKey,
    ruleIndex: number,
    key: "sourceValue" | "targetValue",
    value: string
  ) => {
    onTransformationsChange(
      transformations.map(t =>
        t.field === field
          ? {
              ...t,
              rules: t.rules.map((rule, i) =>
                i === ruleIndex ? { ...rule, [key]: value } : rule
              ),
            }
          : t
      )
    );
  }, [transformations, onTransformationsChange]);

  const handleAutoDetect = useCallback((field: FieldKey, sourceColumn: string) => {
    const uniqueValues = getUniqueValues(sourceColumn);
    const aliases = VALUE_ALIASES[field] || {};
    
    const detectedRules: Array<{ sourceValue: string; targetValue: string }> = [];
    
    uniqueValues.forEach(value => {
      const normalized = value.toLowerCase().trim();
      if (aliases[normalized]) {
        detectedRules.push({
          sourceValue: value,
          targetValue: aliases[normalized],
        });
      }
    });
    
    if (detectedRules.length > 0) {
      const existing = transformations.find(t => t.field === field);
      if (existing) {
        // Merge with existing, avoid duplicates
        const existingSourceValues = new Set(existing.rules.map(r => r.sourceValue));
        const newRules = detectedRules.filter(r => !existingSourceValues.has(r.sourceValue));
        onTransformationsChange(
          transformations.map(t =>
            t.field === field
              ? { ...t, rules: [...t.rules, ...newRules] }
              : t
          )
        );
      } else {
        onTransformationsChange([
          ...transformations,
          { field, rules: detectedRules },
        ]);
      }
    }
  }, [transformations, onTransformationsChange, getUniqueValues]);

  if (mappedEnumFields.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            {t("transform.title")}
          </CardTitle>
          <CardDescription>{t("transform.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            {t("transform.noTransformations")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            {t("transform.title")}
          </CardTitle>
          <CardDescription>{t("transform.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="space-y-2">
            {mappedEnumFields.map(({ sourceColumn, targetField, enumValues }) => {
              const fieldTransformations = transformations.find(t => t.field === targetField);
              const uniqueSourceValues = getUniqueValues(sourceColumn);
              
              return (
                <AccordionItem key={targetField} value={targetField} className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">
                        {tImport.has(`fields.${targetField}`) 
                          ? tImport(`fields.${targetField}`) 
                          : targetField}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {sourceColumn}
                      </Badge>
                      {fieldTransformations && fieldTransformations.rules.length > 0 && (
                        <Badge variant="default" className="text-xs">
                          {fieldTransformations.rules.length} rules
                        </Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4 pb-2">
                    <div className="space-y-4">
                      {/* Auto-detect button */}
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                          {t("transform.uniqueValues", { count: uniqueSourceValues.length })}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAutoDetect(targetField, sourceColumn)}
                        >
                          <Zap className="h-4 w-4 mr-2" />
                          {t("transform.detectValues")}
                        </Button>
                      </div>

                      {/* Transformation rules */}
                      <div className="space-y-2">
                        {fieldTransformations?.rules.map((rule, ruleIndex) => (
                          <div key={ruleIndex} className="flex items-center gap-2">
                            <Select
                              value={rule.sourceValue}
                              onValueChange={(value) =>
                                handleRuleChange(targetField, ruleIndex, "sourceValue", value)
                              }
                            >
                              <SelectTrigger className="flex-1">
                                <SelectValue placeholder={t("transform.sourceValue")} />
                              </SelectTrigger>
                              <SelectContent>
                                {uniqueSourceValues.map((value) => (
                                  <SelectItem key={value} value={value}>
                                    {value}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            
                            <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            
                            <Select
                              value={rule.targetValue}
                              onValueChange={(value) =>
                                handleRuleChange(targetField, ruleIndex, "targetValue", value)
                              }
                            >
                              <SelectTrigger className="flex-1">
                                <SelectValue placeholder={t("transform.targetValue")} />
                              </SelectTrigger>
                              <SelectContent>
                                {enumValues.map((value) => (
                                  <SelectItem key={value} value={value}>
                                    {value}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveRule(targetField, ruleIndex)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>

                      {/* Add rule button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddRule(targetField)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {t("transform.addRule")}
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}


