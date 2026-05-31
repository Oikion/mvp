"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAppToast } from "@/hooks/use-app-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Building2,
  Users,
  User,
  MapPin,
  BedDouble,
  Bath,
  Ruler,
  Mail,
  Phone,
  Percent,
  Check,
  X,
  Loader2,
  Handshake,
  ArrowRight,
  PlayCircle,
  CheckCircle2,
  Edit,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { useTranslations } from "next-intl";

interface Deal {
  id: string;
  title: string | null;
  status: string;
  propertyAgentSplit: any;
  clientAgentSplit: any;
  totalCommission: any;
  commissionCurrency: string;
  notes: string | null;
  createdAt: Date;
  closedAt: Date | null;
  isPropertyAgent: boolean;
  isProposer: boolean;
  property: any;
  client: any;
  propertyAgent: any;
  clientAgent: any;
}

interface DealDetailProps {
  deal: Deal;
}

const statusColors: Record<string, string> = {
  PROPOSED: "bg-warning/15 text-warning dark:text-warning",
  NEGOTIATING: "bg-warning/15 text-warning dark:text-orange-400",
  ACCEPTED: "bg-success/15 text-success dark:text-success",
  IN_PROGRESS: "bg-primary/15 text-primary dark:text-primary",
  COMPLETED: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  CANCELLED: "bg-muted text-muted-foreground",
};

export function DealDetail({ deal }: DealDetailProps) {
  const t = useTranslations("deals");
  const [isLoading, setIsLoading] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isNegotiating, setIsNegotiating] = useState(false);
  const [newSplit, setNewSplit] = useState(Number(deal.propertyAgentSplit));
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [finalCommission, setFinalCommission] = useState(
    deal.totalCommission ? String(Number(deal.totalCommission)) : ""
  );

  const router = useRouter();
  const { toast } = useAppToast();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("el-GR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  const handleAccept = async () => {
    try {
      setIsLoading(true);
      await axios.put(`/api/deals/${deal.id}`, { status: "ACCEPTED" });
      toast.success(t("toast.accepted"), { description: t("toast.acceptedDesc"), isTranslationKey: false });
      router.refresh();
    } catch (error: any) {
      toast.error(t("toast.error"), { description: error.response?.data || t("toast.acceptError"), isTranslationKey: false });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    try {
      setIsLoading(true);
      await axios.put(`/api/deals/${deal.id}`, { status: "CANCELLED" });
      toast.success(t("toast.cancelled"), { description: t("toast.cancelledDesc"), isTranslationKey: false });
      setShowCancelDialog(false);
      router.refresh();
    } catch (error: any) {
      toast.error(t("toast.error"), { description: error.response?.data || t("toast.cancelError"), isTranslationKey: false });
    } finally {
      setIsLoading(false);
    }
  };

  const handleProposeSplit = async () => {
    try {
      setIsLoading(true);
      await axios.put(`/api/deals/${deal.id}`, {
        propertyAgentSplit: newSplit,
        clientAgentSplit: 100 - newSplit,
        status: "NEGOTIATING",
      });
      toast.success(t("toast.counterProposalSent"), { description: t("toast.counterProposalSentDesc"), isTranslationKey: false });
      setIsNegotiating(false);
      router.refresh();
    } catch (error: any) {
      toast.error(t("toast.error"), { description: error.response?.data || t("toast.proposeError"), isTranslationKey: false });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartProgress = async () => {
    try {
      setIsLoading(true);
      await axios.put(`/api/deals/${deal.id}`, { status: "IN_PROGRESS" });
      toast.success(t("toast.inProgress"), { description: t("toast.inProgressDesc"), isTranslationKey: false });
      router.refresh();
    } catch (error: any) {
      toast.error(t("toast.error"), { description: error.response?.data || t("toast.updateProgressError"), isTranslationKey: false });
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = async () => {
    try {
      setIsLoading(true);
      await axios.put(`/api/deals/${deal.id}`, {
        status: "COMPLETED",
        totalCommission: finalCommission ? parseFloat(finalCommission) : undefined,
      });
      toast.success(t("toast.completed"), { description: t("toast.completedDesc"), isTranslationKey: false });
      setShowCompleteDialog(false);
      router.refresh();
    } catch (error: any) {
      toast.error(t("toast.error"), { description: error.response?.data || t("toast.completeError"), isTranslationKey: false });
    } finally {
      setIsLoading(false);
    }
  };

  const canAccept =
    !deal.isProposer &&
    (deal.status === "PROPOSED" || deal.status === "NEGOTIATING");
  const canNegotiate =
    deal.status === "PROPOSED" || deal.status === "NEGOTIATING";
  const canStartProgress = deal.status === "ACCEPTED";
  const canComplete =
    deal.status === "ACCEPTED" || deal.status === "IN_PROGRESS";
  const canCancel = !["COMPLETED", "CANCELLED"].includes(deal.status);

  const mySplit = deal.isPropertyAgent
    ? Number(deal.propertyAgentSplit)
    : Number(deal.clientAgentSplit);
  const partnerSplit = deal.isPropertyAgent
    ? Number(deal.clientAgentSplit)
    : Number(deal.propertyAgentSplit);

  return (
    <div className="space-y-6">
      {/* Status and Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Badge className={`${statusColors[deal.status]} text-sm py-1 px-3`}>
            {t(`status.${deal.status}` as `status.${"PROPOSED" | "NEGOTIATING" | "ACCEPTED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"}`)}
          </Badge>
          {!deal.isProposer && canAccept && (
            <Badge variant="outline" className="text-warning border-orange-300">
              {t("actions.awaitingResponse")}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {canAccept && (
            <Button 
              leftIcon={isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              onClick={handleAccept}
              disabled={isLoading}
            >
              {t("actions.accept")}
            </Button>
          )}
          {canStartProgress && (
            <Button
              leftIcon={isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
              onClick={handleStartProgress}
              disabled={isLoading}
            >
              {t("actions.startProgress")}
            </Button>
          )}
          {canComplete && (
            <Button
              leftIcon={<CheckCircle2 className="h-4 w-4" />}
              onClick={() => setShowCompleteDialog(true)}
              disabled={isLoading}
            >
              {t("actions.complete")}
            </Button>
          )}
          {canCancel && (
            <Button
              variant="outline"
              leftIcon={<X className="h-4 w-4" />}
              onClick={() => setShowCancelDialog(true)}
              disabled={isLoading}
            >
              {t("actions.cancel")}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Commission Split Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent className="h-5 w-5 text-primary" />
                {t("commissionSplit.title")}
              </CardTitle>
              <CardDescription>
                {t("commissionSplit.description")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isNegotiating ? (
                <div className="space-y-4">
                  <div className="px-2">
                    <Slider
                      value={[newSplit]}
                      onValueChange={(v: number[]) => setNewSplit(v[0])}
                      max={100}
                      min={0}
                      step={5}
                    />
                  </div>
                  <div className="flex justify-between text-sm">
                    <div className="text-center">
                      <p className="font-semibold text-primary">{newSplit}%</p>
                      <p className="text-xs text-muted-foreground">
                        {t("commissionSplit.propertyAgent")}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-success">
                        {100 - newSplit}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("commissionSplit.clientAgent")}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsNegotiating(false)}
                    >
                      {t("actions.cancel")}
                    </Button>
                    <Button
                      leftIcon={isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}
                      onClick={handleProposeSplit}
                      disabled={isLoading}
                    >
                      {t("commissionSplit.proposeThis")}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-6">
                    {/* Property Agent */}
                    <div className="flex-1 text-center">
                      <Avatar className="h-16 w-16 mx-auto mb-2">
                        <AvatarImage src={deal.propertyAgent?.avatar || ""} />
                        <AvatarFallback className="bg-primary/15 text-primary dark:text-primary text-xl">
                          {deal.propertyAgent?.name?.charAt(0) || (
                            <User className="h-6 w-6" />
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <p className="font-semibold">{deal.propertyAgent?.name ?? t("commissionSplit.deletedUser")}</p>
                      <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {t("commissionSplit.propertyAgent")}
                      </p>
                      <p className="text-3xl font-bold text-primary mt-2">
                        {Number(deal.propertyAgentSplit)}%
                      </p>
                      {deal.totalCommission && (
                        <p className="text-sm text-muted-foreground">
                          {formatPrice(
                            (Number(deal.totalCommission) *
                              Number(deal.propertyAgentSplit)) /
                              100
                          )}
                        </p>
                      )}
                    </div>

                    <ArrowRight className="h-8 w-8 text-muted-foreground" />

                    {/* Client Agent */}
                    <div className="flex-1 text-center">
                      <Avatar className="h-16 w-16 mx-auto mb-2">
                        <AvatarImage src={deal.clientAgent?.avatar || ""} />
                        <AvatarFallback className="bg-success/15 text-success dark:text-success text-xl">
                          {deal.clientAgent?.name?.charAt(0) || (
                            <User className="h-6 w-6" />
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <p className="font-semibold">{deal.clientAgent?.name ?? t("commissionSplit.deletedUser")}</p>
                      <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                        <Users className="h-3 w-3" />
                        {t("commissionSplit.clientAgent")}
                      </p>
                      <p className="text-3xl font-bold text-success mt-2">
                        {Number(deal.clientAgentSplit)}%
                      </p>
                      {deal.totalCommission && (
                        <p className="text-sm text-muted-foreground">
                          {formatPrice(
                            (Number(deal.totalCommission) *
                              Number(deal.clientAgentSplit)) /
                              100
                          )}
                        </p>
                      )}
                    </div>
                  </div>

                  {deal.totalCommission && (
                    <div className="text-center pt-4 border-t">
                      <p className="text-sm text-muted-foreground">
                        {t("commissionSplit.totalCommission")}
                      </p>
                      <p className="text-2xl font-bold">
                        {formatPrice(Number(deal.totalCommission))}
                      </p>
                    </div>
                  )}

                  {canNegotiate && (
                    <Button
                      variant="outline"
                      className="w-full"
                      leftIcon={<Edit className="h-4 w-4" />}
                      onClick={() => setIsNegotiating(true)}
                    >
                      {t("commissionSplit.proposeDifferent")}
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Property Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                {t("property.title")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-4">
                <div className="w-32 h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  {deal.property.linkedDocuments?.[0]?.document_file_url ? (
                    <img
                      src={deal.property.linkedDocuments[0].document_file_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Building2 className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-lg">
                    {deal.property.property_name}
                  </h4>
                  {(deal.property.address_city || deal.property.address_state) && (
                    <p className="text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {[deal.property.address_city, deal.property.address_state]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    {deal.property.bedrooms && (
                      <span className="flex items-center gap-1">
                        <BedDouble className="h-4 w-4" />
                        {deal.property.bedrooms}
                      </span>
                    )}
                    {deal.property.bathrooms && (
                      <span className="flex items-center gap-1">
                        <Bath className="h-4 w-4" />
                        {deal.property.bathrooms}
                      </span>
                    )}
                    {(deal.property.size_net_sqm || deal.property.square_feet) && (
                      <span className="flex items-center gap-1">
                        <Ruler className="h-4 w-4" />
                        {deal.property.size_net_sqm || deal.property.square_feet}{" "}
                        {t("property.sqm")}
                      </span>
                    )}
                  </div>
                  {deal.property.price && (
                    <p className="text-xl font-bold text-primary mt-2">
                      {formatPrice(deal.property.price)}
                    </p>
                  )}
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/app/mls/properties/${deal.property.friendlyId}`}>
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {deal.notes && (
            <Card>
              <CardHeader>
                <CardTitle>{t("notes.title")}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {deal.notes}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Side Info */}
        <div className="space-y-6">
          {/* Client Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                {t("client.title")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="font-semibold">{deal.client.client_name}</h4>
              </div>
              {deal.client.primary_email && (
                <a
                  href={`mailto:${deal.client.primary_email}`}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
                >
                  <Mail className="h-4 w-4" />
                  {deal.client.primary_email}
                </a>
              )}
              {deal.client.primary_phone && (
                <a
                  href={`tel:${deal.client.primary_phone}`}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
                >
                  <Phone className="h-4 w-4" />
                  {deal.client.primary_phone}
                </a>
              )}
              <Button variant="outline" className="w-full mt-2" size="sm" asChild>
                <Link href={`/app/crm/accounts/${deal.client.id}`}>
                  {t("client.view")}
                  <ExternalLink className="h-3 w-3 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>{t("timelineCard.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground">{t("timelineCard.created")}</p>
                <p className="font-medium">
                  {t("timelineCard.ago", { time: formatDistanceToNow(new Date(deal.createdAt)) })}
                </p>
              </div>
              {deal.closedAt && (
                <div>
                  <p className="text-muted-foreground">{t("timelineCard.closed")}</p>
                  <p className="font-medium">
                    {t("timelineCard.ago", { time: formatDistanceToNow(new Date(deal.closedAt)) })}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Cancel Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("cancelDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("cancelDialog.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancelDialog.keep")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 flex items-center gap-2"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("cancelDialog.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Complete Dialog */}
      <AlertDialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("completeDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("completeDialog.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label>{t("completeDialog.finalCommission")}</Label>
            <div className="relative mt-2">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                €
              </span>
              <Input
                type="number"
                value={finalCommission}
                onChange={(e) => setFinalCommission(e.target.value)}
                placeholder={
                  deal.totalCommission
                    ? String(Number(deal.totalCommission))
                    : t("completeDialog.enterAmount")
                }
                className="pl-8"
              />
            </div>
            {finalCommission && (
              <div className="mt-3 p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">{t("completeDialog.splitBreakdown")}</p>
                <div className="flex justify-between mt-2">
                  <span>
                    {deal.propertyAgent?.name ?? t("commissionSplit.deletedUser")} ({Number(deal.propertyAgentSplit)}%)
                  </span>
                  <span className="font-semibold">
                    {formatPrice(
                      (parseFloat(finalCommission) *
                        Number(deal.propertyAgentSplit)) /
                        100
                    )}
                  </span>
                </div>
                <div className="flex justify-between mt-1">
                  <span>
                    {deal.clientAgent?.name ?? t("commissionSplit.deletedUser")} ({Number(deal.clientAgentSplit)}%)
                  </span>
                  <span className="font-semibold">
                    {formatPrice(
                      (parseFloat(finalCommission) *
                        Number(deal.clientAgentSplit)) /
                        100
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("completeDialog.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleComplete}
              className="flex items-center gap-2"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {!isLoading && <Handshake className="h-4 w-4" />}
              {t("completeDialog.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

