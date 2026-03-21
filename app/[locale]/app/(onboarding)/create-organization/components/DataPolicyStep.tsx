"use client";

import { useEffect } from "react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { DataOwnershipSelector } from "@/components/data-ownership/DataOwnershipSelector";

interface DataPolicyStepProps {
  data: { dataOwnershipMode: "AGENCY" | "AGENT" | null };
  onDataChange: (data: { dataOwnershipMode: "AGENCY" | "AGENT" }) => void;
  onValidationChange: (isValid: boolean) => void;
}

export function DataPolicyStep({
  data,
  onDataChange,
  onValidationChange,
}: DataPolicyStepProps) {
  const t = useTranslations("createOrganization");

  // Notify parent of validation state whenever selection changes
  useEffect(() => {
    onValidationChange(data.dataOwnershipMode !== null);
  }, [data.dataOwnershipMode, onValidationChange]);

  const handleChange = (mode: "AGENCY" | "AGENT") => {
    onDataChange({ dataOwnershipMode: mode });
  };

  return (
    <div className="flex flex-col h-full">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center flex-shrink-0 mb-4"
      >
        <h2 className="text-2xl font-bold mb-2">{t("dataPolicy.title")}</h2>
        <p className="text-muted-foreground">{t("dataPolicy.description")}</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex-1"
      >
        <DataOwnershipSelector
          defaultValue={data.dataOwnershipMode ?? undefined}
          onChange={handleChange}
        />
      </motion.div>
    </div>
  );
}
