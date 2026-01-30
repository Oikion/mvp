"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAppToast } from "@/hooks/use-app-toast";
import {
  Building2,
  Users,
  User,
  ArrowRight,
  Check,
  X,
  Loader2,
  ExternalLink,
  Handshake,
  Clock,
  MapPin,
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { el, enUS } from "date-fns/locale";
import { useParams } from "next/navigation";

interface Deal {
  id: string;
  title: string | null;
  status: string;
  propertyAgentSplit: any;
  clientAgentSplit: any;
  totalCommission: any;
  commissionCurrency: string;
  createdAt: Date;
  closedAt: Date | null;
  isPropertyAgent: boolean;
  isProposer: boolean;
  property: {
    id: string;
    property_name: string;
    property_type: string | null;
    price: number | null;
    address_city: string | null;
    linkedDocuments: { document_file_url: string }[];
  } | null;
  client: {
    id: string;
    client_name: string;
    primary_email: string | null;
    intent: string | null;
  };
  propertyAgent: {
    id: string;
    name: string | null;
    avatar: string | null;
  };
  clientAgent: {
    id: string;
    name: string | null;
    avatar: string | null;
  };
}

interface DealsListProps {
  deals: Deal[];
  translations: any;
}

const statusColors: Record<string, string> = {
  PROPOSED: "bg-warning/15 text-warning dark:text-warning",
  NEGOTIATING: "bg-warning/15 text-warning dark:text-orange-400",
  ACCEPTED: "bg-success/15 text-success dark:text-success",
  IN_PROGRESS: "bg-primary/15 text-primary dark:text-primary",
  COMPLETED: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  CANCELLED: "bg-muted text-muted-foreground",
};

export function DealsList({ deals, translations: t }: DealsListProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const dateLocale = locale === "el" ? el : enUS;
  const { toast } = useAppToast();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("el-GR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  const handleAccept = async (dealId: string) => {
    try {
      setLoadingId(dealId);
      await axios.put(`/api/deals/${dealId}`, { status: "ACCEPTED" });
      toast.success(t.toast.dealAccepted, { description: t.toast.dealAcceptedDesc, isTranslationKey: false });
      router.refresh();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t.toast.error,
        description: error.response?.data || t.toast.acceptError,
      });
    } finally {
      setLoadingId(null);
    }
  };

  const handleCancel = async (dealId: string) => {
    try {
      setLoadingId(dealId);
      await axios.put(`/api/deals/${dealId}`, { status: "CANCELLED" });
      toast.success(t.toast.dealCancelled, { description: t.toast.dealCancelledDesc, isTranslationKey: false });
      router.refresh();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t.toast.error,
        description: error.response?.data || t.toast.cancelError,
      });
    } finally {
      setLoadingId(null);
    }
  };

  if (deals.length === 0) {
    return (
      <div className="py-12 text-center">
        <Handshake className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground">{t.list.empty}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {deals.map((deal) => (
        <Card key={deal.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              {/* Property info */}
              <div className="flex items-start gap-4 flex-1">
                <div className="flex-shrink-0 w-20 h-14 rounded-lg overflow-hidden bg-muted">
                  {deal.property?.linkedDocuments?.[0]?.document_file_url ? (
                    <img
                      src={deal.property.linkedDocuments[0].document_file_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={statusColors[deal.status]}>
                      {t.status[deal.status]}
                    </Badge>
                    {!deal.isProposer &&
                      (deal.status === "PROPOSED" ||
                        deal.status === "NEGOTIATING") && (
                        <Badge variant="outline" className="text-warning border-orange-300">
                          <Clock className="h-3 w-3 mr-1" />
                          {t.list.awaitingResponse}
                        </Badge>
                      )}
                  </div>
                  <h4 className="font-semibold truncate">
                    {deal.title || deal.property?.property_name || "Unknown Property"}
                  </h4>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {deal.property?.property_name || "Unknown Property"}
                    </span>
                    {deal.property?.address_city && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {deal.property.address_city}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {deal.client.client_name}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Link href={`/app/deals/${deal.id}`}>
                  <Button variant="outline" size="sm">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Agents and Split */}
            <div className="mt-4 pt-3 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  {/* Property Agent */}
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={deal.propertyAgent.avatar || ""} />
                      <AvatarFallback className="text-xs bg-primary/15 text-primary dark:text-primary">
                        {deal.propertyAgent.name?.charAt(0) || <User className="h-3 w-3" />}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-sm">
                      <p className="font-medium">{deal.propertyAgent.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {Number(deal.propertyAgentSplit)}%
                      </p>
                    </div>
                  </div>

                  <ArrowRight className="h-4 w-4 text-muted-foreground" />

                  {/* Client Agent */}
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={deal.clientAgent.avatar || ""} />
                      <AvatarFallback className="text-xs bg-success/15 text-success dark:text-success">
                        {deal.clientAgent.name?.charAt(0) || <User className="h-3 w-3" />}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-sm">
                      <p className="font-medium">{deal.clientAgent.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {Number(deal.clientAgentSplit)}%
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {deal.property?.price && (
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">{t.list.propertyValue}</p>
                      <p className="font-semibold text-primary">
                        {formatPrice(deal.property.price)}
                      </p>
                    </div>
                  )}

                  {/* Accept/Cancel buttons for pending deals */}
                  {!deal.isProposer &&
                    (deal.status === "PROPOSED" || deal.status === "NEGOTIATING") && (
                      <div className="flex gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCancel(deal.id)}
                          disabled={loadingId === deal.id}
                        >
                          {loadingId === deal.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <X className="h-4 w-4 mr-1" />
                              {t.detail?.cancel || "Decline"}
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleAccept(deal.id)}
                          disabled={loadingId === deal.id}
                        >
                          {loadingId === deal.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Check className="h-4 w-4 mr-1" />
                              {t.detail?.acceptDeal || "Accept"}
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                </div>
              </div>

              <p className="text-xs text-muted-foreground mt-2">
                {t.list.createdAgo.replace("{time}", formatDistanceToNow(new Date(deal.createdAt), { locale: dateLocale }))}
                {deal.closedAt && ` • ${t.list.closedAgo.replace("{time}", formatDistanceToNow(new Date(deal.closedAt), { locale: dateLocale }))}`}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}



