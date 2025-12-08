"use client";

import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, MapPin, Home, BedDouble, Bath, Ruler } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { statuses } from "../properties/table-data/data";
import { usePrefetch } from "@/hooks/swr";

interface PropertyCardProps {
  data: {
    id: string;
    property_name: string;
    property_status?: string;
    price?: number;
    bedrooms?: number;
    bathrooms?: number;
    square_feet?: number;
    address_city?: string;
    assigned_to_user?: { name: string };
    linkedDocuments?: Array<{ document_file_url?: string }>;
  };
}

export function PropertyCard({ data }: PropertyCardProps) {
  const t = useTranslations("mls");
  const { prefetchProperty, prefetchPropertyLinked } = usePrefetch();

  const status = statuses.find((s) => s.value === data.property_status);
  const StatusIcon = status?.icon;
  const imageUrl = data.linkedDocuments?.[0]?.document_file_url;

  // Prefetch property data on hover for instant navigation
  const handleMouseEnter = () => {
    prefetchProperty(data.id);
    prefetchPropertyLinked(data.id);
  };

  return (
    <Card
      className="overflow-hidden hover:shadow-lg transition-shadow flex flex-col h-full"
      onMouseEnter={handleMouseEnter}
    >
      <div className="relative h-48 w-full bg-muted">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={data.property_name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Home className="h-12 w-12" />
          </div>
        )}
        <div className="absolute top-2 right-2">
          {status && (
            <Badge
              variant="secondary"
              className="flex items-center gap-1 bg-background/80 backdrop-blur-sm"
            >
              {StatusIcon && <StatusIcon className="h-3 w-3" />}
              {status.label}
            </Badge>
          )}
        </div>
      </div>

      <CardContent className="p-4 flex-1">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-semibold text-lg line-clamp-1">
              {data.property_name}
            </h3>
            <div className="flex items-center text-sm text-muted-foreground mt-1">
              <MapPin className="h-3 w-3 mr-1" />
              <span className="line-clamp-1">
                {data.address_city || t("MlsPropertiesTable.unassigned")}
              </span>
            </div>
          </div>
          <div className="text-lg font-bold text-primary">
            {data.price ? `€${data.price.toLocaleString()}` : "-"}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t text-xs text-muted-foreground">
          <div className="flex flex-col items-center gap-1">
            <BedDouble className="h-4 w-4" />
            <span>{data.bedrooms || "-"} Beds</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Bath className="h-4 w-4" />
            <span>{data.bathrooms || "-"} Baths</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Ruler className="h-4 w-4" />
            <span>{data.square_feet || "-"} m²</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0 flex justify-between items-center">
        <div className="text-xs text-muted-foreground">
          {data.assigned_to_user?.name || t("MlsPropertiesTable.unassigned")}
        </div>
        <Link href={`/mls/properties/${data.id}`}>
          <Button variant="outline" size="sm">
            <Edit className="h-4 w-4 mr-2" />
            {t("MlsPropertiesTable.details")}
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
