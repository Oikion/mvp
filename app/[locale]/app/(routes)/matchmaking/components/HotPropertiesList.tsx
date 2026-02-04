"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Users, TrendingUp, ArrowRight, MapPin, Euro } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { PropertyWithMatchStats } from "@/lib/matchmaking";

interface Props {
  properties: PropertyWithMatchStats[];
  locale: string;
}

function formatPrice(price: number | null | undefined): string {
  if (!price) return "N/A";
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(price);
}

export function HotPropertiesList({ properties, locale }: Props) {
  const t = useTranslations("matchmaking");

  if (properties.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>{t("hotProperties.noHotProperties")}</p>
        <p className="text-sm mt-2">{t("hotProperties.noHotPropertiesHint")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {properties.map((property, index) => (
        <div
          key={property.id}
          className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
        >
          {/* Rank Badge */}
          <div className={`
            w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
            ${index === 0 ? "bg-warning text-white" : ""}
            ${index === 1 ? "bg-gray-400 text-white" : ""}
            ${index === 2 ? "bg-amber-700 text-white" : ""}
            ${index > 2 ? "bg-muted text-muted-foreground" : ""}
          `}>
            {index + 1}
          </div>

          {/* Property Image */}
          <div className="h-12 w-12 rounded bg-muted flex items-center justify-center overflow-hidden">
            {property.imageUrl ? (
              <img
                src={property.imageUrl}
                alt={property.property_name}
                className="h-full w-full object-cover"
              />
            ) : (
              <Building2 className="h-6 w-6 text-muted-foreground" />
            )}
          </div>

          {/* Property Info */}
          <div className="flex-1 min-w-0">
            <Link 
              href={`/${locale}/app/mls/properties/${property.id}`}
              className="font-medium hover:text-primary truncate block"
            >
              {property.property_name}
            </Link>
            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1 flex-wrap">
              {property.property_type && (
                <Badge variant="outline" className="text-xs">
                  {property.property_type}
                </Badge>
              )}
              {(property.area || property.address_city) && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {property.area || property.address_city}
                </span>
              )}
              {property.price && (
                <span className="flex items-center gap-1 font-medium text-foreground">
                  <Euro className="h-3 w-3" />
                  {formatPrice(property.price)}
                </span>
              )}
            </div>
          </div>

          {/* Match Stats */}
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="flex items-center gap-1 text-lg font-bold text-destructive">
                <Users className="h-4 w-4" />
                {property.matchCount}
              </div>
              <div className="text-xs text-muted-foreground">{t("hotProperties.matches")}</div>
            </div>

            <div className="text-center">
              <div className="flex items-center gap-1 text-lg font-bold text-success">
                <TrendingUp className="h-4 w-4" />
                {property.topMatchScore}%
              </div>
              <div className="text-xs text-muted-foreground">{t("hotProperties.topScore")}</div>
            </div>

            <div className="text-center">
              <div className="text-lg font-bold text-primary">
                {property.averageMatchScore}%
              </div>
              <div className="text-xs text-muted-foreground">{t("hotProperties.avgScore")}</div>
            </div>
          </div>

          {/* Action */}
          <Button variant="outline" size="sm" asChild>
            <Link href={`/${locale}/app/mls/properties/${property.id}`}>
              {t("hotProperties.view")}
              <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      ))}
    </div>
  );
}
