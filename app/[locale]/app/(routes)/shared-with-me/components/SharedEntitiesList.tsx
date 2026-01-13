"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Building2,
  Users,
  FileText,
  MapPin,
  Mail,
  Phone,
  User,
  ExternalLink,
  Eye,
  MessageSquare,
  Share2,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { el, enUS } from "date-fns/locale";
import { useParams } from "next/navigation";

interface SharedEntity {
  id: string;
  entityType: string;
  entityId: string;
  permissions: string;
  message: string | null;
  createdAt: Date;
  sharedBy: {
    id: string;
    name: string | null;
    email: string;
    avatar: string | null;
  };
  entity: any;
}

interface SharedEntitiesListProps {
  entities: SharedEntity[];
  entityType?: "PROPERTY" | "CLIENT" | "DOCUMENT";
  translations: any;
}

export function SharedEntitiesList({ entities, entityType, translations: t }: SharedEntitiesListProps) {
  const params = useParams();
  const locale = params.locale as string;
  const dateLocale = locale === "el" ? el : enUS;

  if (entities.length === 0) {
    const message = entityType
      ? t.empty[entityType.toLowerCase() + "s"] || t.empty.generic
      : t.empty.generic;

    const icon = !entityType ? (
      <Share2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
    ) : entityType === "PROPERTY" ? (
      <Building2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
    ) : entityType === "CLIENT" ? (
      <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
    ) : (
      <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
    );

    return (
      <div className="py-12 text-center">
        {icon}
        <p className="text-muted-foreground font-medium">{message}</p>
        <p className="text-sm text-muted-foreground mt-1">
          {t.empty.hint}
        </p>
        <Button asChild variant="outline" className="mt-4">
          <Link href={`/${locale}/app/connections`}>
            <UserPlus className="h-4 w-4 mr-2" />
            {t.empty.findConnections}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {entities.map((share) => (
        <SharedEntityCard key={share.id} share={share} translations={t} dateLocale={dateLocale} />
      ))}
    </div>
  );
}

function SharedEntityCard({ share, translations: t, dateLocale }: { share: SharedEntity; translations: any; dateLocale: any }) {
  const { entityType, entity, sharedBy, message, permissions, createdAt } = share;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("el-GR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getEntityLink = () => {
    switch (entityType) {
      case "PROPERTY":
        return `/app/mls/properties/${entity.id}`;
      case "CLIENT":
        return `/app/crm/accounts/${entity.id}`;
      case "DOCUMENT":
        return `/app/documents/${entity.id}`;
      default:
        return "#";
    }
  };

  const getEntityIcon = () => {
    switch (entityType) {
      case "PROPERTY":
        return <Building2 className="h-10 w-10 text-blue-600" />;
      case "CLIENT":
        return <Users className="h-10 w-10 text-green-600" />;
      case "DOCUMENT":
        return <FileText className="h-10 w-10 text-orange-600" />;
      default:
        return <Building2 className="h-10 w-10 text-gray-600" />;
    }
  };

  const renderEntityContent = () => {
    switch (entityType) {
      case "PROPERTY":
        return (
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-24 h-16 rounded-lg overflow-hidden bg-gray-100">
              {entity.linkedDocuments?.[0]?.document_file_url ? (
                <img
                  src={entity.linkedDocuments[0].document_file_url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-gray-400" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold truncate">{entity.property_name}</h4>
              {(entity.address_city || entity.address_state) && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {[entity.address_city, entity.address_state].filter(Boolean).join(", ")}
                </p>
              )}
              <div className="flex items-center gap-3 mt-1">
                {entity.property_type && (
                  <Badge variant="outline" className="text-xs">
                    {entity.property_type}
                  </Badge>
                )}
                {entity.price && (
                  <span className="font-semibold text-blue-600">
                    {formatPrice(entity.price)}
                  </span>
                )}
              </div>
            </div>
          </div>
        );

      case "CLIENT":
        return (
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-green-500/15 text-green-600 dark:text-green-400">
                {entity.client_name?.charAt(0) || <User className="h-5 w-5" />}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold truncate">{entity.client_name}</h4>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                {entity.primary_email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {entity.primary_email}
                  </span>
                )}
                {entity.primary_phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {entity.primary_phone}
                  </span>
                )}
              </div>
              <div className="flex gap-2 mt-1">
                {entity.client_status && (
                  <Badge variant="outline" className="text-xs">
                    {entity.client_status}
                  </Badge>
                )}
                {entity.intent && (
                  <Badge variant="secondary" className="text-xs">
                    {entity.intent}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        );

      case "DOCUMENT":
        return (
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-orange-500/15 flex items-center justify-center">
              <FileText className="h-6 w-6 text-orange-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold truncate">{entity.document_name}</h4>
              {entity.description && (
                <p className="text-sm text-muted-foreground truncate">
                  {entity.description}
                </p>
              )}
              <Badge variant="outline" className="text-xs mt-1">
                {entity.document_file_mimeType?.split("/")[1]?.toUpperCase() || "FILE"}
              </Badge>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <Link href={getEntityLink()} className="block hover:opacity-80 transition-opacity">
              {renderEntityContent()}
            </Link>
          </div>
          <Link
            href={getEntityLink()}
            className="flex-shrink-0 p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </Link>
        </div>

        {/* Message and metadata */}
        <div className="mt-4 pt-3 border-t flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={sharedBy.avatar || ""} />
              <AvatarFallback className="text-xs">
                {sharedBy.name?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <span className="text-muted-foreground">
              {t.card.sharedBy} <span className="font-medium text-foreground">{sharedBy.name}</span>
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            {permissions === "VIEW_COMMENT" ? (
              <span className="flex items-center gap-1 text-xs">
                <MessageSquare className="h-3 w-3" />
                {t.card.canComment}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs">
                <Eye className="h-3 w-3" />
                {t.card.viewOnly}
              </span>
            )}
            <span className="text-xs">
              {formatDistanceToNow(new Date(createdAt), { locale: dateLocale })} {t.card.ago}
            </span>
          </div>
        </div>

        {message && (
          <div className="mt-3 p-2 rounded-lg bg-muted/50 text-sm text-muted-foreground">
            &ldquo;{message}&rdquo;
          </div>
        )}
      </CardContent>
    </Card>
  );
}



