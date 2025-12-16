"use client";

import React from "react";
import { toast } from "sonner";
import { Copy } from "lucide-react";

/**
 * Masks a sensitive key value, showing only a prefix and last few characters
 * Example: "sk-abc123xyz789" becomes "sk-...z789"
 */
function maskKey(key: string | undefined): string {
  if (!key) return "Not set";
  
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
  const actualValue = keyValue || envValue || "";
  
  const onCopy = () => {
    if (actualValue) {
      navigator.clipboard.writeText(actualValue);
      toast.success(message + " - copied to clipboard");
    }
  };

  return (
    <p
      className="flex gap-2 items-center cursor-pointer hover:opacity-80"
      onClick={onCopy}
      title="Click to copy full key"
    >
      {maskKey(actualValue)}
      <Copy className="w-4 h-4" />
    </p>
  );
};

export default CopyKeyComponent;
