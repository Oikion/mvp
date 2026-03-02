"use client";

import Image from "next/image";
import { Link } from "@/navigation";
import { Building2 } from "lucide-react";

import type { DiscoverAgencyItem } from "@/actions/network/discover-agencies";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

interface NetworkAgencyCardProps {
  agency: DiscoverAgencyItem;
}

export function NetworkAgencyCard({ agency }: NetworkAgencyCardProps) {
  const t = useTranslations("network");
  const location = [agency.city, agency.region].filter(Boolean).join(", ");

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start gap-3">
          {agency.logo ? (
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border bg-muted">
              <Image
                src={agency.logo}
                alt={agency.name}
                fill
                className="object-contain"
                sizes="48px"
              />
            </div>
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border bg-muted">
              <Building2 className="h-6 w-6 text-muted-foreground" aria-hidden />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <Link
              href={`/agency/${agency.slug}`}
              className="font-medium text-primary hover:underline"
            >
              {agency.name}
            </Link>
            {location && (
              <p className="mt-0.5 text-xs text-muted-foreground">{location}</p>
            )}
            {agency.description && (
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {agency.description}
              </p>
            )}
            <Button variant="outline" size="sm" className="mt-2" asChild>
              <Link href={`/agency/${agency.slug}`} target="_blank">{t("viewProfile")}</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
