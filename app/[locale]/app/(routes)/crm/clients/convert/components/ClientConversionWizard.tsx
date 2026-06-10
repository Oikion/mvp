"use client";

import { useRouter } from "next/navigation";
import { ConversionWizard } from "@/components/conversion";

export function ClientConversionWizard() {
  const router = useRouter();

  const handleCancel = () => {
    router.push("/app/crm");
  };

  const handleComplete = () => {
    router.push("/app/crm/clients/import");
  };

  return (
    <ConversionWizard
      entityType="clients"
      onCancel={handleCancel}
      onComplete={handleComplete}
    />
  );
}






