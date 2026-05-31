"use client";

import React from "react";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * Masks a sensitive key value, showing only a prefix and last few characters
 * Example: "sk-abc123xyz789" becomes "sk-...z789"
 */
function maskKey(key: string | undefined, notSetLabel: string): string {
  if (!key) return notSetLabel;

  // If key is too short, show asterisks
  if (key.length <= 8) {
    return "****" + key.slice(-4);
  }
  
  // Check if key has a prefix like "sk-", "re_", etc.
  const prefixMatch = key.match(/^([a-z]{2,4}[-_])/i);
  const prefix = prefixMatch ? prefixMatch[1] : "";
  const suffix = key.slice(-6);
  
  return `${prefix}...${suffix}`;
}

const CopyKeyComponent = ({
  keyValue,
  envValue,
  message,
}: {
  keyValue?: string;
  envValue?: string;
  message: string;
}) => {
  const t = useTranslations("admin.copyKey");
  const actualValue = keyValue || envValue || "";

  const onCopy = () => {
    if (actualValue) {
      navigator.clipboard.writeText(actualValue);
      toast.success(t("copied", { message }));
    }
  };

  return (
    <p
      role="button"
      tabIndex={0}
      className="flex gap-2 items-center cursor-pointer hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={onCopy}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onCopy();
        }
      }}
      title={t("clickToCopy")}
      aria-label={t("clickToCopy")}
    >
      {maskKey(actualValue, t("notSet"))}
      <Copy className="w-4 h-4" aria-hidden="true" />
    </p>
  );
};

export default CopyKeyComponent;
