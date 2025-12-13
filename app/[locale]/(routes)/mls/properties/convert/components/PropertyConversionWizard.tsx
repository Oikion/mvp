"use client";

import { useRouter } from "next/navigation";
import { ConversionWizard } from "@/components/conversion";

export function PropertyConversionWizard() {
  const router = useRouter();

  const handleCancel = () => {
    router.push("/mls/properties");
  };

  const handleComplete = () => {
    router.push("/mls/properties/import");
  };

  return (
    <ConversionWizard
      entityType="properties"
      onCancel={handleCancel}
      onComplete={handleComplete}
    />
  );
}
