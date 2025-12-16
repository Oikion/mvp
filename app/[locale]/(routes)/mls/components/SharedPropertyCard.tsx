"use client";

import { memo } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, MapPin, Home, BedDouble, Bath, Ruler, Share2, Eye, MessageSquare } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { formatDistanceToNow } from "date-fns";
import { statuses } from "../properties/table-data/data";
import type { SharedPropertyData } from "@/actions/mls/get-shared-properties";

interface SharedPropertyCardProps {
  data: SharedPropertyData;
  /** Optional index for priority loading of images */
  index?: number;
}

/**
 * Memoized shared property card component for optimal rendering.
 */
export const SharedPropertyCard = memo(function SharedPropertyCard({ data, index = 0 }: SharedPropertyCardProps) {
  const t = useTranslations("mls");

  const status = statuses.find((s) => s.value === data.property_status);
  const StatusIcon = status?.icon;
  const imageUrl = data.linkedDocuments?.[0]?.document_file_url;

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow flex flex-col h-full">
      <div className="relative h-48 w-full bg-muted">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={data.property_name || "Property"}
            fill
            className="object-cover"
            // Priority load first 8 images
            priority={index < 8}
            loading={index >= 8 ? "lazy" : undefined}
            placeholder="blur"
            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAUH/8QAIhAAAgEDAwUBAAAAAAAAAAAAAQIDAAQRBQYhEhMxQVFh/8QAFQEBAQAAAAAAAAAAAAAAAAAABQb/xAAaEQACAwEBAAAAAAAAAAAAAAABAgADESEx/9oADAMBAAIRAxEAPwC3bapd2+0tVvLe+uYLuOGR45Y5mV0YKSCpByCDwRSlKoqsLqw5nHLmf//Z"
            sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Home className="h-12 w-12" />
          </div>
        )}
        <div className="absolute top-2 left-2 z-10">
          <Badge
            variant="secondary"
            className="flex items-center gap-1 bg-amber-500/15 text-amber-600 dark:text-amber-400"
          >
            <Share2 className="h-3 w-3" />
            {t("SharedView.shared")}
          </Badge>
        </div>
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
              {data.property_name || t("SharedView.unnamedProperty")}
            </h3>
            <div className="flex items-center text-sm text-muted-foreground mt-1">
              <MapPin className="h-3 w-3 mr-1" />
              <span className="line-clamp-1">
                {[data.address_city, data.address_state].filter(Boolean).join(", ") ||
                  t("MlsPropertiesTable.unassigned")}
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

        {/* Shared by info */}
        <div className="pt-3 border-t mt-4 space-y-2">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={data.sharedBy.avatar || ""} />
              <AvatarFallback className="text-xs bg-muted">
                {data.sharedBy.name?.charAt(0) || "?"}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground">
              {t("SharedView.sharedBy")}{" "}
              <span className="font-medium text-foreground">{data.sharedBy.name}</span>
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {data.permissions === "VIEW_COMMENT" ? (
              <span className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                {t("SharedView.canComment")}
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {t("SharedView.viewOnly")}
              </span>
            )}
            <span>•</span>
            <span>{formatDistanceToNow(new Date(data.sharedAt))} ago</span>
          </div>
          {data.message && (
            <p className="text-xs italic text-muted-foreground bg-muted/50 rounded p-2">
              &ldquo;{data.message}&rdquo;
            </p>
          )}
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0 flex justify-end">
        <Link href={`/mls/properties/${data.id}`}>
          <Button variant="outline" size="sm">
            <Edit className="h-4 w-4 mr-2" />
            {t("SharedView.viewDetails")}
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}, (prevProps, nextProps) => {
  return prevProps.data.shareId === nextProps.data.shareId;
});





