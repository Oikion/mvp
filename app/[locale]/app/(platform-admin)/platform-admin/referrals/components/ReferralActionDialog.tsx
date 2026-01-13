"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, DollarSign, User, Calendar, Percent } from "lucide-react";
import { toast } from "sonner";

import type { AdminReferralData } from "@/actions/referrals/admin-get-all-referrals";
import { adminCreatePayout } from "@/actions/referrals/admin-update-payout";
import {
  adminUpdateReferralStatus,
  adminUpdateCommissionRate,
} from "@/actions/referrals/admin-update-commission";

interface ReferralActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referral: AdminReferralData | null;
  actionType: "view" | "payout" | "status" | "commission";
  locale: string;
}

export function ReferralActionDialog({
  open,
  onOpenChange,
  referral,
  actionType,
  locale,
}: ReferralActionDialogProps) {
  const t = useTranslations("platformAdmin.referrals");
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);

  // Form states
  const [payoutAmount, setPayoutAmount] = React.useState("");
  const [payoutNotes, setPayoutNotes] = React.useState("");
  const [newStatus, setNewStatus] = React.useState<"PENDING" | "CONVERTED" | "CANCELLED">("PENDING");
  const [newCommissionRate, setNewCommissionRate] = React.useState("");

  // Reset form when dialog opens
  React.useEffect(() => {
    if (open && referral) {
      setPayoutAmount("");
      setPayoutNotes("");
      setNewStatus(referral.status);
      setNewCommissionRate(referral.commissionRate.toString());
    }
  }, [open, referral]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const formatDate = (date: Date | string) => {
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(date));
  };

  const handleAddPayout = async () => {
    if (!referral || !payoutAmount) return;

    const amount = parseFloat(payoutAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error(t("errors.invalidAmount"));
      return;
    }

    setIsLoading(true);
    try {
      const result = await adminCreatePayout({
        referralId: referral.id,
        amount,
        notes: payoutNotes || undefined,
      });

      if (result.success) {
        toast.success(t("payoutCreated"));
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(result.error || t("errors.payoutFailed"));
      }
    } catch (error) {
      console.error("Failed to create payout:", error);
      toast.error(t("errors.payoutFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!referral) return;

    setIsLoading(true);
    try {
      const result = await adminUpdateReferralStatus(referral.id, newStatus);

      if (result.success) {
        toast.success(t("statusUpdated"));
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(result.error || t("errors.statusUpdateFailed"));
      }
    } catch (error) {
      console.error("Failed to update status:", error);
      toast.error(t("errors.statusUpdateFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateCommission = async () => {
    if (!referral || !newCommissionRate) return;

    const rate = parseFloat(newCommissionRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      toast.error(t("errors.invalidCommission"));
      return;
    }

    setIsLoading(true);
    try {
      // We need the referral code ID, which we can get from the referral
      // For now, we'll use a workaround - the admin action needs the code ID
      // This would typically require fetching the full referral details
      const { adminGetReferralDetails } = await import(
        "@/actions/referrals/admin-get-all-referrals"
      );
      const details = await adminGetReferralDetails(referral.id);

      if (!details) {
        toast.error(t("errors.referralNotFound"));
        return;
      }

      // Get the referral code ID from the referral
      const { prismadb } = await import("@/lib/prisma");
      const ref = await prismadb.referral.findUnique({
        where: { id: referral.id },
        select: { referralCodeId: true },
      });

      if (!ref) {
        toast.error(t("errors.referralNotFound"));
        return;
      }

      const result = await adminUpdateCommissionRate({
        referralCodeId: ref.referralCodeId,
        commissionRate: rate,
      });

      if (result.success) {
        toast.success(t("commissionUpdated"));
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(result.error || t("errors.commissionUpdateFailed"));
      }
    } catch (error) {
      console.error("Failed to update commission:", error);
      toast.error(t("errors.commissionUpdateFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  if (!referral) return null;

  const getTitle = () => {
    switch (actionType) {
      case "view":
        return t("dialog.viewTitle");
      case "payout":
        return t("dialog.payoutTitle");
      case "status":
        return t("dialog.statusTitle");
      case "commission":
        return t("dialog.commissionTitle");
      default:
        return "";
    }
  };

  const getDescription = () => {
    switch (actionType) {
      case "view":
        return t("dialog.viewDescription");
      case "payout":
        return t("dialog.payoutDescription");
      case "status":
        return t("dialog.statusDescription");
      case "commission":
        return t("dialog.commissionDescription");
      default:
        return "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] h-fit">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>

        {/* View Details */}
        {actionType === "view" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-muted-foreground">{t("dialog.referrer")}</Label>
                <div className="flex items-center gap-2 mt-1">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{referral.referrerName || "-"}</p>
                    <p className="text-sm text-muted-foreground">{referral.referrerEmail}</p>
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">{t("dialog.referredUser")}</Label>
                <div className="flex items-center gap-2 mt-1">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{referral.referredUserName || "-"}</p>
                    <p className="text-sm text-muted-foreground">{referral.referredUserEmail}</p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-muted-foreground">{t("dialog.status")}</Label>
                <div className="mt-1">
                  <Badge
                    variant={
                      referral.status === "CONVERTED"
                        ? "default"
                        : referral.status === "PENDING"
                        ? "secondary"
                        : "destructive"
                    }
                  >
                    {t(`status.${referral.status.toLowerCase()}`)}
                  </Badge>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">{t("dialog.commissionRate")}</Label>
                <div className="flex items-center gap-1 mt-1">
                  <Percent className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{referral.commissionRate}%</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-muted-foreground">{t("dialog.totalEarnings")}</Label>
                <div className="flex items-center gap-1 mt-1">
                  <DollarSign className="h-4 w-4 text-green-500" />
                  <span className="font-medium">{formatCurrency(referral.totalEarnings)}</span>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">{t("dialog.totalPaid")}</Label>
                <div className="flex items-center gap-1 mt-1">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{formatCurrency(referral.totalPaid)}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-muted-foreground">{t("dialog.referralDate")}</Label>
                <div className="flex items-center gap-1 mt-1">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{formatDate(referral.createdAt)}</span>
                </div>
              </div>
              {referral.convertedAt && (
                <div>
                  <Label className="text-muted-foreground">{t("dialog.convertedDate")}</Label>
                  <div className="flex items-center gap-1 mt-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{formatDate(referral.convertedAt)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Add Payout */}
        {actionType === "payout" && (
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                {t("dialog.payoutInfo", { rate: referral.commissionRate })}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">{t("dialog.referredUserIncome")}</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  className="pl-9"
                />
              </div>
              {payoutAmount && !isNaN(parseFloat(payoutAmount)) && (
                <p className="text-sm text-muted-foreground">
                  {t("dialog.commissionAmount")}:{" "}
                  <span className="font-medium text-green-600">
                    {formatCurrency((parseFloat(payoutAmount) * referral.commissionRate) / 100)}
                  </span>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">{t("dialog.notes")}</Label>
              <Textarea
                id="notes"
                placeholder={t("dialog.notesPlaceholder")}
                value={payoutNotes}
                onChange={(e) => setPayoutNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        )}

        {/* Update Status */}
        {actionType === "status" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("dialog.currentStatus")}</Label>
              <Badge
                variant={
                  referral.status === "CONVERTED"
                    ? "default"
                    : referral.status === "PENDING"
                    ? "secondary"
                    : "destructive"
                }
              >
                {t(`status.${referral.status.toLowerCase()}`)}
              </Badge>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">{t("dialog.newStatus")}</Label>
              <Select value={newStatus} onValueChange={(v) => setNewStatus(v as typeof newStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">{t("status.pending")}</SelectItem>
                  <SelectItem value="CONVERTED">{t("status.converted")}</SelectItem>
                  <SelectItem value="CANCELLED">{t("status.cancelled")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Update Commission */}
        {actionType === "commission" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("dialog.currentCommission")}</Label>
              <p className="font-medium">{referral.commissionRate}%</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="commission">{t("dialog.newCommission")}</Label>
              <div className="relative">
                <Input
                  id="commission"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  placeholder="10"
                  value={newCommissionRate}
                  onChange={(e) => setNewCommissionRate(e.target.value)}
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  %
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {t("dialog.commissionNote")}
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            {actionType === "view" ? t("dialog.close") : t("dialog.cancel")}
          </Button>
          {actionType !== "view" && (
            <Button
              onClick={
                actionType === "payout"
                  ? handleAddPayout
                  : actionType === "status"
                  ? handleUpdateStatus
                  : handleUpdateCommission
              }
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {actionType === "payout"
                ? t("dialog.addPayout")
                : actionType === "status"
                ? t("dialog.updateStatus")
                : t("dialog.updateCommission")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
