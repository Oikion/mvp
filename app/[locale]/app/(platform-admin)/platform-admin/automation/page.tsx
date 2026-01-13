// app/[locale]/(platform-admin)/platform-admin/automation/page.tsx
// n8n Automation Hub - Embedded n8n workflow editor

import { prismadb } from "@/lib/prisma";
import { AutomationClient } from "./components/AutomationClient";

export default async function AutomationPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Get n8n configuration if exists
  const n8nConfig = await prismadb.n8nConfig.findFirst({
    where: { isActive: true },
  });

  const n8nBaseUrl = n8nConfig?.baseUrl || process.env.N8N_BASE_URL || "http://localhost:5678";

  return (
    <div className="flex flex-col">
      <div className="flex-1 container mx-auto px-4 py-8">
        <AutomationClient 
          n8nBaseUrl={n8nBaseUrl}
          locale={locale}
          hasConfig={!!n8nConfig}
        />
      </div>
    </div>
  );
}
