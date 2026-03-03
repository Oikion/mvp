"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowRight, Building2, Home } from "lucide-react";
import { PropertyCard } from "@/app/[locale]/app/(routes)/mls/components/PropertyCard";

interface RecentProperty {
  id: string;
  property_name: string;
  price?: number;
  property_status?: string;
  property_type?: string;
  bedrooms?: number;
  bathrooms?: number;
  square_feet?: number;
  address_city?: string;
  assigned_to_user?: { name: string | null } | null;
  linkedDocuments?: Array<{ document_file_url?: string }>;
  updatedAt?: string;
}

interface RecentPropertiesWidgetProps {
  properties: RecentProperty[];
}

export function RecentPropertiesWidget({ properties }: RecentPropertiesWidgetProps) {
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-lg">{t("recentProperties")}</CardTitle>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/${locale}/app/mls`} className="flex items-center gap-1">
            {tCommon("viewAll")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 p-0 px-6 pb-6">
        {properties.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
            <Home className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm">{t("noRecentProperties")}</p>
          </div>
        ) : (
          <ScrollArea className="h-full max-h-[520px]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pr-3">
              {properties.map((property, index) => (
                <PropertyCard
                  key={property.id}
                  data={{
                    ...property,
                    assigned_to_user: property.assigned_to_user
                      ? { name: property.assigned_to_user.name ?? "" }
                      : undefined,
                  }}
                  index={index}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
