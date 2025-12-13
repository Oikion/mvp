"use client";

import { useRouter } from "next/navigation";
import { ConversionWizard } from "@/components/conversion";

export function ClientConversionWizard() {
  const router = useRouter();

  const handleCancel = () => {
    router.push("/crm/clients");
  };

  const handleComplete = () => {
    router.push("/crm/clients/import");
  };

  return (
    <ConversionWizard
      entityType="clients"
      onCancel={handleCancel}
      onComplete={handleComplete}
    />
  );
}
