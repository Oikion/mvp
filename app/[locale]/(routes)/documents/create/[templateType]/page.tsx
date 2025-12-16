import { Suspense } from "react";
import { notFound } from "next/navigation";
import { TemplateType } from "@prisma/client";
import { VisualDocumentBuilder } from "./components/VisualDocumentBuilder";
import { getTemplateDefinition } from "@/lib/templates";
import { getPropertiesForTemplate, getClientsForTemplate } from "@/actions/templates/get-auto-fill-data";
import { Skeleton } from "@/components/ui/skeleton";

// Valid template types
const VALID_TEMPLATE_TYPES = [
  "BROKERAGE_MANDATE",
  "LEASE_AGREEMENT",
  "HANDOVER_PROTOCOL",
  "VIEWING_CONFIRMATION",
] as const;

function isValidTemplateType(type: string): type is TemplateType {
  return VALID_TEMPLATE_TYPES.includes(type as TemplateType);
}

function BuilderSkeleton() {
  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Sidebar skeleton */}
      <div className="w-80 border-r p-4 space-y-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
      {/* Canvas skeleton */}
      <div className="flex-1 flex items-center justify-center bg-muted/30 p-8">
        <Skeleton className="w-[595px] h-[842px]" />
      </div>
    </div>
  );
}

export default async function DocumentBuilderPage({
  params,
}: {
  params: Promise<{ locale: string; templateType: string }>;
}) {
  const { locale, templateType } = await params;

  // Validate template type
  if (!isValidTemplateType(templateType)) {
    notFound();
  }

  // Get template definition
  const definition = getTemplateDefinition(templateType);
  if (!definition) {
    notFound();
  }

  // Fetch properties and clients for auto-fill
  const [properties, clients] = await Promise.all([
    getPropertiesForTemplate(),
    getClientsForTemplate(),
  ]);

  return (
    <Suspense fallback={<BuilderSkeleton />}>
      <VisualDocumentBuilder
        templateType={templateType}
        definition={definition}
        properties={properties}
        clients={clients}
        locale={locale as "en" | "el"}
      />
    </Suspense>
  );
}



