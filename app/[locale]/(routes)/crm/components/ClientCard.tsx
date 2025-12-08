"use client";

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Phone, User, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { usePrefetch } from "@/hooks/swr";

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
  };
}

export function ClientCard({ data }: ClientCardProps) {
  const t = useTranslations("crm");
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
  const handleMouseEnter = () => {
    prefetchClient(data.id);
    prefetchClientLinked(data.id);
  };

  return (
    <Card
      className="hover:shadow-lg transition-shadow flex flex-col h-full"
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
              Contacts:
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
        <Link href={`/crm/clients/${data.id}`}>
          <Button variant="ghost" size="sm" className="w-full">
            <ExternalLink className="h-4 w-4 mr-2" />
            View Profile
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
