"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
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
  Building2,
  User,
  ChevronDown,
  Check,
  Circle,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { TemplateDefinition } from "@/lib/templates";

type PropertyOption = {
  id: string;
  property_name: string;
  address_street: string | null;
  municipality: string | null;
};

type ClientOption = {
  id: string;
  client_name: string;
  primary_email: string | null;
  primary_phone: string | null;
};

interface BuilderSidebarProps {
  readonly definition: TemplateDefinition;
  readonly properties: PropertyOption[];
  readonly clients: ClientOption[];
  readonly selectedPropertyId: string;
  readonly selectedClientId: string;
  readonly values: Record<string, string>;
  readonly locale: "en" | "el";
  readonly onPropertyChange: (propertyId: string) => void;
  readonly onClientChange: (clientId: string) => void;
  readonly onClear: () => void;
}

export function BuilderSidebar({
  definition,
  properties,
  clients,
  selectedPropertyId,
  selectedClientId,
  values,
  locale,
  onPropertyChange,
  onClientChange,
  onClear,
}: BuilderSidebarProps) {
  const t = useTranslations("documents.builder");
  const isGreek = locale === "el";

  const [entitySectionOpen, setEntitySectionOpen] = useState(true);
  const [fieldsSectionOpen, setFieldsSectionOpen] = useState(true);

  // Group fields by category (first part of key before underscore)
  const groupedFields = definition.placeholders.reduce(
    (acc, placeholder) => {
      const category = placeholder.key.split("_")[0];
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(placeholder);
      return acc;
    },
    {} as Record<string, typeof definition.placeholders>
  );

  // Calculate completion stats
  const requiredFields = definition.placeholders.filter((p) => p.required);
  const filledRequired = requiredFields.filter((p) => values[p.key]?.trim()).length;
  const totalFields = definition.placeholders.length;
  const filledTotal = definition.placeholders.filter((p) => values[p.key]?.trim()).length;

  return (
    <aside className="w-80 flex-shrink-0 border-l bg-background flex flex-col h-full overflow-hidden">
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 space-y-4">
          {/* Auto-fill Section */}
          <Collapsible open={entitySectionOpen} onOpenChange={setEntitySectionOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between p-2 h-auto hover:bg-muted"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm">{t("autoFill")}</span>
                </div>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform",
                    entitySectionOpen && "rotate-180"
                  )}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-2">
              <p className="text-xs text-muted-foreground px-2 break-words">
                {t("autoFillDescription")}
              </p>

              {/* Property Selector */}
              <div className="space-y-2 px-1">
                <Label className="text-xs flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">{t("selectProperty")}</span>
                </Label>
                <Select
                  value={selectedPropertyId || "none"}
                  onValueChange={(v) => onPropertyChange(v === "none" ? "" : v)}
                >
                  <SelectTrigger className="h-9 bg-background">
                    <SelectValue placeholder={t("selectPropertyPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("noProperty")}</SelectItem>
                    {properties.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        <div className="flex flex-col">
                          <span className="truncate">{p.property_name}</span>
                          {p.municipality && (
                            <span className="text-xs text-muted-foreground truncate">
                              {p.municipality}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Client Selector */}
              <div className="space-y-2 px-1">
                <Label className="text-xs flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">{t("selectClient")}</span>
                </Label>
                <Select
                  value={selectedClientId || "none"}
                  onValueChange={(v) => onClientChange(v === "none" ? "" : v)}
                >
                  <SelectTrigger className="h-9 bg-background">
                    <SelectValue placeholder={t("selectClientPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("noClient")}</SelectItem>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        <div className="flex flex-col">
                          <span className="truncate">{c.client_name}</span>
                          {c.primary_phone && (
                            <span className="text-xs text-muted-foreground truncate">
                              {c.primary_phone}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Separator className="bg-border" />

          {/* Fields Checklist */}
          <Collapsible open={fieldsSectionOpen} onOpenChange={setFieldsSectionOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between p-2 h-auto hover:bg-muted"
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{t("fields")}</span>
                  <Badge variant="secondary" className="text-xs">
                    {filledTotal}/{totalFields}
                  </Badge>
                </div>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform",
                    fieldsSectionOpen && "rotate-180"
                  )}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              {/* Progress Summary */}
              <div className="px-2 pb-3">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground">{t("requiredFields")}</span>
                  <span className="font-medium">
                    {filledRequired}/{requiredFields.length}
                  </span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full transition-all duration-300 rounded-full",
                      filledRequired === requiredFields.length
                        ? "bg-green-500"
                        : "bg-primary"
                    )}
                    style={{
                      width: `${(filledRequired / requiredFields.length) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* Grouped Fields */}
              <div className="space-y-3">
                {Object.entries(groupedFields).map(([category, fields]) => (
                  <div key={category}>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-2 mb-1.5">
                      {category}
                    </p>
                    <div className="space-y-0.5">
                      {fields.map((field) => {
                        const isFilled = !!values[field.key]?.trim();
                        const label = isGreek ? field.labelEl : field.labelEn;

                        return (
                          <div
                            key={field.key}
                            className={cn(
                              "flex items-center gap-2 px-2 py-1 rounded text-xs",
                              isFilled && "text-muted-foreground"
                            )}
                          >
                            {isFilled ? (
                              <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
                            ) : (
                              <Circle
                                className={cn(
                                  "h-3 w-3 flex-shrink-0",
                                  field.required
                                    ? "text-orange-400"
                                    : "text-slate-300 dark:text-slate-600"
                                )}
                              />
                            )}
                            <span className="truncate flex-1" title={label}>
                              {label}
                            </span>
                            {field.required && !isFilled && (
                              <span className="text-orange-400 text-[10px] flex-shrink-0">*</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>

      {/* Bottom Actions - Fixed at bottom */}
      <div className="p-4 border-t bg-background flex-shrink-0">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={onClear}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          {t("clearAll")}
        </Button>
      </div>
    </aside>
  );
}
