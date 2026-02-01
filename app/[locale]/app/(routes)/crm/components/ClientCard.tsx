"use client";

import { memo, useCallback } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Phone, Eye } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { usePrefetch } from "@/hooks/swr";
import { EntityCardActions } from "@/components/entity";

interface Contact {
  first_name?: string;
  last_name?: string;
}

interface ClientCardProps {
  data: {
    id: string;
    name: string;
    status?: string;
    email?: string;
    primary_phone?: string;
    assigned_to_user?: { name: string };
    contacts?: Contact[];
    updatedAt?: string | Date;
  };
}

/**
 * Memoized client card component for optimal rendering in virtualized lists.
 * Only re-renders when the client data changes.
 */
export const ClientCard = memo(function ClientCard({ data }: ClientCardProps) {
  const t = useTranslations("crm");
  const commonT = useTranslations("common");
  const router = useRouter();
  const { prefetchClient, prefetchClientLinked } = usePrefetch();

  const initials = data.name
    ? data.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "CL";

  // Prefetch client data on hover for instant navigation
  const handleMouseEnter = useCallback(() => {
    prefetchClient(data.id);
    prefetchClientLinked(data.id);
  }, [data.id, prefetchClient, prefetchClientLinked]);

  const handleDelete = useCallback(async () => {
    await axios.delete(`/api/crm/account/${data.id}`);
  }, [data.id]);

  const handleEdit = useCallback(() => {
    router.push(`/app/crm/clients/${data.id}?edit=true`);
  }, [router, data.id]);

  const handleActionComplete = useCallback(() => {
    router.refresh();
  }, [router]);

  return (
    <Card
      className="hover:shadow-lg transition-shadow flex flex-col h-full group"
      onMouseEnter={handleMouseEnter}
    >
      <CardHeader className="flex flex-row items-center gap-4 pb-4">
        <Avatar className="h-12 w-12">
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 overflow-hidden">
          <h3 className="font-semibold text-lg truncate">{data.name}</h3>
          <div className="flex items-center gap-2">
            <Badge
              variant={data.status === "Active" ? "default" : "secondary"}
              className="text-xs"
            >
              {data.status}
            </Badge>
            <span className="text-xs text-muted-foreground truncate">
              {data.assigned_to_user?.name || t("CrmAccountsTable.unassigned")}
            </span>
          </div>
        </div>
        {/* Actions menu */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <EntityCardActions
            entityType="client"
            entityId={data.id}
            entityName={data.name}
            viewHref={`/app/crm/clients/${data.id}`}
            onEdit={handleEdit}
            onDelete={handleDelete}
            showSchedule
            showShare
            onActionComplete={handleActionComplete}
          />
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-3 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Mail className="h-4 w-4" />
          <span className="truncate">{data.email || "-"}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Phone className="h-4 w-4" />
          <span className="truncate">{data.primary_phone || "-"}</span>
        </div>
        {data.contacts && data.contacts.length > 0 && (
          <div className="pt-2 border-t mt-2">
            <p className="text-xs font-medium mb-1 text-muted-foreground">
              {t("CrmAccountsTable.accountContact")}:
            </p>
            <div className="flex flex-wrap gap-1">
              {data.contacts.slice(0, 3).map((c, i) => (
                <Badge key={i} variant="outline" className="text-xs font-normal">
                  {c.first_name} {c.last_name}
                </Badge>
              ))}
              {data.contacts.length > 3 && (
                <Badge variant="outline" className="text-xs font-normal">
                  +{data.contacts.length - 3}
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-0 flex justify-end">
        <Button variant="ghost" size="sm" className="w-full" asChild>
          <Link href={`/app/crm/clients/${data.id}`}>
            <Eye className="h-4 w-4 mr-2" />
            {commonT("view")}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}, (prevProps, nextProps) => {
  // Only re-render if key data changes
  return (
    prevProps.data.id === nextProps.data.id &&
    prevProps.data.updatedAt === nextProps.data.updatedAt &&
    prevProps.data.status === nextProps.data.status &&
    prevProps.data.name === nextProps.data.name
  );
});
