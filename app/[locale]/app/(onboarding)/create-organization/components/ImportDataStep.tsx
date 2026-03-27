"use client";

import { useEffect } from "react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import {
  FileSpreadsheet,
  Upload,
  Users,
  Building2,
  FileText,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

interface ImportDataStepProps {
  data: { wantsImport: boolean };
  onDataChange: (data: { wantsImport: boolean }) => void;
  onValidationChange: (isValid: boolean) => void;
}

const ENTITY_ICONS = [
  { key: "properties", Icon: Building2 },
  { key: "clients", Icon: Users },
  { key: "mandates", Icon: FileText },
] as const;

export function ImportDataStep({
  data,
  onDataChange,
  onValidationChange,
}: ImportDataStepProps) {
  const t = useTranslations("createOrganization");

  // This step is always valid — it's a yes/no choice
  useEffect(() => {
    onValidationChange(true);
  }, [onValidationChange]);

  return (
    <div className="flex flex-col h-full">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center flex-shrink-0 mb-6"
      >
        <h2 className="text-2xl font-bold mb-2">{t("importData.title")}</h2>
        <p className="text-muted-foreground">{t("importData.description")}</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="space-y-4"
      >
        {/* Entity types supported */}
        <div className="grid grid-cols-3 gap-3">
          {ENTITY_ICONS.map(({ key, Icon }) => (
            <div
              key={key}
              className="flex flex-col items-center gap-2 p-3 rounded-lg border bg-muted/30"
            >
              <Icon className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
              <span className="text-sm font-medium">
                {t(`importData.entities.${key}`)}
              </span>
            </div>
          ))}
        </div>

        {/* Feature highlights */}
        <div className="space-y-2 px-1">
          {(["csvExcel", "autoMapping", "validation"] as const).map((feature) => (
            <div key={feature} className="flex items-start gap-2.5">
              <CheckCircle2
                className="h-4 w-4 mt-0.5 text-primary flex-shrink-0"
                aria-hidden="true"
              />
              <span className="text-sm text-muted-foreground">
                {t(`importData.features.${feature}`)}
              </span>
            </div>
          ))}
        </div>

        {/* Yes / No choice cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {/* Yes — import after creation */}
          <Card
            className={cn(
              "cursor-pointer transition-all hover:border-primary/50",
              data.wantsImport && "border-primary ring-2 ring-primary/20"
            )}
            onClick={() => onDataChange({ wantsImport: true })}
            role="radio"
            aria-checked={data.wantsImport}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onDataChange({ wantsImport: true });
              }
            }}
          >
            <CardContent className="flex flex-col items-center gap-3 p-5">
              <Upload
                className={cn(
                  "h-8 w-8",
                  data.wantsImport ? "text-primary" : "text-muted-foreground"
                )}
                aria-hidden="true"
              />
              <div className="text-center">
                <p className="font-semibold text-sm">
                  {t("importData.yesImport")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("importData.yesImportHint")}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* No — skip for now */}
          <Card
            className={cn(
              "cursor-pointer transition-all hover:border-primary/50",
              !data.wantsImport && "border-primary ring-2 ring-primary/20"
            )}
            onClick={() => onDataChange({ wantsImport: false })}
            role="radio"
            aria-checked={!data.wantsImport}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onDataChange({ wantsImport: false });
              }
            }}
          >
            <CardContent className="flex flex-col items-center gap-3 p-5">
              <FileSpreadsheet
                className={cn(
                  "h-8 w-8",
                  !data.wantsImport ? "text-primary" : "text-muted-foreground"
                )}
                aria-hidden="true"
              />
              <div className="text-center">
                <p className="font-semibold text-sm">
                  {t("importData.noImport")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("importData.noImportHint")}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  );
}
