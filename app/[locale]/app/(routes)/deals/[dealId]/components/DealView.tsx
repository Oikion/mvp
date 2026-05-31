"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useFormatter, useTranslations } from "next-intl";
import { Link, useRouter } from "@/navigation";
import { mutate } from "swr";
import type { DealStage, DealTransactionType, DealPartyRole } from "@prisma/client";
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  Handshake,
  Home,
  Loader2,
  MessageSquare,
  Pencil,
  Trash2,
  UserCircle,
  Users,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
import { LinkedEntitiesPanel } from "@/components/linking/LinkedEntitiesPanel";
import { EntityActivityPanel } from "@/components/activity/EntityActivityPanel";
import { PermissionGate } from "@/lib/permissions/components";
import { useAppToast } from "@/hooks/use-app-toast";
import { getDealKey } from "@/hooks/swr/useDeals";
import { deleteDeal } from "@/actions/deals";
import { DEAL_STATUS } from "@/lib/status-mappings";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import DealStagePipeline from "./DealStagePipeline";
import DealPartiesPanel from "./DealPartiesPanel";
import { EditDealForm } from "./EditDealForm";

// ── Reusable detail field (mirrors ContactView pattern) ──
function DetailField({
  label,
  value,
}: {
  readonly label: string;
  readonly value: React.ReactNode | string | null | undefined;
}) {
  return (
    <div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <div className="mt-0.5 text-sm">
        {value !== null && value !== undefined && value !== "" ? (
          typeof value === "string" ? <span>{value}</span> : value
        ) : (
          <span className="text-muted-foreground/60">—</span>
        )}
      </div>
    </div>
  );
}

// ── Stage badge variant → tailwind classes (semantic, derived from DEAL_STATUS) ──
const STAGE_VARIANT_CLASSES: Record<string, string> = {
  info: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  warning: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  success: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  purple: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  destructive: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  gray: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

// Explicit shape from getDeal() include — keeps DealView decoupled from server-action
// return inference (which is currently `any`).
interface DealAgent {
  readonly id: string;
  readonly name?: string | null;
  readonly email?: string | null;
  readonly avatar?: string | null;
}
interface DealLinkedProperty {
  readonly id: string;
  readonly friendlyId?: string | null;
  readonly title?: string | null;
  readonly property_name?: string | null;
  readonly property_type?: string | null;
  readonly price?: unknown;
  readonly address_city?: string | null;
  readonly bedrooms?: number | null;
  readonly bathrooms?: number | null;
}
interface DealLinkedRequest {
  readonly id: string;
  readonly friendlyId?: string | null;
  readonly name?: string | null;
  readonly requestType?: string | null;
  readonly status?: string | null;
}
interface DealLinkedContact {
  readonly id: string;
  readonly friendlyId?: string | null;
  readonly displayName?: string | null;
  readonly email?: string | null;
  readonly primaryPhone?: string | null;
}
interface DealPartyView {
  readonly id: string;
  readonly role: DealPartyRole;
  readonly notes?: string | null;
  readonly contact: DealLinkedContact & { readonly isCompany?: boolean | null };
}
interface DealStageLogView {
  readonly id: string;
  readonly fromStage: DealStage;
  readonly toStage: DealStage;
  readonly changedBy?: string | null;
  readonly changedAt: string | Date;
  readonly notes?: string | null;
}
interface DealWithRelations {
  readonly id: string;
  readonly friendlyId: string;
  readonly title?: string | null;
  readonly stage: DealStage;
  readonly dealType?: DealTransactionType | null;
  readonly notes?: string | null;
  readonly commissionCurrency?: string | null;
  readonly agreedPrice?: unknown;
  readonly totalCommission?: unknown;
  readonly commissionRate?: unknown;
  readonly depositAmount?: unknown;
  readonly listingAgentSplit?: unknown;
  readonly buyerAgentSplit?: unknown;
  readonly monthlyRentAmount?: unknown;
  readonly securityDeposit?: unknown;
  readonly leaseStartDate?: string | Date | null;
  readonly leaseEndDate?: string | Date | null;
  readonly leaseDurationMonths?: number | null;
  readonly contractDate?: string | Date | null;
  readonly closedAt?: string | Date | null;
  readonly createdAt: string | Date;
  readonly property?: DealLinkedProperty | null;
  readonly request?: DealLinkedRequest | null;
  readonly notaryContact?: DealLinkedContact | null;
  readonly listingAgent?: DealAgent | null;
  readonly buyerAgent?: DealAgent | null;
  readonly dealParties?: readonly DealPartyView[];
  readonly stageLogs?: readonly DealStageLogView[];
}

interface DealViewProps {
  readonly deal: DealWithRelations;
}

export default function DealView({ deal }: DealViewProps) {
  const t = useTranslations("deals");
  const tActivities = useTranslations("activities");
  const format = useFormatter();
  const router = useRouter();
  const { toast } = useAppToast();

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const stageCfg = DEAL_STATUS[deal.stage];
  const StageIcon = stageCfg?.icon;
  const stageClass =
    STAGE_VARIANT_CLASSES[stageCfg?.variant ?? "gray"] ?? STAGE_VARIANT_CLASSES.gray;

  const currency = deal.commissionCurrency || "EUR";
  const formatCurrency = (value: unknown): string | null => {
    if (value === null || value === undefined || value === "") return null;
    const num = typeof value === "number" ? value : Number(value);
    if (Number.isNaN(num)) return null;
    return format.number(num, { style: "currency", currency });
  };
  const formatDate = (value: unknown): string | null => {
    if (!value) return null;
    const d = value instanceof Date ? value : new Date(value as string);
    if (Number.isNaN(d.getTime())) return null;
    return format.dateTime(d, { dateStyle: "medium" });
  };

  const propertyTitle =
    deal.property?.title || deal.property?.property_name || deal.friendlyId;
  const headerTitle = deal.title || propertyTitle || deal.friendlyId;

  const refreshDeal = () => {
    mutate(getDealKey(deal.friendlyId));
    mutate(getDealKey(deal.id));
    router.refresh();
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteDeal(deal.id);
      if (!result.success) {
        toast.error(result.error || t("toast.deleteError"), {
          isTranslationKey: false,
        });
        return;
      }
      toast.success(t("toast.deleted"), {
        description: t("toast.deletedDesc"),
        isTranslationKey: false,
      });
      setDeleteOpen(false);
      router.push("/app/deals");
    } catch (err) {
      console.error("[DEAL_DELETE]", err);
      toast.error(t("toast.deleteError"), { isTranslationKey: false });
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Adapt linked entities to LinkedEntitiesPanel shape ──
  const linkedProperties = deal.property
    ? [
        {
          id: deal.property.id,
          friendlyId: deal.property.friendlyId,
          property_name: deal.property.property_name || deal.property.title,
          property_type: deal.property.property_type,
          address_city: deal.property.address_city,
          price: deal.property.price ? Number(deal.property.price) : undefined,
          bedrooms: deal.property.bedrooms,
          bathrooms: deal.property.bathrooms,
        },
      ]
    : [];

  const linkedRequests = deal.request
    ? [
        {
          id: deal.request.id,
          friendlyId: deal.request.friendlyId,
          title: deal.request.name,
          requestType: deal.request.requestType,
          status: deal.request.status,
        },
      ]
    : [];

  const linkedNotary = deal.notaryContact
    ? [
        {
          id: deal.notaryContact.id,
          friendlyId: deal.notaryContact.friendlyId,
          displayName: deal.notaryContact.displayName,
          email: deal.notaryContact.email,
          primaryPhone: deal.notaryContact.primaryPhone,
        },
      ]
    : [];

  const isSale = deal.dealType === "SALE" || deal.dealType == null;
  const isRent = deal.dealType === "RENT";

  const showFinancial =
    deal.agreedPrice ||
    deal.totalCommission ||
    deal.commissionRate ||
    deal.depositAmount ||
    deal.monthlyRentAmount ||
    deal.securityDeposit ||
    deal.leaseStartDate ||
    deal.leaseEndDate ||
    deal.leaseDurationMonths;

  return (
    <main className="space-y-6">
      {/* ── Header ── */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/app/deals">
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("detail.backToDeals")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10"
              aria-hidden="true"
            >
              <Handshake className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold truncate">{headerTitle}</h1>
              <p className="text-sm text-muted-foreground truncate">
                {deal.friendlyId}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-2 flex-wrap">
            <Badge className={cn(stageClass)} variant="secondary">
              {StageIcon && (
                <StageIcon className="h-3 w-3 mr-1" aria-hidden="true" />
              )}
              {t(`stage.${deal.stage}`)}
            </Badge>
            {deal.dealType && (
              <Badge variant="outline">{t(`dealType.${deal.dealType}`)}</Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PermissionGate action="deal:update">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Pencil className="h-4 w-4" />}
              onClick={() => setEditOpen(true)}
            >
              {t("detail.edit")}
            </Button>
          </PermissionGate>
          <PermissionGate action="deal:delete">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Trash2 className="h-4 w-4" />}
              className="text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setDeleteOpen(true)}
            >
              {t("detail.deleteDialog.delete")}
            </Button>
          </PermissionGate>
        </div>
      </header>

      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0">
          <EditDealForm
            deal={deal}
            onSuccess={() => {
              setEditOpen(false);
              refreshDeal();
            }}
          />
        </SheetContent>
      </Sheet>

      {/* ── Main grid: 2/3 + 1/3 ── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Pipeline */}
          <PermissionGate action="deal:advance_stage">
            <DealStagePipeline
              dealId={deal.id}
              currentStage={deal.stage}
              canAdvance={true}
              stageLogs={deal.stageLogs ?? []}
              onStageChanged={refreshDeal}
            />
          </PermissionGate>

          {/* Parties */}
          <PermissionGate action="deal:manage_parties">
            <DealPartiesPanel
              dealId={deal.id}
              parties={deal.dealParties ?? []}
              canManage={true}
              onPartiesChanged={refreshDeal}
            />
          </PermissionGate>

          {/* Financial */}
          {showFinancial && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="h-4 w-4" aria-hidden="true" />
                  {isRent ? t("detail.rental") : t("detail.financial")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  {isSale && (
                    <>
                      <DetailField
                        label={t("create.agreedPrice")}
                        value={formatCurrency(deal.agreedPrice)}
                      />
                      <DetailField
                        label={t("detail.commission.rate")}
                        value={
                          deal.commissionRate != null
                            ? `${Number(deal.commissionRate)}%`
                            : null
                        }
                      />
                      <DetailField
                        label={t("detail.commission.total")}
                        value={formatCurrency(deal.totalCommission)}
                      />
                      <DetailField
                        label={t("create.depositAmount")}
                        value={formatCurrency(deal.depositAmount)}
                      />
                      <DetailField
                        label={t("detail.commission.listingAgent")}
                        value={
                          deal.listingAgentSplit != null
                            ? `${Number(deal.listingAgentSplit)}%`
                            : null
                        }
                      />
                      <DetailField
                        label={t("detail.commission.buyerAgent")}
                        value={
                          deal.buyerAgentSplit != null
                            ? `${Number(deal.buyerAgentSplit)}%`
                            : null
                        }
                      />
                    </>
                  )}
                  {isRent && (
                    <>
                      <DetailField
                        label={t("create.monthlyRent")}
                        value={formatCurrency(deal.monthlyRentAmount)}
                      />
                      <DetailField
                        label={t("create.securityDeposit")}
                        value={formatCurrency(deal.securityDeposit)}
                      />
                      <DetailField
                        label={t("create.leaseStart")}
                        value={formatDate(deal.leaseStartDate)}
                      />
                      <DetailField
                        label={t("create.leaseEnd")}
                        value={formatDate(deal.leaseEndDate)}
                      />
                      <DetailField
                        label={t("create.leaseDuration")}
                        value={
                          deal.leaseDurationMonths != null
                            ? String(deal.leaseDurationMonths)
                            : null
                        }
                      />
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {deal.notes && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" aria-hidden="true" />
                  {t("detail.notes")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{deal.notes}</p>
              </CardContent>
            </Card>
          )}

        </div>

        {/* Right column — sidebar */}
        <aside className="space-y-6" aria-label={t("detail.overview")}>
          {/* Linked property */}
          {linkedProperties.length > 0 && (
            <LinkedEntitiesPanel
              type="properties"
              entities={linkedProperties}
              showAddButton={false}
            />
          )}

          {/* Linked request */}
          {linkedRequests.length > 0 && (
            <LinkedEntitiesPanel
              type="requests"
              entities={linkedRequests}
              showAddButton={false}
            />
          )}

          {/* Notary contact */}
          {linkedNotary.length > 0 && (
            <LinkedEntitiesPanel
              type="contacts"
              entities={linkedNotary}
              showAddButton={false}
            />
          )}

          {/* Agents */}
          {(deal.listingAgent || deal.buyerAgent) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" aria-hidden="true" />
                  {t("create.listingAgent")} / {t("create.buyerAgent")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {deal.listingAgent && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 overflow-hidden">
                      {deal.listingAgent.avatar ? (
                        <Image
                          src={deal.listingAgent.avatar}
                          alt=""
                          width={36}
                          height={36}
                          className="h-9 w-9 object-cover"
                        />
                      ) : (
                        <UserCircle
                          className="h-5 w-5 text-primary"
                          aria-hidden="true"
                        />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {deal.listingAgent.name || "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("detail.commission.listingAgent")}
                      </p>
                    </div>
                  </div>
                )}
                {deal.buyerAgent && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 overflow-hidden">
                      {deal.buyerAgent.avatar ? (
                        <Image
                          src={deal.buyerAgent.avatar}
                          alt=""
                          width={36}
                          height={36}
                          className="h-9 w-9 object-cover"
                        />
                      ) : (
                        <UserCircle
                          className="h-5 w-5 text-primary"
                          aria-hidden="true"
                        />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {deal.buyerAgent.name || "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("detail.commission.buyerAgent")}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" aria-hidden="true" />
                {t("detail.timeline.title")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <DetailField
                label={t("detail.timeline.created")}
                value={formatDate(deal.createdAt)}
              />
              <DetailField
                label={t("detail.timeline.contractDate")}
                value={formatDate(deal.contractDate)}
              />
              <DetailField
                label={t("detail.timeline.closed")}
                value={formatDate(deal.closedAt)}
              />
            </CardContent>
          </Card>

          {/* Activity Log */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" aria-hidden="true" />
                {tActivities("title")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <EntityActivityPanel parentType="DEAL" parentId={deal.id} />
            </CardContent>
          </Card>
        </aside>
      </div>

      {/* ── Delete confirmation ── */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("detail.deleteDialog.title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("detail.deleteDialog.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {t("detail.deleteDialog.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              {t("detail.deleteDialog.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
