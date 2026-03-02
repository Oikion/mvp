"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Building2, Loader2, Plus, X, ExternalLink } from "lucide-react";
import Image from "next/image";
import { Link } from "@/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  getAgencyShowcaseProperties,
  getAvailablePropertiesForAgencyShowcase,
  addAgencyShowcaseProperty,
  removeAgencyShowcaseProperty,
} from "@/actions/organization/agency-showcase";

interface ShowcaseItem {
  id: string;
  propertyId: string;
  property?: {
    property_name?: string | null;
    address_city?: string | null;
    address_state?: string | null;
    linkedDocuments?: Array<{ document_file_url?: string | null }> | null;
  } | null;
}

interface AvailableProperty {
  id: string;
  property_name?: string | null;
  address_city?: string | null;
  address_state?: string | null;
  linkedDocuments?: Array<{ document_file_url?: string | null }> | null;
}

interface ShowcasePropertyManagerProps {
  profileSlug?: string | null;
}

export function ShowcasePropertyManager({ profileSlug }: ShowcasePropertyManagerProps) {
  const t = useTranslations("profile.showcase");
  const [showcase, setShowcase] = useState<ShowcaseItem[]>([]);
  const [available, setAvailable] = useState<AvailableProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [adding, setAdding] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const [showcaseResult, availableResult] = await Promise.all([
      getAgencyShowcaseProperties(),
      getAvailablePropertiesForAgencyShowcase(),
    ]);

    if (showcaseResult.success) {
      setShowcase((showcaseResult.data ?? []) as ShowcaseItem[]);
    }
    if (availableResult.success) {
      setAvailable((availableResult.data ?? []) as AvailableProperty[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAdd = async (propertyId: string) => {
    setAdding(true);
    const result = await addAgencyShowcaseProperty(propertyId);
    if (result.success) {
      toast.success(t("addSuccess"));
      await loadData();
      setDialogOpen(false);
    } else {
      toast.error(result.error || t("addError"));
    }
    setAdding(false);
  };

  const handleRemove = async (propertyId: string) => {
    const result = await removeAgencyShowcaseProperty(propertyId);
    if (result.success) {
      toast.success(t("removeSuccess"));
      await loadData();
    } else {
      toast.error(result.error || t("removeError"));
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>
            {t("description")}
            <br />
            <span className="mt-2 inline-block text-sm text-primary">
              {t("publicOnlyHint")}{" "}
              <Link href="/app/mls" className="underline">
                {t("manageInMls")}
              </Link>
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showcase.length === 0 ? (
            <div className="rounded-lg border border-dashed p-12 text-center">
              <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-sm text-muted-foreground">{t("empty")}</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {showcase.map((item) => (
                <div key={item.id} className="group relative rounded-lg border bg-card overflow-hidden">
                  <div className="relative aspect-video w-full bg-muted">
                    {item.property?.linkedDocuments?.[0]?.document_file_url ? (
                      <Image
                        src={item.property.linkedDocuments[0].document_file_url}
                        alt={item.property.property_name ?? ""}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, 50vw"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Building2 className="h-12 w-12 text-muted-foreground/30" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold">{item.property?.property_name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {item.property?.address_city && `${item.property.address_city}, `}
                      {item.property?.address_state}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemove(item.propertyId)}
                      >
                        <X className="mr-1 h-3.5 w-3.5" />
                        {t("remove")}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                {t("addProperty")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t("selectProperty")}</DialogTitle>
                <DialogDescription>{t("selectDescription")}</DialogDescription>
              </DialogHeader>
              {available.length === 0 ? (
                <div className="rounded-lg border border-dashed p-12 text-center">
                  <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-4 text-sm text-muted-foreground">{t("noAvailable")}</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {available.map((property) => (
                    <div key={property.id} className="rounded-lg border bg-card overflow-hidden">
                      <div className="relative aspect-video w-full bg-muted">
                        {property.linkedDocuments?.[0]?.document_file_url ? (
                          <Image
                            src={property.linkedDocuments[0].document_file_url}
                            alt={property.property_name ?? ""}
                            fill
                            className="object-cover"
                            sizes="(max-width: 640px) 100vw, 33vw"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <Building2 className="h-8 w-8 text-muted-foreground/30" />
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <h3 className="text-sm font-semibold">{property.property_name}</h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {property.address_city && `${property.address_city}, `}
                          {property.address_state}
                        </p>
                        <Button
                          size="sm"
                          className="mt-2 w-full"
                          onClick={() => handleAdd(property.id)}
                          disabled={adding}
                        >
                          {adding ? (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          ) : (
                            <Plus className="mr-1 h-3 w-3" />
                          )}
                          {t("add")}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {profileSlug && (
        <Card>
          <CardHeader>
            <CardTitle>{t("viewPublic")}</CardTitle>
            <CardDescription>{t("viewPublicDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild>
              <Link href={`/agency/${profileSlug}`} target="_blank">
                <ExternalLink className="mr-2 h-4 w-4" />
                {t("viewPublicProfile")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
